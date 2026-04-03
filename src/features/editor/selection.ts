import type { DisplayHighlight } from '../../domain/models';
import { rangeContainsIndex, rangesIntersect } from '../../lib/range';

export function findTodoForSelection(
  highlights: DisplayHighlight[],
  selectionStart: number,
  selectionEnd: number,
): DisplayHighlight | null {
  const normalizedRange = {
    start: Math.min(selectionStart, selectionEnd),
    end: Math.max(selectionStart, selectionEnd),
  };

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
