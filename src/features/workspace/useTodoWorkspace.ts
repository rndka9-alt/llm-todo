import { useMutation } from '@tanstack/react-query';
import { startTransition, useEffect, useRef, useState } from 'react';
import {
  ConnectionError,
  HttpStatusError,
  InvalidJsonResponseError,
  RequestAbortedError,
  RequestTimeoutError,
} from '../../adapters/http/fetchJsonClient';
import { createTodoExtractionAdapter } from '../../adapters/llm/createTodoExtractionAdapter';
import type { TodoExtractionAdapter } from '../../adapters/llm/todoExtractionAdapter';
import type { TodoExtractionAdapterInput } from '../../adapters/llm/types';
import { indexedDbWorkspaceSnapshotRepository } from '../../adapters/indexedDbWorkspaceSnapshotRepository';
import type {
  BlockInterpretation,
  DirtyRegion,
  NoteBlock,
  ParseStatus,
} from '../../domain/models';
import { diffText } from '../../domain/note/diffText';
import { reconcileBlocks } from '../../domain/note/reconcileBlocks';
import { segmentNote } from '../../domain/note/segmentNote';
import {
  buildAnalysisHighlights,
  getContextBlocks,
  selectDirtyBlockIds,
} from '../../domain/parsing/analysisPlan';
import { projectTodoProjection } from '../../domain/todos/projectTodoProjection';
import { createDebounceQueue } from '../../lib/createDebounceQueue';
import { createRange, rangeLength } from '../../lib/range';
import { findBlockIdsForSelection, findTodoForSelection } from '../editor/selection';
import { createPersistedSnapshot, restoreWorkspaceState } from './workspacePersistence';
import type { WorkspaceSnapshotRepository } from './workspacePersistence';
import { createInitialWorkspaceState, type WorkspaceState } from './workspaceState';

interface UseTodoWorkspaceOptions {
  repository?: WorkspaceSnapshotRepository;
  adapter?: TodoExtractionAdapter;
  onExtractionError?: (message: string) => void;
}

interface ScheduledParseRequest {
  noteTitle: string;
  blocks: NoteBlock[];
  interpretations: BlockInterpretation[];
  dirtyRegion: DirtyRegion;
  focusBlockIds: string[];
}

interface ParseMutationVariables {
  requestId: number;
  payload: ScheduledParseRequest;
  input: TodoExtractionAdapterInput;
}

function mergeInterpretations(
  previous: BlockInterpretation[],
  nextResults: BlockInterpretation[],
  focusBlockIds: string[],
): BlockInterpretation[] {
  const preserved = previous.filter((result) => !focusBlockIds.includes(result.blockId));

  return [...preserved, ...nextResults];
}

function markBlockStatuses(
  blocks: NoteBlock[],
  blockIds: string[],
  status: ParseStatus,
  parsedAt: number | null = null,
): NoteBlock[] {
  return blocks.map((block) => {
    if (!blockIds.includes(block.id)) {
      return block;
    }

    return {
      ...block,
      parseStatus: status,
      lastParsedAt: parsedAt === null ? block.lastParsedAt : parsedAt,
    };
  });
}

function getExtractionErrorMessage(error: unknown): string | null {
  if (error instanceof RequestAbortedError) {
    return null;
  }

  if (error instanceof InvalidJsonResponseError) {
    return '응답이 JSON 형태가 아닙니다';
  }

  if (error instanceof HttpStatusError) {
    return `서버에러: ${error.status}`;
  }

  if (error instanceof ConnectionError) {
    return '서버에 연결할 수 없습니다';
  }

  if (error instanceof RequestTimeoutError) {
    return '요청 시간이 초과되었습니다';
  }

  if (error instanceof Error && error.message.startsWith('Invalid extraction payload:')) {
    return '응답이 JSON 형태가 아닙니다';
  }

  return 'TODO 추출에 실패했습니다';
}

