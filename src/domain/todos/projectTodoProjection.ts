import type {
  BlockInterpretation,
  DisplayHighlight,
  NoteBlock,
  TodoProjectionItem,
} from '../models';
import { slugify } from '../../lib/id';
import { offsetRange } from '../../lib/range';
import { mapAnchorToRange } from './mapAnchorToRange';

const colorPalette = [
  {
    highlight: 'bg-amber-300/30',
    accent: 'bg-amber-300',
  },
  {
    highlight: 'bg-sky-300/30',
    accent: 'bg-sky-300',
  },
  {
    highlight: 'bg-emerald-300/30',
    accent: 'bg-emerald-300',
  },
  {
    highlight: 'bg-rose-300/30',
    accent: 'bg-rose-300',
  },
  {
    highlight: 'bg-fuchsia-300/30',
    accent: 'bg-fuchsia-300',
  },
  {
    highlight: 'bg-cyan-300/30',
    accent: 'bg-cyan-300',
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
      const localRange = mapAnchorToRange(block.text, todo.sourceAnchor);

      if (localRange === null) {
        return;
      }

      const id = `${block.id}:${slugify(todo.localId || todo.title)}`;
      const paletteEntry = colorPalette[hashIndex(id, colorPalette.length)];

      if (typeof paletteEntry === 'undefined') {
        return;
      }

      const displayRange = offsetRange(localRange, block.range.start);

      const projectionItem: TodoProjectionItem = {
        id,
        blockId: block.id,
        title: todo.title,
        tags: todo.tags ?? [],
        sourceAnchor: todo.sourceAnchor,
        sourceQuote: todo.sourceAnchor.quote,
        displayRange,
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

      highlights.push({
        id: `${id}:highlight`,
        todoId: id,
        blockId: block.id,
        range: displayRange,
        colorToken: paletteEntry.highlight,
        accentToken: paletteEntry.accent,
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
