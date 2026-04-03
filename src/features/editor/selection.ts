import type { DisplayHighlight, NoteBlock, TextRange } from '../../domain/models';
import { createRange, rangeContainsIndex, rangeLength, rangesIntersect } from '../../lib/range';

function normalizeSelectionRange(selectionStart: number, selectionEnd: number): TextRange {
  return createRange(selectionStart, selectionEnd);
}

export function findTodoForSelection(
  highlights: DisplayHighlight[],
  selectionStart: number,
  selectionEnd: number,
): DisplayHighlight | null {
  const normalizedRange = normalizeSelectionRange(selectionStart, selectionEnd);

  for (const highlight of highlights) {
    if (normalizedRange.start === normalizedRange.end) {
      if (rangeContainsIndex(highlight.range, normalizedRange.start)) {
        return highlight;
      }

      continue;
    }

    if (rangesIntersect(highlight.range, normalizedRange)) {
      return highlight;
    }
  }

  return null;
}

export function findBlockIdsForSelection(
  blocks: NoteBlock[],
  selectionStart: number,
  selectionEnd: number,
): string[] {
  const normalizedRange = normalizeSelectionRange(selectionStart, selectionEnd);

  if (rangeLength(normalizedRange) === 0) {
    return [];
  }

  return blocks
    .filter((block) => rangesIntersect(block.range, normalizedRange))
    .map((block) => block.id);
}
