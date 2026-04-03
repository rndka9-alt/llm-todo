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
    todos: [
      {
        localId: 'ship-docs',
        title: 'ship docs',
        sourceAnchor: {
          quote: 'Need to ship docs',
          occurrence: 0,
        },
      },
      {
        localId: 'email-mina',
        title: 'email Mina',
        sourceAnchor: {
          quote: 'Need to email Mina',
          occurrence: 0,
        },
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
});
