import type { BlockInterpretation, NoteBlock } from '../../domain/models';
import { todoExtractionPromptVersion } from '../../prompts/todo-extraction/manifest';

export type PromptVersion = typeof todoExtractionPromptVersion;

export interface TodoExtractionAdapterInput {
  noteTitle: string;
  focusBlocks: NoteBlock[];
  contextBlocks: NoteBlock[];
  requestedAt: number;
}

export interface TodoExtractionTrace {
  blockId: string;
  promptVersion: PromptVersion;
  modelName: string;
  builtPrompt: string;
  rawResponse: string;
}

export interface TodoExtractionResult {
  results: BlockInterpretation[];
  traces: TodoExtractionTrace[];
}
