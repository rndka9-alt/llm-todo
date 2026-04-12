import { postJson } from '../../http/fetchJsonClient';
import type { LlmClient, LlmCompletionRequest, LlmCompletionResponse } from '../llmClient';

interface OllamaLlmClientOptions {
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

export class OllamaLlmClient implements LlmClient {
  readonly modelName: string;
  private options: OllamaLlmClientOptions;

  constructor(options: OllamaLlmClientOptions) {
    this.options = options;
    this.modelName = options.model;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const rawEnvelope = await postJson({
      url: buildRequestUrl(this.options.baseUrl),
      timeoutMs: this.options.timeoutMs,
      ...(typeof request.signal === 'undefined' ? {} : { signal: request.signal }),
      body: {
        model: this.options.model,
        stream: false,
        format: request.responseSchema,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        options: {
          temperature: 0,
        },
      },
    });

    return { text: readMessageContent(rawEnvelope) };
  }
}
