import { describe, expect, it } from 'vitest';
import { findBlockIdsForSelection, findTodoForSelection } from './selection';

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

  it('finds the same todo when the caret enters its second highlight range', () => {
    const result = findTodoForSelection(
      [
        {
          id: 'h1',
          todoId: 'todo-1',
          blockId: 'block-1',
          range: {
            start: 0,
            end: 5,
          },
          colorToken: 'bg-sky-300/30',
          accentToken: 'bg-sky-300',
        },
        {
          id: 'h2',
          todoId: 'todo-1',
          blockId: 'block-1',
          range: {
            start: 20,
            end: 28,
          },
          colorToken: 'bg-sky-300/30',
          accentToken: 'bg-sky-300',
        },
      ],
      24,
      24,
    );

    expect(result?.todoId).toBe('todo-1');
  });
});

describe('findBlockIdsForSelection', () => {
  it('returns one block id when the selection stays within one block', () => {
    const result = findBlockIdsForSelection(
      [
        {
          id: 'block-1',
          text: 'Kickoff notes',
          range: {
            start: 0,
            end: 12,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
        {
          id: 'block-2',
          text: 'Launch prep',
          range: {
            start: 14,
            end: 25,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
      ],
      15,
      24,
    );

    expect(result).toEqual(['block-2']);
  });

  it('returns every intersecting block id when the selection crosses block boundaries', () => {
    const result = findBlockIdsForSelection(
      [
        {
          id: 'block-1',
          text: 'Kickoff notes',
          range: {
            start: 0,
            end: 12,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
        {
          id: 'block-2',
          text: 'Launch prep',
          range: {
            start: 14,
            end: 25,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
        {
          id: 'block-3',
          text: 'Loose ends',
          range: {
            start: 27,
            end: 37,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
      ],
      10,
      30,
    );

    expect(result).toEqual(['block-1', 'block-2', 'block-3']);
  });

  it('returns an empty list for a collapsed selection', () => {
    const result = findBlockIdsForSelection(
      [
        {
          id: 'block-1',
          text: 'Kickoff notes',
          range: {
            start: 0,
            end: 12,
          },
          createdAt: 0,
          updatedAt: 0,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
      ],
      4,
      4,
    );

    expect(result).toEqual([]);
  });
});
