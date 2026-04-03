import type {
  LlmBlockResult,
  LlmTodoEffort,
  LlmTodoItem,
  LlmTodoMetadata,
  LlmTodoPriority,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isPriority(value: unknown): value is LlmTodoPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isEffort(value: unknown): value is LlmTodoEffort {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isNullablePriority(value: unknown): value is LlmTodoPriority | null {
  return value === null || isPriority(value);
}

function isNullableEffort(value: unknown): value is LlmTodoEffort | null {
  return value === null || isEffort(value);
}

export function isLlmTodoMetadata(value: unknown): value is LlmTodoMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNullablePriority(value.priority) &&
    isNullableString(value.dueAt) &&
    isStringArray(value.tags) &&
    isNullableEffort(value.effort) &&
    isStringArray(value.ambiguities)
  );
}

export function isLlmTodoItem(value: unknown): value is LlmTodoItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.sourceQuote === 'string' &&
    typeof value.depth === 'number' &&
    isLlmTodoMetadata(value.metadata)
  );
}

export function isLlmBlockResult(value: unknown): value is LlmBlockResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.blockId === 'string' &&
    typeof value.hasActionableTodo === 'boolean' &&
    Array.isArray(value.todos) &&
    value.todos.every(isLlmTodoItem)
  );
}

export function isLlmBlockResultArray(value: unknown): value is LlmBlockResult[] {
  return Array.isArray(value) && value.every(isLlmBlockResult);
}
