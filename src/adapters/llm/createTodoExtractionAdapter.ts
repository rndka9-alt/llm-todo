import { getTodoExtractionEnv } from '../../config/todoExtractionEnv';
import { MockTodoExtractionAdapter } from './mockTodoExtractionAdapter';
import { OllamaTodoExtractionAdapter } from './ollamaTodoExtractionAdapter';
import type { TodoExtractionAdapter } from './todoExtractionAdapter';

export function createTodoExtractionAdapter(): TodoExtractionAdapter {
  const env = getTodoExtractionEnv();

  if (env.provider === 'ollama') {
    return new OllamaTodoExtractionAdapter({
      baseUrl: env.ollamaBaseUrl,
      model: env.ollamaModel,
      timeoutMs: env.ollamaTimeoutMs,
    });
  }

  return new MockTodoExtractionAdapter();
}
