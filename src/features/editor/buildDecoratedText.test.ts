import { describe, expect, it } from 'vitest';
import { buildDecoratedText } from './buildDecoratedText';

describe('buildDecoratedText', () => {
  it('lets analysis highlight override display highlight while parsing', () => {
    const segments = buildDecoratedText(
      'ship docs now',
      [
        {
          id: 'display-1',
          todoId: 'todo-1',
          blockId: 'block-1',
          range: {
            start: 0,
            end: 4,
          },
          colorToken: 'bg-palette-1/30',
          accentToken: 'bg-palette-1',
        },
      ],
      [
        {
          id: 'analysis-1',
          blockId: 'block-1',
          range: {
            start: 0,
            end: 8,
          },
          mode: 'updated',
        },
      ],
    );

    expect(segments[0]?.className).toContain('bg-surface-overlay/40');
  });
});
