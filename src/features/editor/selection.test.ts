import { describe, expect, it } from 'vitest';
import { findTodoForSelection } from './selection';

describe('findTodoForSelection', () => {
  it('finds a highlight when the caret enters its range', () => {
    const result = findTodoForSelection(
      [
        {
          id: 'h1',
          todoId: 'todo-1',
          blockId: 'block-1',
          range: {
            start: 10,
            end: 20,
          },
          colorToken: 'bg-sky-300/30',
          accentToken: 'bg-sky-300',
        },
      ],
      15,
      15,
    );

    expect(result?.todoId).toBe('todo-1');
  });
});
