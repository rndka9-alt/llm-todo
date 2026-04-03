import { describe, expect, it, vi } from 'vitest';
import { createDebounceQueue } from './createDebounceQueue';

describe('createDebounceQueue', () => {
  it('waits for the delay to pass before running, replaying only the latest value', () => {
    vi.useFakeTimers();

    const calls: string[] = [];
    const queue = createDebounceQueue((value: string) => {
      calls.push(value);
    }, 300);

    queue.schedule('first');
    queue.schedule('second');
    queue.schedule('third');

    expect(calls).toEqual([]);

    vi.advanceTimersByTime(300);

    expect(calls).toEqual(['third']);

    vi.useRealTimers();
  });
});
