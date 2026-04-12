import type { TodoExtractionRawEnv } from './todoExtractionEnv';

export function getTodoExtractionEnvWarnings(rawEnv: TodoExtractionRawEnv): string[] {
  const warnings: string[] = [];
  const provider = rawEnv.VITE_TODO_EXTRACTION_PROVIDER;

  if (typeof provider === 'undefined' || provider.length === 0) {
    warnings.push(
      'VITE_TODO_EXTRACTION_PROVIDER 가 설정되지 않았어요. 현재는 mock provider 로 동작합니다.',
    );
  }

  if (provider === 'ollama') {
    if (!rawEnv.VITE_OLLAMA_BASE_URL) {
      warnings.push('VITE_OLLAMA_BASE_URL 이 비어 있어요. 기본값 http://127.0.0.1:11434 를 사용합니다.');
    }

    if (!rawEnv.VITE_OLLAMA_MODEL) {
      warnings.push('VITE_OLLAMA_MODEL 이 비어 있어요. 기본값 gemma4:e2b 를 사용합니다.');
    }

    if (!rawEnv.VITE_OLLAMA_TIMEOUT_MS) {
      warnings.push('VITE_OLLAMA_TIMEOUT_MS 가 비어 있어요. 기본값 600000ms 를 사용합니다.');
    }
  }

  if (provider === 'gemini') {
    if (!rawEnv.VITE_GEMINI_API_KEY) {
      warnings.push('VITE_GEMINI_API_KEY 가 비어 있어요. API 키 없이는 요청이 실패합니다.');
    }

    if (!rawEnv.VITE_GEMINI_MODEL) {
      warnings.push('VITE_GEMINI_MODEL 이 비어 있어요. 기본값 gemini-3.1-flash-lite-preview 를 사용합니다.');
    }

    if (!rawEnv.VITE_GEMINI_TIMEOUT_MS) {
      warnings.push('VITE_GEMINI_TIMEOUT_MS 가 비어 있어요. 기본값 600000ms 를 사용합니다.');
    }
  }

  if (provider === 'arliai') {
    if (!rawEnv.VITE_ARLIAI_API_KEY) {
      warnings.push('VITE_ARLIAI_API_KEY 가 비어 있어요. API 키 없이는 요청이 실패합니다.');
    }

    if (!rawEnv.VITE_ARLIAI_BASE_URL) {
      warnings.push(
        'VITE_ARLIAI_BASE_URL 이 비어 있어요. 기본값 https://api.arliai.com/v1 를 사용합니다.',
      );
    }

    if (!rawEnv.VITE_ARLIAI_MODEL) {
      warnings.push(
        'VITE_ARLIAI_MODEL 이 비어 있어요. 기본값 Mistral-Small-3.1-24B-Instruct-2503 를 사용합니다.',
      );
    }

    if (!rawEnv.VITE_ARLIAI_TIMEOUT_MS) {
      warnings.push('VITE_ARLIAI_TIMEOUT_MS 가 비어 있어요. 기본값 600000ms 를 사용합니다.');
    }
  }

  return warnings;
}
