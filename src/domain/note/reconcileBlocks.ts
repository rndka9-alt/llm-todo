import type { NoteBlock } from '../models';
import type { SegmentedBlock } from './segmentNote';
import { createId } from '../../lib/id';

interface CandidateMatch {
  block: NoteBlock;
  score: number;
}

function getTokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(left.toLowerCase().split(/\W+/).filter((token) => token.length > 0));
  const rightTokens = new Set(right.toLowerCase().split(/\W+/).filter((token) => token.length > 0));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function getPrefixSimilarity(left: string, right: string): number {
  const shorterLength = Math.min(left.length, right.length);

  if (shorterLength === 0) {
    return 0;
  }

  let prefixLength = 0;

  while (prefixLength < shorterLength && left[prefixLength] === right[prefixLength]) {
    prefixLength += 1;
  }

  return prefixLength / shorterLength;
}

function getRangeOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number): number {
  const start = Math.max(leftStart, rightStart);
  const end = Math.min(leftEnd, rightEnd);

  return Math.max(0, end - start);
}

function scoreCandidate(previous: NoteBlock, next: SegmentedBlock): number {
  if (previous.text === next.text) {
    return 10_000 - Math.abs(previous.range.start - next.range.start);
  }

  const overlap = getRangeOverlap(
    previous.range.start,
    previous.range.end,
    next.range.start,
    next.range.end,
  );

  if (overlap > 0) {
    const similarity = Math.max(
      getTokenSimilarity(previous.text, next.text),
      getPrefixSimilarity(previous.text, next.text),
    );

    if (similarity < 0.35) {
      return -1;
    }

    return overlap - Math.abs(previous.text.length - next.text.length) * 0.25;
  }

  return -1;
}

function findBestMatch(previousBlocks: NoteBlock[], usedIds: Set<string>, next: SegmentedBlock): CandidateMatch | null {
  let best: CandidateMatch | null = null;

  for (const block of previousBlocks) {
    if (usedIds.has(block.id)) {
      continue;
    }

    const score = scoreCandidate(block, next);

    if (score < 0) {
      continue;
    }

    if (best === null || score > best.score) {
      best = {
        block,
        score,
      };
    }
  }

  return best;
}

export function reconcileBlocks(previousBlocks: NoteBlock[], nextSegments: SegmentedBlock[], now: number): NoteBlock[] {
  const usedIds = new Set<string>();

  return nextSegments.map((segment, index) => {
    const bestMatch = findBestMatch(previousBlocks, usedIds, segment);

    if (bestMatch !== null) {
      usedIds.add(bestMatch.block.id);

      const textChanged = bestMatch.block.text !== segment.text;

      return {
        id: bestMatch.block.id,
        text: segment.text,
        range: segment.range,
        createdAt: bestMatch.block.createdAt,
        updatedAt: textChanged ? now : bestMatch.block.updatedAt,
        lastParsedAt: textChanged ? bestMatch.block.lastParsedAt : bestMatch.block.lastParsedAt,
        parseStatus: textChanged ? 'idle' : bestMatch.block.parseStatus,
      };
    }

    const seed = `${segment.text.slice(0, 48)}:${segment.range.start}`;

    return {
      id: createId(seed, index + now),
      text: segment.text,
      range: segment.range,
      createdAt: now,
      updatedAt: now,
      lastParsedAt: null,
      parseStatus: 'idle',
    };
  });
}
