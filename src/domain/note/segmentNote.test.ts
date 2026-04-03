import { describe, expect, it } from 'vitest';
import { segmentNote } from './segmentNote';

describe('segmentNote', () => {
  it('splits paragraphs and preserves absolute ranges', () => {
    const text = 'Alpha block\nstill alpha\n\n\nBeta block\n\nGamma';
    const blocks = segmentNote(text);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({
      text: 'Alpha block\nstill alpha',
      range: {
        start: 0,
        end: 23,
      },
    });
    expect(blocks[1]).toEqual({
      text: 'Beta block',
      range: {
        start: 26,
        end: 36,
      },
    });
    expect(blocks[2]).toEqual({
      text: 'Gamma',
      range: {
        start: 38,
        end: 43,
      },
    });
  });
});
