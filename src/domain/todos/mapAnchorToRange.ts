import type {
  TextRange,
  TodoAnchorReference,
  TodoSourceAnchor,
} from '../models';

function createRange(start: number, end: number): TextRange {
  return {
    start,
    end,
  };
}

function findAllOccurrences(text: string, quote: string): number[] {
  const indexes: number[] = [];

  if (quote.length === 0) {
    return indexes;
  }

  let index = text.indexOf(quote);

  while (index >= 0) {
    indexes.push(index);
    index = text.indexOf(quote, index + quote.length);
  }

  return indexes;
}

function mapAnchorReferenceToRange(text: string, anchor: TodoAnchorReference): TextRange | null {
  const occurrences = findAllOccurrences(text, anchor.quote);
  const index = occurrences[anchor.occurrence] ?? occurrences[0];

  if (typeof index !== 'number') {
    return null;
  }

  return createRange(index, index + anchor.quote.length);
}

export function resolveSourceAnchors(
  text: string,
  anchors: TodoAnchorReference[],
): TodoSourceAnchor[] {
  const usageMap = new Map<string, number>();
  const resolvedAnchors: TodoSourceAnchor[] = [];

  for (const anchor of anchors) {
    const occurrences = findAllOccurrences(text, anchor.quote);

    if (occurrences.length === 0) {
      continue;
    }

    let occurrence = anchor.occurrence;

    if (occurrences.length === 1) {
      occurrence = 0;
    } else if (anchor.occurrence === 0) {
      occurrence = usageMap.get(anchor.quote) ?? 0;
    }

    const clampedOccurrence = Math.min(occurrence, occurrences.length - 1);
    const range = mapAnchorReferenceToRange(text, {
      quote: anchor.quote,
      occurrence: clampedOccurrence,
    });

    if (range === null) {
      continue;
    }

    if (occurrences.length > 1) {
      usageMap.set(anchor.quote, clampedOccurrence + 1);
    }

    resolvedAnchors.push({
      quote: anchor.quote,
      occurrence: clampedOccurrence,
      range,
    });
  }

  return resolvedAnchors;
}
