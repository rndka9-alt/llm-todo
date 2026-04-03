import type {
  AnalysisHighlight,
  BlockInterpretation,
  NoteBlock,
  TextRange,
} from '../../domain/models';
import { reconcileBlocks } from '../../domain/note/reconcileBlocks';
import { segmentNote } from '../../domain/note/segmentNote';
import { sampleNoteText, sampleNoteTitle } from '../../data/sampleNote';

export type WorkspaceParseState = 'idle' | 'parsing' | 'updated' | 'error';

export interface WorkspaceState {
  noteTitle: string;
  noteText: string;
  blocks: NoteBlock[];
  interpretations: BlockInterpretation[];
  analysisHighlights: AnalysisHighlight[];
  parseState: WorkspaceParseState;
  activeTodoId: string | null;
  selectedBlockIds: string[];
  selectedTextRange: TextRange | null;
  focusNonce: number;
  checkedTodoIds: string[];
  lastUpdatedAt: number | null;
}

export function createInitialWorkspaceState(now: number = Date.now()): WorkspaceState {
  const blocks = reconcileBlocks([], segmentNote(sampleNoteText), now);

  return {
    noteTitle: sampleNoteTitle,
    noteText: sampleNoteText,
    blocks,
    interpretations: [],
    analysisHighlights: [],
    parseState: 'idle',
    activeTodoId: null,
    selectedBlockIds: [],
    selectedTextRange: null,
    focusNonce: 0,
    checkedTodoIds: [],
    lastUpdatedAt: null,
  };
}
