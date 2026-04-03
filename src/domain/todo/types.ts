export type LlmTodoPriority = 'low' | 'medium' | 'high';
export type LlmTodoEffort = 'low' | 'medium' | 'high';

export interface LlmTodoMetadata {
  priority: LlmTodoPriority | null;
  dueAt: string | null;
  tags: string[];
  effort: LlmTodoEffort | null;
  ambiguities: string[];
}

export interface LlmTodoItem {
  title: string;
  sourceQuotes: string[];
  depth: number;
  metadata: LlmTodoMetadata;
}

export interface LlmBlockResult {
  blockId: string;
  hasActionableTodo: boolean;
  todos: LlmTodoItem[];
}
