import { startTransition, useEffect, useRef, useState } from 'react';
import { MockTodoExtractionAdapter } from '../../adapters/mockTodoExtractionAdapter';
import type {
  AnalysisHighlight,
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
import { sampleNoteText, sampleNoteTitle } from '../../data/sampleNote';
import { findTodoForSelection } from '../editor/selection';

interface WorkspaceState {
  noteTitle: string;
  noteText: string;
  blocks: NoteBlock[];
  interpretations: BlockInterpretation[];
  analysisHighlights: AnalysisHighlight[];
  parseState: 'idle' | 'parsing' | 'updated';
  activeTodoId: string | null;
  focusNonce: number;
  checkedTodoIds: string[];
  lastUpdatedAt: number | null;
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

function createInitialState(): WorkspaceState {
  const now = Date.now();
  const blocks = reconcileBlocks([], segmentNote(sampleNoteText), now);

  return {
    noteTitle: sampleNoteTitle,
    noteText: sampleNoteText,
    blocks,
    interpretations: [],
    analysisHighlights: [],
    parseState: 'idle',
    activeTodoId: null,
    focusNonce: 0,
    checkedTodoIds: [],
    lastUpdatedAt: null,
  };
}

export function useTodoWorkspace() {
  const [state, setState] = useState<WorkspaceState>(createInitialState);
  const adapterRef = useRef(new MockTodoExtractionAdapter());
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const projection = projectTodoProjection(state.blocks, state.interpretations);

  function clearPendingTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleParse(
    noteTitle: string,
    blocks: NoteBlock[],
    interpretations: BlockInterpretation[],
    dirtyRegion: DirtyRegion,
    focusBlockIds: string[],
  ) {
    clearPendingTimer();

    if (focusBlockIds.length === 0) {
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
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

    timerRef.current = window.setTimeout(() => {
      const focusBlocks = queuedBlocks.filter((block) => focusBlockIds.includes(block.id));
      const contextBlocks = getContextBlocks(queuedBlocks, focusBlockIds, 1);

      startTransition(() => {
        const parsingBlocks = markBlockStatuses(queuedBlocks, focusBlockIds, 'parsing');

        setState((current) => ({
          ...current,
          blocks: parsingBlocks,
          interpretations,
          analysisHighlights: buildAnalysisHighlights(parsingBlocks, dirtyRegion),
          parseState: 'parsing',
        }));
      });

      void (async () => {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 220);
        });

        const output = await adapterRef.current.interpret({
          noteTitle,
          focusBlocks,
          contextBlocks,
          requestedAt: Date.now(),
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        const parsedAt = Date.now();
        const parsedBlocks = markBlockStatuses(queuedBlocks, focusBlockIds, 'updated', parsedAt);
        const mergedInterpretations = mergeInterpretations(
          interpretations,
          output.results,
          focusBlockIds,
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
      })();
    }, 180);
  }

  useEffect(() => {
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

    return () => {
      clearPendingTimer();
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

    setState((current) => ({
      ...current,
      activeTodoId: matched ? matched.todoId : null,
      focusNonce: matched ? current.focusNonce + 1 : current.focusNonce,
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
    focusNonce: state.focusNonce,
    checkedTodoIds: state.checkedTodoIds,
    lastUpdatedAt: state.lastUpdatedAt,
    analysisHighlights: state.analysisHighlights,
    todos: projection.todos,
    displayHighlights: projection.highlights,
    setNoteTitle,
    setNoteText,
    updateSelection,
    toggleTodo,
  };
}
