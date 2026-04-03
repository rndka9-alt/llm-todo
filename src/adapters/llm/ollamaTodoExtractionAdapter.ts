import { postJson } from '../http/fetchJsonClient';
import type { JsonRequestOptions } from '../http/fetchJsonClient';
import { isLlmBlockResultArray } from '../../domain/todo/guards';
import { todoExtractionPromptVersion } from '../../prompts/todo-extraction/manifest';
import type { LlmBlockResult } from '../../domain/todo/types';
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

interface OllamaTodoExtractionAdapterOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

function buildRequestUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/chat`;
}

function readMessageContent(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return '';
  }

  const message = 'message' in value ? value.message : undefined;

  if (typeof message !== 'object' || message === null) {
    return '';
  }

  const content = 'content' in message ? message.content : undefined;

  if (typeof content !== 'string') {
    return '';
  }

  return content;
}

export class OllamaTodoExtractionAdapter implements TodoExtractionAdapter {
  options: OllamaTodoExtractionAdapterOptions;

  constructor(options: OllamaTodoExtractionAdapterOptions) {
    this.options = options;
  }

  async extract(input: TodoExtractionAdapterInput): Promise<TodoExtractionResult> {
    const traces: TodoExtractionTrace[] = [];
    const results = [];

    for (const block of input.focusBlocks) {
      const builtPrompt = buildPromptForBlock(input, block);
      const requestOptions: JsonRequestOptions = {
        url: buildRequestUrl(this.options.baseUrl),
        timeoutMs: this.options.timeoutMs,
        body: {
          model: this.options.model,
          stream: false,
          format: todoExtractionResponseSchema,
          messages: [
            {
              role: 'user',
              content: builtPrompt,
            },
          ],
          options: {
            temperature: 0,
          },
        },
      };

      if (typeof input.signal !== 'undefined') {
        requestOptions.signal = input.signal;
      }

      const rawEnvelope = await postJson(requestOptions);
      const rawResponse = readMessageContent(rawEnvelope);

      traces.push({
        blockId: block.id,
        promptVersion: todoExtractionPromptVersion,
        modelName: this.options.model,
        builtPrompt,
        rawResponse,
      });

      let parsed: unknown;

      try {
        parsed = JSON.parse(rawResponse);
      } catch {
        parsed = rawEnvelope;
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
