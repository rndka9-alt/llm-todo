export interface ThrottleQueue<T> {
  schedule(value: T): void;
  cancel(): void;
  setCallback(callback: (value: T) => void): void;
}

export function createThrottleQueue<T>(
  callback: (value: T) => void,
  waitMs: number,
): ThrottleQueue<T> {
  let currentCallback = callback;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | null = null;

  function clearTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function startWindow() {
    clearTimer();

    timerId = setTimeout(() => {
      timerId = null;

      if (pendingValue === null) {
        return;
      }

      const nextValue = pendingValue;
      pendingValue = null;
      currentCallback(nextValue);
      startWindow();
    }, waitMs);
  }

  return {
    schedule(value: T) {
      if (timerId === null) {
        currentCallback(value);
        startWindow();
        return;
      }

      pendingValue = value;
    },
    cancel() {
      clearTimer();
      pendingValue = null;
    },
    setCallback(nextCallback: (value: T) => void) {
      currentCallback = nextCallback;
    },
  };
}
