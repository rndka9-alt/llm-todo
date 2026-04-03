import type { TextRange, TodoAnchor } from '../models';

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

export function mapAnchorToRange(text: string, anchor: TodoAnchor): TextRange | null {
  const occurrences = findAllOccurrences(text, anchor.quote);
  const index = occurrences[anchor.occurrence] ?? occurrences[0];

  if (typeof index !== 'number') {
    return null;
  }

  return {
    start: index,
    end: index + anchor.quote.length,
  };
}
