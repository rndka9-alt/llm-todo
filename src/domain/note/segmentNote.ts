import type { TextRange } from '../models';

export interface SegmentedBlock {
  text: string;
  range: TextRange;
}

export function segmentNote(text: string): SegmentedBlock[] {
  const segments: SegmentedBlock[] = [];
  const pattern = /\S[\s\S]*?(?=\n\s*\n|$)/g;
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const matchedText = match[0];
    const start = match.index;

    if (typeof start !== 'number') {
      continue;
    }

    const trimmedEndOffset = matchedText.search(/\s*$/);
    const end = start + (trimmedEndOffset >= 0 ? trimmedEndOffset : matchedText.length);

    segments.push({
      text: text.slice(start, end),
      range: {
        start,
        end,
      },
    });
  }

  return segments;
}
