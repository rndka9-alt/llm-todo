import { describe, expect, it } from 'vitest';
import { MockTodoExtractionAdapter } from './mockTodoExtractionAdapter';

describe('MockTodoExtractionAdapter', () => {
  it('extracts multiple actionable sentences from one block', async () => {
    const adapter = new MockTodoExtractionAdapter();
    const output = await adapter.interpret({
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
  });
});
