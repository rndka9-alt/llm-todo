import { describe, expect, it } from 'vitest';
import { diffText } from './diffText';

describe('diffText', () => {
  it('detects inserted ranges', () => {
    expect(diffText('hello', 'hello world')).toEqual({
      kind: 'insert',
      previousRange: {
        start: 5,
        end: 5,
      },
      nextRange: {
        start: 5,
        end: 11,
      },
    });
  });

  it('detects replacement ranges', () => {
    expect(diffText('ship docs tomorrow', 'ship docs friday')).toEqual({
      kind: 'replace',
      previousRange: {
        start: 10,
        end: 18,
      },
      nextRange: {
        start: 10,
        end: 16,
      },
    });
  });
});
