export interface DebounceQueue<T> {
  schedule(value: T): void;
  cancel(): void;
  setCallback(callback: (value: T) => void): void;
}

export function createDebounceQueue<T>(
  callback: (value: T) => void,
  waitMs: number,
): DebounceQueue<T> {
  let currentCallback = callback;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  return {
    schedule(value: T) {
      clearTimer();

      timerId = setTimeout(() => {
        timerId = null;
        currentCallback(value);
      }, waitMs);
    },
    cancel() {
      clearTimer();
    },
    setCallback(nextCallback: (value: T) => void) {
      currentCallback = nextCallback;
    },
  };
}
