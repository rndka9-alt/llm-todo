import { describe, expect, it } from 'vitest';
import type { BlockInterpretation, NoteBlock } from '../models';
import { projectTodoProjection } from './projectTodoProjection';

const blocks: NoteBlock[] = [
  {
    id: 'one',
    text: 'Need to ship docs\nNeed to email Mina',
    range: {
      start: 0,
      end: 37,
    },
    createdAt: 1,
    updatedAt: 1,
    lastParsedAt: 1,
    parseStatus: 'updated',
  },
];

const interpretations: BlockInterpretation[] = [
  {
    blockId: 'one',
    hasActionableTodo: true,
    todos: [
      {
        localId: 'ship-docs',
        title: 'ship docs',
        sourceAnchors: [
          {
            quote: 'Need to ship docs',
            occurrence: 0,
            range: {
              start: 0,
              end: 17,
            },
          },
        ],
      },
      {
        localId: 'email-mina',
        title: 'email Mina',
        sourceAnchors: [
          {
            quote: 'Need to email Mina',
            occurrence: 0,
            range: {
              start: 18,
              end: 36,
            },
          },
        ],
      },
    ],
  },
];

describe('projectTodoProjection', () => {
  it('returns todos in source order with absolute display ranges', () => {
    const projection = projectTodoProjection(blocks, interpretations);

    expect(projection.todos.map((todo) => todo.title)).toEqual(['ship docs', 'email Mina']);
    expect(projection.highlights.map((highlight) => highlight.range)).toEqual([
      {
        start: 0,
        end: 17,
      },
      {
        start: 18,
        end: 36,
      },
    ]);
  });

  it('creates multiple display ranges for one todo when it has multiple anchors', () => {
    const projection = projectTodoProjection(blocks, [
      {
        blockId: 'one',
        hasActionableTodo: true,
        todos: [
          {
            localId: 'ship-and-email',
            title: 'ship docs and email Mina',
            sourceAnchors: [
              {
                quote: 'Need to ship docs',
                occurrence: 0,
                range: {
                  start: 0,
                  end: 17,
                },
              },
              {
                quote: 'Need to email Mina',
                occurrence: 0,
                range: {
                  start: 18,
                  end: 36,
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(projection.todos[0]?.displayRanges).toEqual([
      {
        start: 0,
        end: 17,
      },
      {
        start: 18,
        end: 36,
      },
    ]);
    expect(projection.highlights).toHaveLength(2);
  });
});
