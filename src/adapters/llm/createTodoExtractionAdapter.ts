import { getTodoExtractionEnv } from '../../config/todoExtractionEnv';
import { ArliAiLlmClient } from './clients/arliai';
import { GeminiLlmClient } from './clients/gemini';
import { OllamaLlmClient } from './clients/ollama';
import { LlmTodoExtractionAdapter } from './llmTodoExtractionAdapter';
import { MockTodoExtractionAdapter } from './mockTodoExtractionAdapter';
import type { TodoExtractionAdapter } from './todoExtractionAdapter';

export function createTodoExtractionAdapter(): TodoExtractionAdapter {
  const env = getTodoExtractionEnv();

  if (env.provider === 'ollama') {
    const client = new OllamaLlmClient({
      baseUrl: env.ollamaBaseUrl,
      model: env.ollamaModel,
      timeoutMs: env.ollamaTimeoutMs,
    });
    return new LlmTodoExtractionAdapter(client);
  }

  if (env.provider === 'gemini') {
    const client = new GeminiLlmClient({
      apiKey: env.geminiApiKey,
      model: env.geminiModel,
      timeoutMs: env.geminiTimeoutMs,
    });
    return new LlmTodoExtractionAdapter(client);
  }

  if (env.provider === 'arliai') {
    const client = new ArliAiLlmClient({
      apiKey: env.arliAiApiKey,
      baseUrl: env.arliAiBaseUrl,
      model: env.arliAiModel,
      timeoutMs: env.arliAiTimeoutMs,
    });
    return new LlmTodoExtractionAdapter(client);
  }

  return new MockTodoExtractionAdapter();
}