export function useTodoWorkspace(options: UseTodoWorkspaceOptions = {}) {
  const [state, setState] = useState<WorkspaceState>(createInitialWorkspaceState);
  const [isHydrated, setIsHydrated] = useState(false);
  const adapterRef = useRef(options.adapter ?? createTodoExtractionAdapter());
  const repositoryRef = useRef(options.repository ?? indexedDbWorkspaceSnapshotRepository);
  const onExtractionErrorRef = useRef(options.onExtractionError);
  const requestIdRef = useRef(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const parseDebounceRef = useRef(
    createDebounceQueue<ScheduledParseRequest>(() => undefined, 300),
  );
  const saveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const initialParseStartedRef = useRef(false);

  onExtractionErrorRef.current = options.onExtractionError;
  parseDebounceRef.current.setCallback(executeParse);

  const projection = projectTodoProjection(state.blocks, state.interpretations);

  const parseMutation = useMutation({
    mutationFn: async (variables: ParseMutationVariables) =>
      adapterRef.current.extract(variables.input),
    retry: false,
  });

  function clearSaveTimer() {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  function executeParse(payload: ScheduledParseRequest) {
    if (payload.focusBlockIds.length === 0) {
      return;
    }

    activeAbortControllerRef.current?.abort();
    requestIdRef.current += 1;

    const requestId = requestIdRef.current;
    const abortController = new AbortController();
    const parsingBlocks = markBlockStatuses(payload.blocks, payload.focusBlockIds, 'parsing');
    const focusBlocks = parsingBlocks.filter((block) => payload.focusBlockIds.includes(block.id));
    const contextBlocks = getContextBlocks(parsingBlocks, payload.focusBlockIds, 1);

    activeAbortControllerRef.current = abortController;

    startTransition(() => {
      setState((current) => ({
        ...current,
        blocks: parsingBlocks,
        interpretations: payload.interpretations,
        analysisHighlights: buildAnalysisHighlights(parsingBlocks, payload.dirtyRegion),
        parseState: 'parsing',
      }));
    });

    parseMutation.mutate(
      {
        requestId,
        payload,
        input: {
          noteTitle: payload.noteTitle,
          focusBlocks,
          contextBlocks,
          requestedAt: Date.now(),
          signal: abortController.signal,
        },
      },
      {
        onSuccess: (output, variables) => {
          if (requestIdRef.current !== variables.requestId) {
            return;
          }

          if (activeAbortControllerRef.current === abortController) {
            activeAbortControllerRef.current = null;
          }

          const parsedAt = Date.now();
          const parsedBlocks = markBlockStatuses(
            payload.blocks,
            payload.focusBlockIds,
            'updated',
            parsedAt,
          );
          const mergedInterpretations = mergeInterpretations(
            payload.interpretations,
            output.results,
            payload.focusBlockIds,
          );

          startTransition(() => {
            setState((current) => ({
              ...current,
              blocks: parsedBlocks,
              interpretations: mergedInterpretations,
              analysisHighlights: [],
              parseState: 'updated',
              lastUpdatedAt: parsedAt,
            }));
          });
        },
        onError: (error, variables) => {
          if (activeAbortControllerRef.current === abortController) {
            activeAbortControllerRef.current = null;
          }

          const message = getExtractionErrorMessage(error);

          if (message === null || requestIdRef.current !== variables.requestId) {
            return;
          }

          const failedBlocks = markBlockStatuses(payload.blocks, payload.focusBlockIds, 'error');

          startTransition(() => {
            setState((current) => ({
              ...current,
              blocks: failedBlocks,
              interpretations: payload.interpretations,
              analysisHighlights: [],
              parseState: 'error',
            }));
          });

          onExtractionErrorRef.current?.(message);
        },
      },
    );
  }

  function scheduleParse(
    noteTitle: string,
    blocks: NoteBlock[],
    interpretations: BlockInterpretation[],
    dirtyRegion: DirtyRegion,
    focusBlockIds: string[],
  ) {
    if (focusBlockIds.length === 0) {
      return;
    }

    const queuedBlocks = markBlockStatuses(blocks, focusBlockIds, 'queued');
    const queuedHighlights = buildAnalysisHighlights(queuedBlocks, dirtyRegion);

    startTransition(() => {
      setState((current) => ({
        ...current,
        blocks: queuedBlocks,
        interpretations,
        analysisHighlights: queuedHighlights,
        parseState: 'parsing',
      }));
    });

    parseDebounceRef.current.schedule({
      noteTitle,
      blocks: queuedBlocks,
      interpretations,
      dirtyRegion,
      focusBlockIds,
    });
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const snapshot = await repositoryRef.current.load().catch(() => null);

      if (cancelled) {
        return;
      }

      if (snapshot !== null) {
        setState(restoreWorkspaceState(snapshot));
      }

      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || initialParseStartedRef.current) {
      return;
    }

    initialParseStartedRef.current = true;

    if (state.interpretations.length > 0) {
      return;
    }

    const fullDirtyRegion: DirtyRegion = {
      kind: 'replace',
      previousRange: {
        start: 0,
        end: 0,
      },
      nextRange: {
        start: 0,
        end: state.noteText.length,
      },
    };
    const focusBlockIds = state.blocks.map((block) => block.id);

    scheduleParse(state.noteTitle, state.blocks, state.interpretations, fullDirtyRegion, focusBlockIds);
  }, [isHydrated, state.noteText, state.noteTitle, state.blocks, state.interpretations]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    clearSaveTimer();

    saveTimerRef.current = window.setTimeout(() => {
      const snapshot = createPersistedSnapshot(state);

      void repositoryRef.current.save(snapshot).catch(() => undefined);
    }, 240);

    return () => {
      clearSaveTimer();
    };
  }, [isHydrated, state]);

  useEffect(() => {
    return () => {
      parseDebounceRef.current.cancel();
      clearSaveTimer();
      activeAbortControllerRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, []);

  function setNoteTitle(nextTitle: string) {
    setState((current) => ({
      ...current,
      noteTitle: nextTitle,
    }));
  }

  function setNoteText(nextText: string) {
    const now = Date.now();
    const dirtyRegion = diffText(state.noteText, nextText);
    const nextBlocks = reconcileBlocks(state.blocks, segmentNote(nextText), now);
    const dirtyBlockIds = selectDirtyBlockIds(nextBlocks, dirtyRegion, now);

    setState((current) => ({
      ...current,
      noteText: nextText,
      blocks: nextBlocks,
      analysisHighlights: buildAnalysisHighlights(nextBlocks, dirtyRegion),
      parseState: dirtyBlockIds.length > 0 ? 'parsing' : 'updated',
    }));

    scheduleParse(state.noteTitle, nextBlocks, state.interpretations, dirtyRegion, dirtyBlockIds);
  }

  function updateSelection(selectionStart: number, selectionEnd: number) {
    const matched = findTodoForSelection(projection.highlights, selectionStart, selectionEnd);
    const normalizedSelectionRange = createRange(selectionStart, selectionEnd);
    const selectedTextRange =
      rangeLength(normalizedSelectionRange) === 0 ? null : normalizedSelectionRange;
    const selectedBlockIds =
      selectedTextRange === null
        ? []
        : findBlockIdsForSelection(state.blocks, selectionStart, selectionEnd);

    setState((current) => ({
      ...current,
      activeTodoId: matched ? matched.todoId : null,
      selectedBlockIds,
      selectedTextRange,
      focusNonce: matched ? current.focusNonce + 1 : current.focusNonce,
    }));
  }

  function regenerateSelectedBlocks() {
    if (state.selectedBlockIds.length === 0) {
      return;
    }

    const selectedBlocks = state.blocks.filter((block) => state.selectedBlockIds.includes(block.id));

    if (selectedBlocks.length === 0) {
      return;
    }

    const firstBlock = selectedBlocks[0];
    const lastBlock = selectedBlocks[selectedBlocks.length - 1];

    if (typeof firstBlock === 'undefined' || typeof lastBlock === 'undefined') {
      return;
    }

    parseDebounceRef.current.cancel();

    executeParse({
      noteTitle: state.noteTitle,
      blocks: state.blocks,
      interpretations: state.interpretations,
      dirtyRegion: {
        kind: 'none',
        previousRange: {
          start: firstBlock.range.start,
          end: lastBlock.range.end,
        },
        nextRange: {
          start: firstBlock.range.start,
          end: lastBlock.range.end,
        },
      },
      focusBlockIds: selectedBlocks.map((block) => block.id),
    });
  }

  function toggleTodo(todoId: string) {
    setState((current) => {
      const exists = current.checkedTodoIds.includes(todoId);
      const checkedTodoIds = exists
        ? current.checkedTodoIds.filter((id) => id !== todoId)
        : [...current.checkedTodoIds, todoId];

      return {
        ...current,
        checkedTodoIds,
      };
    });
  }

  return {
    noteTitle: state.noteTitle,
    noteText: state.noteText,
    blocks: state.blocks,
    parseState: state.parseState,
    activeTodoId: state.activeTodoId,
    selectedBlockIds: state.selectedBlockIds,
    selectedTextRange: state.selectedTextRange,
    focusNonce: state.focusNonce,
    checkedTodoIds: state.checkedTodoIds,
    lastUpdatedAt: state.lastUpdatedAt,
    analysisHighlights: state.analysisHighlights,
    todos: projection.todos,
    displayHighlights: projection.highlights,
    setNoteTitle,
    setNoteText,
    updateSelection,
    regenerateSelectedBlocks,
    toggleTodo,
  };
}
