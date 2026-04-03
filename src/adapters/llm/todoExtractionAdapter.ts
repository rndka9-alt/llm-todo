import type { TodoExtractionAdapterInput, TodoExtractionResult } from './types';

export interface TodoExtractionAdapter {
  extract(input: TodoExtractionAdapterInput): Promise<TodoExtractionResult>;
}
