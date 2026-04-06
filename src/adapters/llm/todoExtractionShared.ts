import type {
  BlockInterpretation,
  ExtractedTodoDraft,
  NoteBlock,
  TodoAnchorReference,
} from '../../domain/models';
import { stripCommentLines } from '../../domain/note/commentLine';
import { resolveSourceAnchors } from '../../domain/todos/mapAnchorToRange';
import type { LlmBlockResult } from '../../domain/todo/types';
import { slugify } from '../../lib/id';
import { buildTodoExtractionPrompt } from '../../prompts/todo-extraction/buildPrompt';

export function partitionContextBlocks(
  targetBlock: NoteBlock,
  contextBlocks: NoteBlock[],
): { before: NoteBlock[]; after: NoteBlock[] } {
  const siblings = contextBlocks
    .filter((block) => block.id !== targetBlock.id)
    .slice()
    .sort((left, right) => left.range.start - right.range.start);

  return {
    before: siblings.filter((block) => block.range.end <= targetBlock.range.start),
    after: siblings.filter((block) => block.range.start >= targetBlock.range.end),
  };
}

export function buildPromptForBlock(
  input: {
    noteTitle: string;
    contextBlocks: NoteBlock[];
    requestedAt: number;
  },
  block: NoteBlock,
): string {
  const { before, after } = partitionContextBlocks(block, input.contextBlocks);

  // 혼합 블록에서 // 주석 라인을 제거한 텍스트만 LLM에 전달
  const promptBlock = { ...block, text: stripCommentLines(block.text) };

  return buildTodoExtractionPrompt({
    currentTimeIso: new Date(input.requestedAt).toISOString(),
    targetBlockJson: JSON.stringify(promptBlock, null, 2),
    contextBlocksBeforeJson: JSON.stringify(before, null, 2),
    contextBlocksAfterJson: JSON.stringify(after, null, 2),
    optionalHintsJson: JSON.stringify(
      {
        noteTitle: input.noteTitle,
      },
      null,
      2,
    ),
  });
}

export function serializeRawResponse(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function mapTodoDraft(
  blockId: string,
  todo: LlmBlockResult['todos'][number],
  sourceAnchors: ExtractedTodoDraft['sourceAnchors'],
): ExtractedTodoDraft {
  const draft: ExtractedTodoDraft = {
    localId: `${blockId}-${slugify(todo.title)}`,
    title: todo.title,
    depth: todo.depth,
    tags: todo.metadata.tags,
    ambiguities: todo.metadata.ambiguities,
    sourceAnchors,
  };

  if (todo.metadata.priority !== null) {
    draft.priority = todo.metadata.priority;
  }

  if (todo.metadata.dueAt !== null) {
    draft.dueDate = todo.metadata.dueAt;
  }

  if (todo.metadata.effort !== null) {
    draft.effort = todo.metadata.effort;
  }

  return draft;
}

export function mapBlockInterpretationWithResolvedAnchors(
  block: NoteBlock,
  result: LlmBlockResult,
): BlockInterpretation {
  const quoteUsageMap = new Map<string, number>();

  return {
    blockId: result.blockId,
    hasActionableTodo: result.hasActionableTodo,
    todos: result.todos.map((todo) => {
      const anchorReferences: TodoAnchorReference[] = todo.sourceQuotes.map((quote) => ({
        quote,
        occurrence: quoteUsageMap.get(quote) ?? 0,
      }));
      const sourceAnchors = resolveSourceAnchors(block.text, anchorReferences);

      sourceAnchors.forEach((anchor) => {
        const nextOccurrence = anchor.occurrence + 1;
        const current = quoteUsageMap.get(anchor.quote) ?? 0;

        if (nextOccurrence > current) {
          quoteUsageMap.set(anchor.quote, nextOccurrence);
        }
      });

      return mapTodoDraft(result.blockId, todo, sourceAnchors);
    }),
  };
}
