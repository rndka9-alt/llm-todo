import type {
  BlockInterpretation,
  Effort,
  ExtractedTodoDraft,
  NoteBlock,
  Priority,
} from '../../domain/models';
import { isLlmBlockResultArray } from '../../domain/todo/guards';
import type { LlmBlockResult } from '../../domain/todo/types';
import { slugify } from '../../lib/id';
import { buildTodoExtractionPrompt } from '../../prompts/todo-extraction/buildPrompt';
import { todoExtractionPromptVersion } from '../../prompts/todo-extraction/manifest';
import type { TodoExtractionAdapter } from './todoExtractionAdapter';
import type {
  TodoExtractionAdapterInput,
  TodoExtractionResult,
  TodoExtractionTrace,
} from './types';

interface CandidateLine {
  raw: string;
  title: string;
  depth: number;
}

const sentencePattern = /[^.!?\n]+[.!?]?/g;
const actionPattern =
  /\b(todo|need to|needs to|should|must|remember to|follow up|send|draft|fix|ship|review|call|email|prepare|book)\b/i;
const priorityPattern: Record<Priority, RegExp> = {
  high: /\b(urgent|asap|high priority|p1)\b/i,
  medium: /\b(important|soon|p2)\b/i,
  low: /\b(low priority|later|eventually|p3)\b/i,
};
const effortPattern: Record<Effort, RegExp> = {
  low: /\b(tiny|quick|small|simple)\b/i,
  medium: /\b(medium|moderate)\b/i,
  high: /\b(large|big|heavy|complex|multi-step)\b/i,
};

function cleanTitle(input: string): string {
  return input
    .replace(/^\s*(todo|note to self|remember to)\s*[:\-]\s*/i, '')
    .replace(/^\s*(need to|should|must|remember to)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]$/, '');
}

function extractPriority(input: string): Priority | null {
  const priorities: Priority[] = ['high', 'medium', 'low'];

  for (const priority of priorities) {
    const pattern = priorityPattern[priority];

    if (pattern.test(input)) {
      return priority;
    }
  }

  return null;
}

function extractEffort(input: string): Effort | null {
  const efforts: Effort[] = ['high', 'medium', 'low'];

  for (const effort of efforts) {
    const pattern = effortPattern[effort];

    if (pattern.test(input)) {
      return effort;
    }
  }

  return null;
}

