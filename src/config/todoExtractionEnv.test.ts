import { describe, expect, it } from 'vitest';
import { buildTodoExtractionEnv, parseProvider, parseTimeout } from './todoExtractionEnv';

describe('todoExtractionEnv', () => {
  it('parses arliai provider explicitly', () => {
    expect(parseProvider('arliai')).toBe('arliai');
  });

  it('falls back to mock for unknown provider', () => {
    expect(parseProvider('something-else')).toBe('mock');
  });

  it('uses arliai defaults when env values are omitted', () => {
    expect(
      buildTodoExtractionEnv({
        VITE_TODO_EXTRACTION_PROVIDER: 'arliai',
      }),
    ).toMatchObject({
      provider: 'arliai',
      arliAiApiKey: '',
      arliAiBaseUrl: 'https://api.arliai.com/v1',
      arliAiModel: 'Mistral-Small-3.1-24B-Instruct-2503',
      arliAiTimeoutMs: 600000,
    });
  });

  it('parses valid timeout values', () => {
    expect(parseTimeout('1234')).toBe(1234);
  });

  it('falls back when timeout is invalid', () => {
    expect(parseTimeout('0')).toBe(600000);
    expect(parseTimeout('wat')).toBe(600000);
    expect(parseTimeout(undefined)).toBe(600000);
  });
});
