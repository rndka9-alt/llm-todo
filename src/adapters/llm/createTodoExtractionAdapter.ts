import { getTodoExtractionEnv } from '../../config/todoExtractionEnv';
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

  return new MockTodoExtractionAdapter();
}
