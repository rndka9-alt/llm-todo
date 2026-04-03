import type { TextRange } from '../domain/models';

export function createRange(start: number, end: number): TextRange {
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function rangeLength(range: TextRange): number {
  return Math.max(0, range.end - range.start);
}

export function rangesIntersect(left: TextRange, right: TextRange): boolean {
  return left.start < right.end && right.start < left.end;
}

export function rangeContainsIndex(range: TextRange, index: number): boolean {
  return index >= range.start && index < range.end;
}

export function clampIndex(value: number, max: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function offsetRange(range: TextRange, offset: number): TextRange {
  return {
    start: range.start + offset,
    end: range.end + offset,
  };
}
