import { postJson } from '../../http/fetchJsonClient';
import type { LlmClient, LlmCompletionRequest, LlmCompletionResponse } from '../llmClient';

interface GeminiLlmClientOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

function buildRequestUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

// Gemini structured output은 type: ['string', 'null'] 을 지원하지 않는다.
// nullable: true + 단일 type 으로 변환해야 한다.
function toGeminiSchema(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(toGeminiSchema);
  }

  const source = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === 'type' && Array.isArray(value)) {
      const types = value.filter((t) => t !== 'null');
      result.type = types.length === 1 ? types[0] : types;
      if (value.includes('null')) {
        result.nullable = true;
      }
      continue;
    }

    if (key === 'enum' && Array.isArray(value) && value.includes(null)) {
      result.enum = value.filter((v) => v !== null);
      continue;
    }

    // Gemini response schema가 지원하지 않는 필드 제거
    if (key === 'additionalProperties') {
      continue;
    }

    result[key] = toGeminiSchema(value);
  }

  return result;
}

function readCandidateText(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return '';
  }

  const envelope = value as Record<string, unknown>;
  const candidates = envelope.candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return '';
  }

  const first = candidates[0] as Record<string, unknown> | undefined;

  if (typeof first !== 'object' || first === null) {
    return '';
  }

  const content = first.content as Record<string, unknown> | undefined;

  if (typeof content !== 'object' || content === null) {
    return '';
  }

  const parts = content.parts;

  if (!Array.isArray(parts) || parts.length === 0) {
    return '';
  }

  const part = parts[0] as Record<string, unknown> | undefined;

  if (typeof part !== 'object' || part === null) {
    return '';
  }

  const text = part.text;

  return typeof text === 'string' ? text : '';
}

export class GeminiLlmClient implements LlmClient {
  readonly modelName: string;
  private options: GeminiLlmClientOptions;

  constructor(options: GeminiLlmClientOptions) {
    this.options = options;
    this.modelName = options.model;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const rawEnvelope = await postJson({
      url: buildRequestUrl(this.options.model, this.options.apiKey),
      timeoutMs: this.options.timeoutMs,
      signal: request.signal,
      body: {
        contents: [
          {
            parts: [
              {
                text: request.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(request.responseSchema),
        },
      },
    });

    return { text: readCandidateText(rawEnvelope) };
  }
}
