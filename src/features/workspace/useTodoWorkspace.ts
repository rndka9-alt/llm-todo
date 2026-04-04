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
import { indexedDbWorkspaceSnapshotRepository } from '../../adapters/indexedDbWorkspaceSnapshotRepository';
import type {
  BlockInterpretation,
  DirtyRegion,
  NoteBlock,
  ParseStatus,
  TextRange,
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
  const parsingBlockIdsRef = useRef<string[]>([]);
  const parseDebounceRef = useRef(
    createDebounceQueue<ScheduledParseRequest>(() => undefined, 1000),
  );
  const saveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const initialParseStartedRef = useRef(false);

  onExtractionErrorRef.current = options.onExtractionError;
  parseDebounceRef.current.setCallback(executeParse);

  const projection = projectTodoProjection(state.blocks, state.interpretations);

  function clearSaveTimer() {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function executeParse(payload: ScheduledParseRequest) {
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
    const requestedAt = Date.now();

    activeAbortControllerRef.current = abortController;
    parsingBlockIdsRef.current = payload.focusBlockIds;

    startTransition(() => {
      setState((current) => ({
        ...current,
        blocks: parsingBlocks,
        interpretations: payload.interpretations,
        analysisHighlights: buildAnalysisHighlights(parsingBlocks, payload.dirtyRegion),
        parseState: 'parsing',
      }));
    });

    for (let i = 0; i < focusBlocks.length; i++) {
      const block = focusBlocks[i]!;

      if (abortController.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      try {
        const output = await adapterRef.current.extract({
          noteTitle: payload.noteTitle,
          focusBlocks: [block],
          contextBlocks,
          requestedAt,
          signal: abortController.signal,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        const parsedAt = Date.now();

        startTransition(() => {
          setState((current) => ({
            ...current,
            blocks: markBlockStatuses(current.blocks, [block.id], 'updated', parsedAt),
            interpretations: mergeInterpretations(current.interpretations, output.results, [block.id]),
            analysisHighlights: current.analysisHighlights.filter((h) => h.blockId !== block.id),
            lastUpdatedAt: parsedAt,
          }));
        });
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const message = getExtractionErrorMessage(error);

        if (message === null) {
          return;
        }

        const remainingIds = focusBlocks.slice(i).map((b) => b.id);

        startTransition(() => {
          setState((current) => ({
            ...current,
            blocks: markBlockStatuses(current.blocks, remainingIds, 'error'),
            analysisHighlights: [],
            parseState: 'error',
          }));
        });

        onExtractionErrorRef.current?.(message);
        return;
      }
    }

    if (requestIdRef.current === requestId) {
      if (activeAbortControllerRef.current === abortController) {
        activeAbortControllerRef.current = null;
        parsingBlockIdsRef.current = [];
      }

      startTransition(() => {
        setState((current) => ({
          ...current,
          analysisHighlights: [],
          parseState: 'updated',
        }));
      });
    }
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

    const hasOverlap = parsingBlockIdsRef.current.some((id) => focusBlockIds.includes(id));

    if (hasOverlap && activeAbortControllerRef.current !== null) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
      parsingBlockIdsRef.current = [];
      requestIdRef.current += 1;
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
      parsingBlockIdsRef.current = [];
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
    const nextBlockIds = new Set(nextBlocks.map((block) => block.id));
    const nextInterpretations = state.interpretations.filter((it) => nextBlockIds.has(it.blockId));

    setState((current) => ({
      ...current,
      noteText: nextText,
      blocks: nextBlocks,
      interpretations: nextInterpretations,
      parseState: dirtyBlockIds.length > 0 ? 'parsing' : current.parseState,
    }));

    scheduleParse(state.noteTitle, nextBlocks, nextInterpretations, dirtyRegion, dirtyBlockIds);
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
        kind: 'replace',
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

  function removeSelectedBlockInterpretations() {
    if (state.selectedBlockIds.length === 0) {
      return;
    }

    parseDebounceRef.current.cancel();

    setState((current) => ({
      ...current,
      interpretations: current.interpretations.filter(
        (it) => !current.selectedBlockIds.includes(it.blockId),
      ),
      blocks: markBlockStatuses(current.blocks, current.selectedBlockIds, 'idle'),
      lastUpdatedAt: Date.now(),
    }));
  }

  function navigateToTodoSource(range: TextRange) {
    setState((current) => ({
      ...current,
      editorFocusRange: range,
      editorFocusNonce: current.editorFocusNonce + 1,
    }));
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
    editorFocusRange: state.editorFocusRange,
    editorFocusNonce: state.editorFocusNonce,
    checkedTodoIds: state.checkedTodoIds,
    lastUpdatedAt: state.lastUpdatedAt,
    analysisHighlights: state.analysisHighlights,
    todos: projection.todos,
    displayHighlights: projection.highlights,
    setNoteTitle,
    setNoteText,
    updateSelection,
    regenerateSelectedBlocks,
    removeSelectedBlockInterpretations,
    navigateToTodoSource,
    toggleTodo,
  };
}
