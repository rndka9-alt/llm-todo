import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArliAiLlmClient } from './arliai';

describe('ArliAiLlmClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the ArliAI chat completions endpoint with guided_json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: '[{"blockId":"block-1","hasActionableTodo":false,"todos":[]}]',
              },
            },
          ],
        }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new ArliAiLlmClient({
      apiKey: 'arliai-key',
      baseUrl: 'https://api.arliai.com/v1/',
      model: 'Mistral-Small-3.1-24B-Instruct-2503',
      timeoutMs: 5000,
    });

    const response = await client.complete({
      prompt: 'hello',
      responseSchema: { type: 'array' },
    });

    expect(response.text).toBe('[{"blockId":"block-1","hasActionableTodo":false,"todos":[]}]');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstCall = fetchMock.mock.calls[0];

    if (typeof firstCall === 'undefined') {
      throw new Error('fetch was not called.');
    }

    const [url, options] = firstCall;
    expect(url).toBe('https://api.arliai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer arliai-key',
    });
    expect(JSON.parse(String(options.body))).toEqual({
      model: 'Mistral-Small-3.1-24B-Instruct-2503',
      stream: false,
      temperature: 0,
      guided_json: { type: 'array' },
      messages: [
        {
          role: 'user',
          content: 'hello',
        },
      ],
    });
  });

  it('throws when the response does not include chat content', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      text: async () => JSON.stringify({ choices: [] }),
    }));

    const client = new ArliAiLlmClient({
      apiKey: 'arliai-key',
      baseUrl: 'https://api.arliai.com/v1',
      model: 'Mistral-Small-3.1-24B-Instruct-2503',
      timeoutMs: 5000,
    });

    await expect(
      client.complete({
        prompt: 'hello',
        responseSchema: { type: 'array' },
      }),
    ).rejects.toThrow('ArliAI response did not include choices.');
  });
});
