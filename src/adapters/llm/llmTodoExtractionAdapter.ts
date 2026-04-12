import { isLlmBlockResultArray } from '../../domain/todo/guards';
import { todoExtractionPromptVersion } from '../../prompts/todo-extraction/manifest';
import { todoExtractionResponseSchema } from './todoExtractionSchema';
import type { TodoExtractionAdapter } from './todoExtractionAdapter';
import type {
  TodoExtractionAdapterInput,
  TodoExtractionResult,
  TodoExtractionTrace,
} from './types';
import {
  buildPromptForBlock,
  mapBlockInterpretationWithResolvedAnchors,
  serializeRawResponse,
} from './todoExtractionShared';
import type { LlmClient } from './llmClient';

export class LlmTodoExtractionAdapter implements TodoExtractionAdapter {
  private client: LlmClient;

  constructor(client: LlmClient) {
    this.client = client;
  }

  async extract(input: TodoExtractionAdapterInput): Promise<TodoExtractionResult> {
    const traces: TodoExtractionTrace[] = [];
    const results = [];

    for (const block of input.focusBlocks) {
      const builtPrompt = buildPromptForBlock(input, block);

      const response = await this.client.complete({
        prompt: builtPrompt,
        responseSchema: todoExtractionResponseSchema,
        ...(typeof input.signal === 'undefined' ? {} : { signal: input.signal }),
      });

      traces.push({
        blockId: block.id,
        promptVersion: todoExtractionPromptVersion,
        modelName: this.client.modelName,
        builtPrompt,
        rawResponse: response.text,
      });

      let parsed: unknown;

      try {
        parsed = JSON.parse(response.text);
      } catch {
        parsed = response.text;
      }

      if (!isLlmBlockResultArray(parsed)) {
        throw new Error(`Invalid extraction payload: ${serializeRawResponse(parsed)}`);
      }

      const result = parsed[0];

      if (typeof result === 'undefined') {
        throw new Error('Missing extraction result for focus block.');
      }

      results.push(mapBlockInterpretationWithResolvedAnchors(block, result));
    }

    return {
      results,
      traces,
    };
  }
}
