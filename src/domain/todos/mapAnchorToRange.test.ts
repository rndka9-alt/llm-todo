import { describe, expect, it } from 'vitest';
import { resolveSourceAnchors } from './mapAnchorToRange';

describe('mapAnchorToRange', () => {
  it('resolves the requested occurrence of a quote and records the position', () => {
    const text = 'call Mina today and then call Mina tomorrow';
    const anchors = resolveSourceAnchors(text, [
      {
        quote: 'call Mina',
        occurrence: 1,
      },
    ]);

    expect(anchors).toEqual([
      {
        quote: 'call Mina',
        occurrence: 1,
        range: {
          start: 25,
          end: 34,
        },
      },
    ]);
  });

  it('reuses a unique shared quote across multiple anchors', () => {
    const text = 'after 3pm, visit salon and then go to market';
    const anchors = resolveSourceAnchors(text, [
      {
        quote: 'after 3pm',
        occurrence: 0,
      },
      {
        quote: 'visit salon',
        occurrence: 0,
      },
      {
        quote: 'after 3pm',
        occurrence: 0,
      },
      {
        quote: 'go to market',
        occurrence: 0,
      },
    ]);

    expect(anchors.map((anchor) => anchor.range)).toEqual([
      {
        start: 0,
        end: 9,
      },
      {
        start: 11,
        end: 22,
      },
      {
        start: 0,
        end: 9,
      },
      {
        start: 32,
        end: 44,
      },
    ]);
  });
});
