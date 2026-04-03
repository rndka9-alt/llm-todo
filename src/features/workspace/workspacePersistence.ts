import type {
  BlockInterpretation,
  ExtractedTodoDraft,
  NoteBlock,
  ParseStatus,
  Priority,
  Effort,
  TodoAnchorReference,
  TodoSourceAnchor,
} from '../../domain/models';
import { reconcileBlocks } from '../../domain/note/reconcileBlocks';
import { segmentNote } from '../../domain/note/segmentNote';
import { resolveSourceAnchors } from '../../domain/todos/mapAnchorToRange';
import type { WorkspaceState } from './workspaceState';

export interface PersistedWorkspaceSnapshot {
  version: 1;
  noteTitle: string;
  noteText: string;
  blocks: NoteBlock[];
  interpretations: BlockInterpretation[];
  checkedTodoIds: string[];
  lastUpdatedAt: number | null;
  savedAt: number;
}

export interface WorkspaceSnapshotRepository {
  load(): Promise<PersistedWorkspaceSnapshot | null>;
  save(snapshot: PersistedWorkspaceSnapshot): Promise<void>;
}

function normalizeParseStatus(status: ParseStatus, lastParsedAt: number | null): ParseStatus {
  if (status === 'queued' || status === 'parsing' || status === 'error') {
    return lastParsedAt === null ? 'idle' : 'updated';
  }

  return status;
}

function normalizeBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return blocks.map((block) => ({
    ...block,
    parseStatus: normalizeParseStatus(block.parseStatus, block.lastParsedAt),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isEffort(value: unknown): value is Effort {
  return value === 'low' || value === 'medium' || value === 'high';
}

function normalizeSourceAnchors(value: unknown, blockText: string): TodoSourceAnchor[] {
  if (Array.isArray(value)) {
    const anchorReferences: TodoAnchorReference[] = value.flatMap((anchor) => {
      if (!isRecord(anchor) || typeof anchor.quote !== 'string') {
        return [];
      }

      const occurrence = typeof anchor.occurrence === 'number' ? anchor.occurrence : 0;

      return [
        {
          quote: anchor.quote,
          occurrence,
        },
      ];
    });

    return resolveSourceAnchors(blockText, anchorReferences);
  }

  if (isRecord(value) && typeof value.quote === 'string') {
    return resolveSourceAnchors(blockText, [
      {
        quote: value.quote,
        occurrence: typeof value.occurrence === 'number' ? value.occurrence : 0,
      },
    ]);
  }

  return [];
}

function readLegacySourceAnchor(value: unknown): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value.sourceAnchor;
}

function normalizeInterpretations(
  interpretations: BlockInterpretation[],
  blocks: NoteBlock[],
): BlockInterpretation[] {
  const blockTextMap = new Map(blocks.map((block) => [block.id, block.text]));

  return interpretations.map((interpretation) => ({
    blockId: interpretation.blockId,
    hasActionableTodo: interpretation.hasActionableTodo ?? interpretation.todos.length > 0,
    todos: interpretation.todos.map((todo) => {
      const blockText = blockTextMap.get(interpretation.blockId) ?? '';
      const normalizedTodo: ExtractedTodoDraft = {
        localId: todo.localId,
        title: todo.title,
        sourceAnchors: normalizeSourceAnchors(
          todo.sourceAnchors ?? readLegacySourceAnchor(todo),
          blockText,
        ),
        tags: todo.tags ?? [],
        ambiguities: todo.ambiguities ?? [],
      };

      if (typeof todo.depth === 'number') {
        normalizedTodo.depth = todo.depth;
      }

      if (isPriority(todo.priority)) {
        normalizedTodo.priority = todo.priority;
      }

      if (typeof todo.dueDate === 'string') {
        normalizedTodo.dueDate = todo.dueDate;
      }

      if (isEffort(todo.effort)) {
        normalizedTodo.effort = todo.effort;
      }

      return normalizedTodo;
    }),
  }));
}

export function createPersistedSnapshot(
  state: WorkspaceState,
  savedAt: number = Date.now(),
): PersistedWorkspaceSnapshot {
  const isParsing = state.parseState === 'parsing';
  const interpretations = isParsing ? [] : state.interpretations;

  return {
    version: 1,
    noteTitle: state.noteTitle,
    noteText: state.noteText,
    blocks: normalizeBlocks(state.blocks),
    interpretations: normalizeInterpretations(interpretations, state.blocks),
    checkedTodoIds: state.checkedTodoIds,
    lastUpdatedAt: state.lastUpdatedAt,
    savedAt,
  };
}

function rebuildBlocksIfNeeded(noteText: string, snapshotBlocks: NoteBlock[], now: number): NoteBlock[] {
  const nextSegments = segmentNote(noteText);

  if (snapshotBlocks.length === nextSegments.length && snapshotBlocks.length > 0) {
    const normalizedBlocks = normalizeBlocks(snapshotBlocks);
    const sameText = normalizedBlocks.every((block, index) => {
      const segment = nextSegments[index];

      if (typeof segment === 'undefined') {
        return false;
      }

      return block.text === segment.text;
    });

    if (sameText) {
      return normalizedBlocks.map((block, index) => {
        const segment = nextSegments[index];

        if (typeof segment === 'undefined') {
          return block;
        }

        return {
          ...block,
          range: segment.range,
        };
      });
    }
  }

  return reconcileBlocks(snapshotBlocks, nextSegments, now);
}

export function restoreWorkspaceState(
  snapshot: PersistedWorkspaceSnapshot,
  now: number = Date.now(),
): WorkspaceState {
  const blocks = rebuildBlocksIfNeeded(snapshot.noteText, snapshot.blocks, now);
  const hasInterpretations = snapshot.interpretations.length > 0;

  return {
    noteTitle: snapshot.noteTitle,
    noteText: snapshot.noteText,
    blocks,
    interpretations: normalizeInterpretations(snapshot.interpretations, blocks),
    analysisHighlights: [],
    parseState: hasInterpretations ? 'updated' : 'idle',
    activeTodoId: null,
    selectedBlockIds: [],
    selectedTextRange: null,
    focusNonce: 0,
    checkedTodoIds: snapshot.checkedTodoIds,
    lastUpdatedAt: snapshot.lastUpdatedAt,
  };
}
