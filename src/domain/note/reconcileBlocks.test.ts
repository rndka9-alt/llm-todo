import { describe, expect, it } from 'vitest';
import type { NoteBlock } from '../models';
import { reconcileBlocks } from './reconcileBlocks';
import { segmentNote } from './segmentNote';

function createBlock(id: string, text: string, start: number, end: number): NoteBlock {
  return {
    id,
    text,
    range: {
      start,
      end,
    },
    createdAt: 1,
    updatedAt: 1,
    lastParsedAt: 1,
    parseStatus: 'updated',
  };
}

describe('reconcileBlocks', () => {
  it('keeps stable ids for unchanged blocks after insertion', () => {
    const previous = [
      createBlock('alpha', 'Alpha', 0, 5),
      createBlock('beta', 'Beta', 7, 11),
    ];
    const next = segmentNote('Intro\n\nAlpha\n\nBeta');
    const blocks = reconcileBlocks(previous, next, 99);

    expect(blocks[1]?.id).toBe('alpha');
    expect(blocks[2]?.id).toBe('beta');
    expect(blocks[0]?.id).not.toBe('alpha');
  });

  it('preserves an edited block identity when ranges still overlap', () => {
    const previous = [createBlock('alpha', 'Alpha task', 0, 10)];
    const next = segmentNote('Alpha task updated');
    const blocks = reconcileBlocks(previous, next, 99);

    expect(blocks[0]?.id).toBe('alpha');
    expect(blocks[0]?.updatedAt).toBe(99);
  });
});
