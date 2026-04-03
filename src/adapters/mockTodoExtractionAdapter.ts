import type {
  AdapterInput,
  AdapterOutput,
  BlockInterpretation,
  ExtractedTodoDraft,
  Priority,
} from '../domain/models';
import type { TodoExtractionAdapter } from '../domain/parsing/todoAdapter';
import { slugify } from '../lib/id';

interface CandidateLine {
  raw: string;
  title: string;
  depth: number;
}

const sentencePattern = /[^.!?\n]+[.!?]?/g;
const actionPattern = /\b(todo|need to|needs to|should|must|remember to|follow up|send|draft|fix|ship|review|call|email|prepare|book)\b/i;
const priorityPattern: Record<Priority, RegExp> = {
  high: /\b(urgent|asap|high priority|p1)\b/i,
  medium: /\b(important|soon|p2)\b/i,
  low: /\b(low priority|later|eventually|p3)\b/i,
};

function cleanTitle(input: string): string {
  return input
    .replace(/^\s*(todo|note to self|remember to)\s*[:\-]\s*/i, '')
    .replace(/^\s*(need to|should|must|remember to)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]$/, '');
}

function extractPriority(input: string): Priority | undefined {
  const priorities: Priority[] = ['high', 'medium', 'low'];

  for (const priority of priorities) {
    const pattern = priorityPattern[priority];

    if (pattern.test(input)) {
      return priority;
    }
  }

  return undefined;
}

function extractDueDate(input: string): string | undefined {
  const isoMatch = input.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch) {
    return isoMatch[1];
  }

  const dayMatch = input.match(/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

  if (dayMatch) {
    return dayMatch[1];
  }

  return undefined;
}

function extractTags(input: string): string[] {
  const tags = input.match(/#[a-z0-9-_]+/gi);

  if (!tags) {
    return [];
  }

  return tags.map((tag) => tag.slice(1).toLowerCase());
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

function extractTodosFromBlock(blockId: string, text: string): ExtractedTodoDraft[] {
  const lines = text.split('\n');
  const todos: ExtractedTodoDraft[] = [];
  const occurrenceMap = new Map<string, number>();

  lines.forEach((line) => {
    parseLineCandidates(line).forEach((candidate) => {
      const quote = candidate.raw;
      const occurrence = occurrenceMap.get(quote) ?? 0;
      occurrenceMap.set(quote, occurrence + 1);

      const priority = extractPriority(quote);
      const dueDate = extractDueDate(quote);
      const tags = extractTags(quote);
      const todo: ExtractedTodoDraft = {
        localId: `${blockId}-${slugify(candidate.title)}`,
        title: candidate.title,
        depth: candidate.depth,
        sourceAnchor: {
          quote,
          occurrence,
        },
      };

      if (priority) {
        todo.priority = priority;
      }

      if (dueDate) {
        todo.dueDate = dueDate;
      }

      if (tags.length > 0) {
        todo.tags = tags;
      }

      todos.push(todo);
    });
  });

  return todos;
}

export class MockTodoExtractionAdapter implements TodoExtractionAdapter {
  async interpret(input: AdapterInput): Promise<AdapterOutput> {
    const results: BlockInterpretation[] = input.focusBlocks.map((block) => ({
      blockId: block.id,
      todos: extractTodosFromBlock(block.id, block.text),
    }));

    return {
      results,
    };
  }
}
