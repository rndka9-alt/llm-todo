export type TodoExtractionProvider = 'mock' | 'ollama' | 'gemini';

export interface TodoExtractionEnv {
  provider: TodoExtractionProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;
  geminiApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
}

function parseProvider(value: string | undefined): TodoExtractionProvider {
  if (value === 'ollama') {
    return 'ollama';
  }

  if (value === 'gemini') {
    return 'gemini';
  }

  return 'mock';
}

function parseTimeout(value: string | undefined): number {
  const fallback = 600_000;

  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = parseInt(value, 10);

  if (!isFinite(parsed) || parsed <= 0) {
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
    geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
    geminiModel: import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview',
    geminiTimeoutMs: parseTimeout(import.meta.env.VITE_GEMINI_TIMEOUT_MS),
  };
}
