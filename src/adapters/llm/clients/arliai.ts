import { postJson } from '../../http/fetchJsonClient';
import type { LlmClient, LlmCompletionRequest, LlmCompletionResponse } from '../llmClient';

interface ArliAiLlmClientOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

function buildRequestUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

function readMessageText(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    throw new Error('ArliAI response was not an object.');
  }

  const choices = 'choices' in value ? value.choices : undefined;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('ArliAI response did not include choices.');
  }

  const firstChoice = choices[0];

  if (typeof firstChoice !== 'object' || firstChoice === null) {
    throw new Error('ArliAI response choice was invalid.');
  }

  const message = 'message' in firstChoice ? firstChoice.message : undefined;

  if (typeof message !== 'object' || message === null) {
    throw new Error('ArliAI response choice did not include a message.');
  }

  const content = 'content' in message ? message.content : undefined;

  if (typeof content !== 'string') {
    throw new Error('ArliAI response message content was not text.');
  }

  return content;
}

export class ArliAiLlmClient implements LlmClient {
  readonly modelName: string;
  private options: ArliAiLlmClientOptions;

  constructor(options: ArliAiLlmClientOptions) {
    this.options = options;
    this.modelName = options.model;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const rawEnvelope = await postJson({
      url: buildRequestUrl(this.options.baseUrl),
      timeoutMs: this.options.timeoutMs,
      ...(typeof request.signal === 'undefined' ? {} : { signal: request.signal }),
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: {
        model: this.options.model,
        stream: false,
        temperature: 0,
        guided_json: request.responseSchema,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      },
    });

    return { text: readMessageText(rawEnvelope) };
  }
}
