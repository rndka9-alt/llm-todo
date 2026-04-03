import type {
  BlockInterpretation,
  NoteBlock,
  ParseStatus,
} from '../../domain/models';
import { reconcileBlocks } from '../../domain/note/reconcileBlocks';
import { segmentNote } from '../../domain/note/segmentNote';
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
    interpretations,
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
    interpretations: snapshot.interpretations,
    analysisHighlights: [],
    parseState: hasInterpretations ? 'updated' : 'idle',
    activeTodoId: null,
    focusNonce: 0,
    checkedTodoIds: snapshot.checkedTodoIds,
    lastUpdatedAt: snapshot.lastUpdatedAt,
  };
}
