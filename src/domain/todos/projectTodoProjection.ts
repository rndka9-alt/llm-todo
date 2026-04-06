import type {
  BlockInterpretation,
  DisplayHighlight,
  NoteBlock,
  TodoProjectionItem,
} from '../models';
import { slugify } from '../../lib/id';
import { offsetRange } from '../../lib/range';

const colorPalette = [
  {
    highlight: 'bg-palette-0/30',
    accent: 'bg-palette-0',
  },
  {
    highlight: 'bg-palette-1/30',
    accent: 'bg-palette-1',
  },
  {
    highlight: 'bg-palette-2/30',
    accent: 'bg-palette-2',
  },
  {
    highlight: 'bg-palette-3/30',
    accent: 'bg-palette-3',
  },
  {
    highlight: 'bg-palette-4/30',
    accent: 'bg-palette-4',
  },
  {
    highlight: 'bg-palette-5/30',
    accent: 'bg-palette-5',
  },
];

function hashIndex(input: string, length: number): number {
  let hash = 0;

  for (const character of input) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 31);
  }

  return Math.abs(hash) % length;
}

interface ProjectionResult {
  todos: TodoProjectionItem[];
  highlights: DisplayHighlight[];
}

export function projectTodoProjection(blocks: NoteBlock[], interpretations: BlockInterpretation[]): ProjectionResult {
  const interpretationMap = new Map<string, BlockInterpretation>();

  for (const interpretation of interpretations) {
    interpretationMap.set(interpretation.blockId, interpretation);
  }

  const todos: TodoProjectionItem[] = [];
  const highlights: DisplayHighlight[] = [];

  blocks.forEach((block, blockIndex) => {
    const interpretation = interpretationMap.get(block.id);

    if (!interpretation) {
      return;
    }

    interpretation.todos.forEach((todo, todoIndex) => {
      const localRanges = todo.sourceAnchors
        .map((anchor) => anchor.range)
        .sort((left, right) => left.start - right.start);

      if (localRanges.length === 0) {
        return;
      }

      const id = `${block.id}:${slugify(todo.localId || todo.title)}`;
      const paletteEntry = colorPalette[hashIndex(id, colorPalette.length)];

      if (typeof paletteEntry === 'undefined') {
        return;
      }

      const displayRanges = localRanges.map((range) => offsetRange(range, block.range.start));
      const primaryDisplayRange = displayRanges[0];

      if (typeof primaryDisplayRange === 'undefined') {
        return;
      }

      const projectionItem: TodoProjectionItem = {
        id,
        blockId: block.id,
        title: todo.title,
        tags: todo.tags ?? [],
        sourceAnchors: todo.sourceAnchors,
        sourceQuotes: todo.sourceAnchors.map((anchor) => anchor.quote),
        sourceQuote: todo.sourceAnchors[0]?.quote ?? todo.title,
        displayRange: primaryDisplayRange,
        displayRanges,
        colorToken: paletteEntry.highlight,
        accentToken: paletteEntry.accent,
        orderKey: blockIndex * 100 + todoIndex,
        depth: todo.depth ?? 0,
      };

      if (todo.priority) {
        projectionItem.priority = todo.priority;
      }

      if (todo.dueDate) {
        projectionItem.dueDate = todo.dueDate;
      }

      todos.push(projectionItem);

      displayRanges.forEach((displayRange, rangeIndex) => {
        highlights.push({
          id: `${id}:highlight:${rangeIndex}`,
          todoId: id,
          blockId: block.id,
          range: displayRange,
          colorToken: paletteEntry.highlight,
          accentToken: paletteEntry.accent,
        });
      });
    });
  });

  todos.sort((left, right) => left.orderKey - right.orderKey);
  highlights.sort((left, right) => left.range.start - right.range.start);

  return {
    todos,
    highlights,
  };
}
