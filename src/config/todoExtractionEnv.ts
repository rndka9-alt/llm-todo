export type TodoExtractionProvider = 'mock' | 'ollama' | 'gemini' | 'arliai';

export interface TodoExtractionRawEnv {
  VITE_TODO_EXTRACTION_PROVIDER?: string;
  VITE_OLLAMA_BASE_URL?: string;
  VITE_OLLAMA_MODEL?: string;
  VITE_OLLAMA_TIMEOUT_MS?: string;
  VITE_GEMINI_API_KEY?: string;
  VITE_GEMINI_MODEL?: string;
  VITE_GEMINI_TIMEOUT_MS?: string;
  VITE_ARLIAI_API_KEY?: string;
  VITE_ARLIAI_BASE_URL?: string;
  VITE_ARLIAI_MODEL?: string;
  VITE_ARLIAI_TIMEOUT_MS?: string;
}

export interface TodoExtractionEnv {
  provider: TodoExtractionProvider;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;
  geminiApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
  arliAiApiKey: string;
  arliAiBaseUrl: string;
  arliAiModel: string;
  arliAiTimeoutMs: number;
}

export function parseProvider(value: string | undefined): TodoExtractionProvider {
  if (value === 'ollama') {
    return 'ollama';
  }

  if (value === 'gemini') {
    return 'gemini';
  }

  if (value === 'arliai') {
    return 'arliai';
  }

  return 'mock';
}

export function parseTimeout(value: string | undefined): number {
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

export function buildTodoExtractionEnv(rawEnv: TodoExtractionRawEnv): TodoExtractionEnv {
  return {
    provider: parseProvider(rawEnv.VITE_TODO_EXTRACTION_PROVIDER),
    ollamaBaseUrl: rawEnv.VITE_OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    ollamaModel: rawEnv.VITE_OLLAMA_MODEL ?? 'gemma4:e2b',
    ollamaTimeoutMs: parseTimeout(rawEnv.VITE_OLLAMA_TIMEOUT_MS),
    geminiApiKey: rawEnv.VITE_GEMINI_API_KEY ?? '',
    geminiModel: rawEnv.VITE_GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview',
    geminiTimeoutMs: parseTimeout(rawEnv.VITE_GEMINI_TIMEOUT_MS),
    arliAiApiKey: rawEnv.VITE_ARLIAI_API_KEY ?? '',
    arliAiBaseUrl: rawEnv.VITE_ARLIAI_BASE_URL ?? 'https://api.arliai.com/v1',
    arliAiModel: rawEnv.VITE_ARLIAI_MODEL ?? 'Mistral-Small-3.1-24B-Instruct-2503',
    arliAiTimeoutMs: parseTimeout(rawEnv.VITE_ARLIAI_TIMEOUT_MS),
  };
}

function readTodoExtractionRawEnv(env: ImportMetaEnv): TodoExtractionRawEnv {
  return {
    VITE_TODO_EXTRACTION_PROVIDER: env.VITE_TODO_EXTRACTION_PROVIDER,
    VITE_OLLAMA_BASE_URL: env.VITE_OLLAMA_BASE_URL,
    VITE_OLLAMA_MODEL: env.VITE_OLLAMA_MODEL,
    VITE_OLLAMA_TIMEOUT_MS: env.VITE_OLLAMA_TIMEOUT_MS,
    VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY,
    VITE_GEMINI_MODEL: env.VITE_GEMINI_MODEL,
    VITE_GEMINI_TIMEOUT_MS: env.VITE_GEMINI_TIMEOUT_MS,
    VITE_ARLIAI_API_KEY: env.VITE_ARLIAI_API_KEY,
    VITE_ARLIAI_BASE_URL: env.VITE_ARLIAI_BASE_URL,
    VITE_ARLIAI_MODEL: env.VITE_ARLIAI_MODEL,
    VITE_ARLIAI_TIMEOUT_MS: env.VITE_ARLIAI_TIMEOUT_MS,
  };
}

export function getTodoExtractionEnv(): TodoExtractionEnv {
  return buildTodoExtractionEnv(readTodoExtractionRawEnv(import.meta.env));
}
