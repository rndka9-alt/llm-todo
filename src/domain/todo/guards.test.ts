import { describe, expect, it } from 'vitest';
import {
  isLlmBlockResult,
  isLlmBlockResultArray,
  isLlmTodoItem,
  isLlmTodoMetadata,
} from './guards';

describe('todo guards', () => {
  it('accepts a valid output contract payload', () => {
    const value = [
      {
        blockId: 'block-1',
        hasActionableTodo: true,
        todos: [
          {
            title: 'ship docs',
            sourceQuotes: ['Need to ship docs tomorrow.'],
            depth: 0,
            metadata: {
              priority: 'high',
              dueAt: '2026-04-05',
              tags: ['docs'],
              effort: 'low',
              ambiguities: [],
            },
          },
        ],
      },
    ];

    expect(isLlmBlockResultArray(value)).toBe(true);
    const blockResult = value[0];
    const todoItem = blockResult?.todos[0];

    expect(isLlmBlockResult(blockResult)).toBe(true);
    expect(isLlmTodoItem(todoItem)).toBe(true);
    expect(isLlmTodoMetadata(todoItem?.metadata)).toBe(true);
  });

  it('rejects invalid payload shapes', () => {
    expect(
      isLlmBlockResult({
        blockId: 'block-1',
        hasActionableTodo: 'yes',
        todos: [],
      }),
    ).toBe(false);

    expect(
      isLlmBlockResultArray([
        {
          blockId: 'block-1',
          hasActionableTodo: false,
        },
      ]),
    ).toBe(false);
  });
});
