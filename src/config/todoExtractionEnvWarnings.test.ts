import { describe, expect, it } from 'vitest';
import { getTodoExtractionEnvWarnings } from './todoExtractionEnvWarnings';

describe('getTodoExtractionEnvWarnings', () => {
  it('warns when provider is missing', () => {
    expect(getTodoExtractionEnvWarnings({})).toEqual([
      'VITE_TODO_EXTRACTION_PROVIDER 가 설정되지 않았어요. 현재는 mock provider 로 동작합니다.',
    ]);
  });

  it('warns when ollama provider misses required values', () => {
    expect(
      getTodoExtractionEnvWarnings({
        VITE_TODO_EXTRACTION_PROVIDER: 'ollama',
      }),
    ).toEqual([
      'VITE_OLLAMA_BASE_URL 이 비어 있어요. 기본값 http://127.0.0.1:11434 를 사용합니다.',
      'VITE_OLLAMA_MODEL 이 비어 있어요. 기본값 gemma4:e2b 를 사용합니다.',
      'VITE_OLLAMA_TIMEOUT_MS 가 비어 있어요. 기본값 600000ms 를 사용합니다.',
    ]);
  });

  it('returns no warnings when ollama env is complete', () => {
    expect(
      getTodoExtractionEnvWarnings({
        VITE_TODO_EXTRACTION_PROVIDER: 'ollama',
        VITE_OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
        VITE_OLLAMA_MODEL: 'gemma4:e2b',
        VITE_OLLAMA_TIMEOUT_MS: '600000',
      }),
    ).toEqual([]);
  });
});
