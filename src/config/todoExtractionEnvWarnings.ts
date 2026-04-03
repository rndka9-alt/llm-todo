export function getTodoExtractionEnvWarnings(rawEnv: Record<string, string>): string[] {
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

  return warnings;
}
