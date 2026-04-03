import { describe, expect, it, vi } from 'vitest';
import { createThrottleQueue } from './createThrottleQueue';

describe('createThrottleQueue', () => {
  it('runs immediately, then replays the latest pending value after the window closes', () => {
    vi.useFakeTimers();

    const calls: string[] = [];
    const queue = createThrottleQueue((value: string) => {
      calls.push(value);
    }, 300);

    queue.schedule('first');
    queue.schedule('second');
    queue.schedule('third');

    expect(calls).toEqual(['first']);

    vi.advanceTimersByTime(300);

    expect(calls).toEqual(['first', 'third']);

    vi.useRealTimers();
  });
});
