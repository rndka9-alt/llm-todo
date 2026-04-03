import { describe, expect, it } from 'vitest';
import { mapAnchorToRange } from './mapAnchorToRange';

describe('mapAnchorToRange', () => {
  it('resolves the requested occurrence of a quote', () => {
    const text = 'call Mina today and then call Mina tomorrow';
    const range = mapAnchorToRange(text, {
      quote: 'call Mina',
      occurrence: 1,
    });

    expect(range).toEqual({
      start: 25,
      end: 34,
    });
  });
});
