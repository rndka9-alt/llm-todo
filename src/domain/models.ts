export type ParseStatus = 'idle' | 'queued' | 'parsing' | 'updated' | 'error';

export type Priority = 'low' | 'medium' | 'high';
export type Effort = 'low' | 'medium' | 'high';

export interface TextRange {
  start: number;
  end: number;
}

export interface NoteBlock {
  id: string;
  text: string;
  range: TextRange;
  createdAt: number;
  updatedAt: number;
  lastParsedAt: number | null;
  parseStatus: ParseStatus;
}

export interface DirtyRegion {
  kind: 'none' | 'insert' | 'delete' | 'replace';
  previousRange: TextRange;
  nextRange: TextRange;
}

export interface TodoAnchorReference {
  quote: string;
  occurrence: number;
}

export interface TodoSourceAnchor extends TodoAnchorReference {
  range: TextRange;
}

export interface ExtractedTodoDraft {
  localId: string;
  title: string;
  depth?: number;
  priority?: Priority;
  dueDate?: string;
  tags?: string[];
  effort?: Effort;
  ambiguities?: string[];
  sourceAnchors: TodoSourceAnchor[];
}

export interface BlockInterpretation {
  blockId: string;
  hasActionableTodo: boolean;
  todos: ExtractedTodoDraft[];
}

export interface TodoProjectionItem {
  id: string;
  blockId: string;
  title: string;
  depth: number;
  priority?: Priority;
  dueDate?: string;
  tags: string[];
  sourceAnchors: TodoSourceAnchor[];
  sourceQuotes: string[];
  sourceQuote: string;
  displayRange: TextRange;
  displayRanges: TextRange[];
  colorToken: string;
  accentToken: string;
  orderKey: number;
}

export interface DisplayHighlight {
  id: string;
  todoId: string;
  blockId: string;
  range: TextRange;
  colorToken: string;
  accentToken: string;
}

export interface AnalysisHighlight {
  id: string;
  blockId: string;
  range: TextRange;
  mode: 'new' | 'updated';
}
