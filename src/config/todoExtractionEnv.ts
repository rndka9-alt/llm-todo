export type TodoExtractionProvider = 'mock' | 'ollama';

export interface TodoExtractionEnv {
  provider: TodoExtractionProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;
}

function parseProvider(value: string | undefined): TodoExtractionProvider {
  if (value === 'ollama') {
    return 'ollama';
  }

  return 'mock';
}

function parseTimeout(value: string | undefined): number {
  const fallback = 600_000;

  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getTodoExtractionEnv(): TodoExtractionEnv {
  return {
    provider: parseProvider(import.meta.env.VITE_TODO_EXTRACTION_PROVIDER),
    ollamaBaseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    ollamaModel: import.meta.env.VITE_OLLAMA_MODEL ?? 'gemma4:e2b',
    ollamaTimeoutMs: parseTimeout(import.meta.env.VITE_OLLAMA_TIMEOUT_MS),
  };
}
