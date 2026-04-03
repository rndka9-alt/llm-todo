import type { AnalysisHighlight, DirtyRegion, NoteBlock } from '../models';
import { rangeContainsIndex, rangesIntersect } from '../../lib/range';

function blockTouchesBoundary(block: NoteBlock, index: number): boolean {
  if (rangeContainsIndex(block.range, index)) {
    return true;
  }

  return block.range.end === index || block.range.start === index;
}

export function selectDirtyBlockIds(blocks: NoteBlock[], dirtyRegion: DirtyRegion, now: number): string[] {
  if (dirtyRegion.kind === 'none') {
    return [];
  }

  const dirtyIds: string[] = [];

  for (const block of blocks) {
    const intersectsNextRange = rangesIntersect(block.range, dirtyRegion.nextRange);
    const touchesBoundary = blockTouchesBoundary(block, dirtyRegion.nextRange.start);
    const wasUpdatedNow = block.updatedAt === now;

    if (intersectsNextRange || touchesBoundary || wasUpdatedNow) {
      dirtyIds.push(block.id);
    }
  }

  return dirtyIds;
}

export function getContextBlocks(blocks: NoteBlock[], focusBlockIds: string[], radius: number): NoteBlock[] {
  if (focusBlockIds.length === 0) {
    return [];
  }

  const focusIndexes = blocks
    .map((block, index) => {
      if (focusBlockIds.includes(block.id)) {
        return index;
      }

      return -1;
    })
    .filter((index) => index >= 0);

  const indexes = new Set<number>();

  for (const focusIndex of focusIndexes) {
    const start = Math.max(0, focusIndex - radius);
    const end = Math.min(blocks.length - 1, focusIndex + radius);

    for (let index = start; index <= end; index += 1) {
      indexes.add(index);
    }
  }

  return [...indexes]
    .sort((left, right) => left - right)
    .map((index) => blocks[index])
    .filter((block): block is NoteBlock => typeof block !== 'undefined');
}

export function buildAnalysisHighlights(blocks: NoteBlock[], dirtyRegion: DirtyRegion): AnalysisHighlight[] {
  if (dirtyRegion.kind === 'none') {
    return [];
  }

  const highlights: AnalysisHighlight[] = [];

  if (dirtyRegion.kind === 'insert' && dirtyRegion.nextRange.start !== dirtyRegion.nextRange.end) {
    for (const block of blocks) {
      if (!rangesIntersect(block.range, dirtyRegion.nextRange)) {
        continue;
      }

      highlights.push({
        id: `${block.id}:analysis:new`,
        blockId: block.id,
        range: {
          start: Math.max(block.range.start, dirtyRegion.nextRange.start),
          end: Math.min(block.range.end, dirtyRegion.nextRange.end),
        },
        mode: 'new',
      });
    }

    return highlights;
  }

  for (const block of blocks) {
    if (block.parseStatus === 'queued' || block.parseStatus === 'parsing') {
      highlights.push({
        id: `${block.id}:analysis:update`,
        blockId: block.id,
        range: block.range,
        mode: 'updated',
      });
    }
  }

  return highlights;
}
