export interface JsonRequestOptions {
  url: string;
  body: unknown;
  signal?: AbortSignal;
  timeoutMs: number;
  headers?: Record<string, string>;
}

export class RequestAbortedError extends Error {
  constructor() {
    super('Request was aborted.');
    this.name = 'RequestAbortedError';
  }
}

export class RequestTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`);
    this.name = 'RequestTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ConnectionError extends Error {
  constructor() {
    super('Could not connect to the server.');
    this.name = 'ConnectionError';
  }
}

export class HttpStatusError extends Error {
  status: number;
  bodyText: string;

  constructor(status: number, bodyText: string) {
    super(`Server responded with status ${status}.`);
    this.name = 'HttpStatusError';
    this.status = status;
    this.bodyText = bodyText;
  }
}

export class InvalidJsonResponseError extends Error {
  rawResponse: string;

  constructor(rawResponse: string) {
    super('Response was not valid JSON.');
    this.name = 'InvalidJsonResponseError';
    this.rawResponse = rawResponse;
  }
}

function bridgeAbortSignals(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new RequestTimeoutError(timeoutMs));
  }, timeoutMs);

  const abortFromExternal = () => {
    controller.abort(externalSignal?.reason ?? new RequestAbortedError());
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);

      if (externalSignal) {
        externalSignal.removeEventListener('abort', abortFromExternal);
      }
    },
  };
}

export async function postJson(options: JsonRequestOptions): Promise<unknown> {
  const { signal, cleanup } = bridgeAbortSignals(options.signal, options.timeoutMs);

  try {
    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(options.body),
      signal,
    }).catch((error: unknown) => {
      if (signal.aborted) {
        const abortReason = signal.reason;

        if (abortReason instanceof RequestTimeoutError) {
          throw abortReason;
        }

        throw new RequestAbortedError();
      }

      if (error instanceof TypeError) {
        throw new ConnectionError();
      }

      throw error;
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new HttpStatusError(response.status, responseText);
    }

    if (responseText.length === 0) {
      throw new InvalidJsonResponseError(responseText);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new InvalidJsonResponseError(responseText);
    }
  } finally {
    cleanup();
  }
}
