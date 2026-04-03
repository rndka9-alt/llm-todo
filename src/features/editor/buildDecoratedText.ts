import type { AnalysisHighlight, DisplayHighlight } from '../../domain/models';

export interface DecoratedTextSegment {
  key: string;
  text: string;
  todoId: string | null;
  className: string;
}

function pickSegmentClass(
  displayHighlight: DisplayHighlight | undefined,
  analysisHighlight: AnalysisHighlight | undefined,
): string {
  if (analysisHighlight) {
    return 'rounded bg-slate-500/40';
  }

  if (displayHighlight) {
    return `rounded ${displayHighlight.colorToken}`;
  }

  return '';
}

export function buildDecoratedText(
  text: string,
  displayHighlights: DisplayHighlight[],
  analysisHighlights: AnalysisHighlight[],
): DecoratedTextSegment[] {
  const boundaries = new Set<number>([0, text.length]);

  displayHighlights.forEach((highlight) => {
    boundaries.add(highlight.range.start);
    boundaries.add(highlight.range.end);
  });

  analysisHighlights.forEach((highlight) => {
    boundaries.add(highlight.range.start);
    boundaries.add(highlight.range.end);
  });

  const sortedBoundaries = [...boundaries].sort((left, right) => left - right);
  const segments: DecoratedTextSegment[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const start = sortedBoundaries[index];
    const end = sortedBoundaries[index + 1];

    if (typeof start !== 'number' || typeof end !== 'number') {
      continue;
    }

    const slice = text.slice(start, end);

    if (slice.length === 0) {
      continue;
    }

    const displayHighlight = displayHighlights.find(
      (highlight) => highlight.range.start <= start && highlight.range.end >= end,
    );
    const analysisHighlight = analysisHighlights.find(
      (highlight) => highlight.range.start <= start && highlight.range.end >= end,
    );

    segments.push({
      key: `${start}:${end}`,
      text: slice,
      todoId: displayHighlight ? displayHighlight.todoId : null,
      className: pickSegmentClass(displayHighlight, analysisHighlight),
    });
  }

  if (segments.length === 0) {
    segments.push({
      key: 'empty',
      text,
      todoId: null,
      className: '',
    });
  }

  return segments;
}