function extractDueAt(input: string): string | null {
  const isoMatch = input.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const isoDate = isoMatch?.[1];

  if (typeof isoDate === 'string') {
    return isoDate;
  }

  const dayMatch = input.match(/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  const dayName = dayMatch?.[1];

  if (typeof dayName === 'string') {
    return dayName;
  }

  const relativeMatch = input.match(/\b(today|tomorrow)\b/i);
  const relativeDate = relativeMatch?.[1];

  if (typeof relativeDate === 'string') {
    return relativeDate.toLowerCase();
  }

  return null;
}

function extractTags(input: string): string[] {
  const tags = input.match(/#[a-z0-9-_]+/gi);

  if (!tags) {
    return [];
  }

  return tags.map((tag) => tag.slice(1).toLowerCase());
}

function extractAmbiguities(input: string): string[] {
  const ambiguities: string[] = [];

  if (/\b(something|stuff|things)\b/i.test(input)) {
    ambiguities.push('Task target is underspecified.');
  }

  if (/\bmaybe\b/i.test(input)) {
    ambiguities.push('Actionability is softened by tentative wording.');
  }

  return ambiguities;
}

function parseLineCandidates(line: string): CandidateLine[] {
  const bulletMatch = line.match(/^(\s*)([-*]|\[\s?\])\s+(.+)$/);

  if (bulletMatch) {
    const indentationGroup = bulletMatch[1];
    const contentGroup = bulletMatch[3];

    if (typeof indentationGroup !== 'string' || typeof contentGroup !== 'string') {
      return [];
    }

    const indentation = indentationGroup.replace(/\t/g, '  ').length;
    const content = contentGroup.trim();

    if (content.length === 0) {
      return [];
    }

    return [
      {
        raw: line.trim(),
        title: cleanTitle(content),
        depth: Math.floor(indentation / 2),
      },
    ];
  }

  const sentences = line.match(sentencePattern);

  if (!sentences) {
    return [];
  }

  const candidates: CandidateLine[] = [];

  for (const sentence of sentences) {
    if (!actionPattern.test(sentence)) {
      continue;
    }

    const trimmedSentence = sentence.trim();
    const title = cleanTitle(trimmedSentence);

    if (title.length === 0) {
      continue;
    }

    candidates.push({
      raw: trimmedSentence,
      title,
      depth: 0,
    });
  }

  return candidates;
}

function extractLlmBlockResult(block: NoteBlock): LlmBlockResult {
  const lines = block.text.split('\n');
  const todos = lines.flatMap((line) =>
    parseLineCandidates(line).map((candidate) => ({
      title: candidate.title,
      sourceQuote: candidate.raw,
      depth: candidate.depth,
      metadata: {
        priority: extractPriority(candidate.raw),
        dueAt: extractDueAt(candidate.raw),
        tags: extractTags(candidate.raw),
        effort: extractEffort(candidate.raw),
        ambiguities: extractAmbiguities(candidate.raw),
      },
    })),
  );

  return {
    blockId: block.id,
    hasActionableTodo: todos.length > 0,
    todos,
  };
}

function mapTodoDraft(blockId: string, todo: LlmBlockResult['todos'][number]): ExtractedTodoDraft {
  const draft: ExtractedTodoDraft = {
    localId: `${blockId}-${slugify(todo.title)}`,
    title: todo.title,
    depth: todo.depth,
    tags: todo.metadata.tags,
    ambiguities: todo.metadata.ambiguities,
    sourceAnchor: {
      quote: todo.sourceQuote,
      occurrence: 0,
    },
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

function mapBlockInterpretation(result: LlmBlockResult): BlockInterpretation {
  const occurrenceMap = new Map<string, number>();

  return {
    blockId: result.blockId,
    hasActionableTodo: result.hasActionableTodo,
    todos: result.todos.map((todo) => {
      const occurrence = occurrenceMap.get(todo.sourceQuote) ?? 0;
      occurrenceMap.set(todo.sourceQuote, occurrence + 1);

      return {
        ...mapTodoDraft(result.blockId, todo),
        sourceAnchor: {
          quote: todo.sourceQuote,
          occurrence,
        },
      };
    }),
  };
}

function partitionContextBlocks(
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

function buildPromptForBlock(input: TodoExtractionAdapterInput, block: NoteBlock): string {
  const { before, after } = partitionContextBlocks(block, input.contextBlocks);

  return buildTodoExtractionPrompt({
    currentTimeIso: new Date(input.requestedAt).toISOString(),
    targetBlockJson: JSON.stringify(block, null, 2),
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

function serializeRawResponse(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export class MockTodoExtractionAdapter implements TodoExtractionAdapter {
  async extract(input: TodoExtractionAdapterInput): Promise<TodoExtractionResult> {
    const traces: TodoExtractionTrace[] = [];
    const results: BlockInterpretation[] = [];

    for (const block of input.focusBlocks) {
      const builtPrompt = buildPromptForBlock(input, block);
      const rawResponse: unknown = [extractLlmBlockResult(block)];
      const rawResponseText = serializeRawResponse(rawResponse);

      traces.push({
        blockId: block.id,
        promptVersion: todoExtractionPromptVersion,
        modelName: 'mock-deterministic',
        builtPrompt,
        rawResponse: rawResponseText,
      });

      if (!isLlmBlockResultArray(rawResponse)) {
        results.push({
          blockId: block.id,
          hasActionableTodo: false,
          todos: [],
        });
        continue;
      }

      const result = rawResponse[0];

      if (typeof result === 'undefined') {
        results.push({
          blockId: block.id,
          hasActionableTodo: false,
          todos: [],
        });
        continue;
      }

      results.push(mapBlockInterpretation(result));
    }

    return {
      results,
      traces,
    };
  }
}
