import { describe, expect, it } from 'vitest';
import { MockTodoExtractionAdapter } from './mockTodoExtractionAdapter';

describe('MockTodoExtractionAdapter', () => {
  it('extracts multiple actionable sentences from one block', async () => {
    const adapter = new MockTodoExtractionAdapter();
    const output = await adapter.extract({
      noteTitle: 'Test',
      requestedAt: 1,
      contextBlocks: [],
      focusBlocks: [
        {
          id: 'block-1',
          text: 'Need to ship docs tomorrow. Remember to email Mina by Friday.',
          range: {
            start: 0,
            end: 60,
          },
          createdAt: 1,
          updatedAt: 1,
          lastParsedAt: null,
          parseStatus: 'idle',
        },
      ],
    });

    expect(output.results[0]?.todos.map((todo) => todo.title)).toEqual([
      'ship docs tomorrow',
      'email Mina by Friday',
    ]);
    expect(output.results[0]?.hasActionableTodo).toBe(true);
    expect(output.results[0]?.todos[0]?.sourceAnchors[0]?.range).toEqual({
      start: 0,
      end: 27,
    });
    expect(output.traces[0]?.promptVersion).toBe('todo-extraction.v1');
  });

  it('returns deterministic traces and results for the same input', async () => {
    const adapter = new MockTodoExtractionAdapter();
    const input = {
      noteTitle: 'Test',
      requestedAt: 1712123456789,
      contextBlocks: [],
      focusBlocks: [
        {
          id: 'block-1',
          text: '- Fix checkout bug #frontend',
          range: {
            start: 0,
            end: 28,
          },
          createdAt: 1,
          updatedAt: 1,
          lastParsedAt: null,
          parseStatus: 'idle' as const,
        },
      ],
    };

    const first = await adapter.extract(input);
    const second = await adapter.extract(input);

    expect(second).toEqual(first);
  });
});
