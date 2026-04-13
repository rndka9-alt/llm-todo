import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { MockTodoExtractionAdapter } from '../../adapters/llm/mockTodoExtractionAdapter';
import type { TodoExtractionAdapter } from '../../adapters/llm/todoExtractionAdapter';
import type { TodoExtractionAdapterInput, TodoExtractionResult } from '../../adapters/llm/types';
import { reconcileBlocks } from '../../domain/note/reconcileBlocks';
import { segmentNote } from '../../domain/note/segmentNote';
import { createTodoQueryClient } from '../../lib/queryClient';
import type { PersistedWorkspaceSnapshot, WorkspaceSnapshotRepository } from './workspacePersistence';
import { createPersistedSnapshot } from './workspacePersistence';
import { createInitialWorkspaceState } from './workspaceState';
import { useTodoWorkspace } from './useTodoWorkspace';

class RecordingTodoExtractionAdapter implements TodoExtractionAdapter {
  readonly calls: TodoExtractionAdapterInput[] = [];

  async extract(input: TodoExtractionAdapterInput): Promise<TodoExtractionResult> {
    this.calls.push(input);

    return {
      results: input.focusBlocks.map((block) => ({
        blockId: block.id,
        hasActionableTodo: false,
        todos: [],
      })),
      traces: [],
    };
  }
}

function createSnapshot(): PersistedWorkspaceSnapshot {
  const state = createInitialWorkspaceState(10);
  const firstBlock = state.blocks[0];

  if (typeof firstBlock === 'undefined') {
    throw new Error('Expected sample note to contain at least one block');
  }

  return createPersistedSnapshot(
    {
      ...state,
      noteTitle: 'Hydrated note',
      interpretations: [
        {
          blockId: firstBlock.id,
          hasActionableTodo: false,
          todos: [],
        },
      ],
    },
    20,
  );
}

function createSnapshotWithText(noteText: string): PersistedWorkspaceSnapshot {
  const blocks = reconcileBlocks([], segmentNote(noteText), 10);

  return {
    version: 1,
    noteTitle: 'Hydrated note',
    noteText,
    blocks,
    interpretations: blocks.map((block) => ({
      blockId: block.id,
      hasActionableTodo: false,
      todos: [],
    })),
    checkedTodoIds: [],
    lastUpdatedAt: 10,
    savedAt: 20,
  };
}

describe('useTodoWorkspace', () => {
  it('hydrates from the repository and persists later edits', async () => {
    const snapshot = createSnapshot();
    const saveCalls: PersistedWorkspaceSnapshot[] = [];
    const queryClient = createTodoQueryClient();
    const repository: WorkspaceSnapshotRepository = {
      load: async () => snapshot,
      save: async (nextSnapshot) => {
        saveCalls.push(nextSnapshot);
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTodoWorkspace({
          repository,
          adapter: new MockTodoExtractionAdapter(),
        }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.noteTitle).toBe('Hydrated note');
    });

    act(() => {
      result.current.setNoteTitle('Edited note');
    });

    await waitFor(() => {
      const lastSnapshot = saveCalls[saveCalls.length - 1];

      expect(lastSnapshot?.noteTitle).toBe('Edited note');
    });
  });

  it('re-parses every selected block when regeneration is requested', async () => {
    const snapshot = createSnapshot();
    const queryClient = createTodoQueryClient();
    const adapter = new RecordingTodoExtractionAdapter();
    const repository: WorkspaceSnapshotRepository = {
      load: async () => snapshot,
      save: async () => undefined,
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTodoWorkspace({
          repository,
          adapter,
        }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.noteTitle).toBe('Hydrated note');
    });

    const multiBlockSelectionEnd = result.current.blocks[1]?.range.end ?? 0;

    act(() => {
      result.current.updateSelection(0, multiBlockSelectionEnd);
    });

    expect(result.current.selectedBlockIds.length).toBeGreaterThan(1);

    act(() => {
      result.current.regenerateSelectedBlocks();
    });

    const selectedBlockIds = result.current.selectedBlockIds;

    await waitFor(() => {
      expect(adapter.calls).toHaveLength(selectedBlockIds.length);
    });

    const calledBlockIds = adapter.calls.map((call) => call.focusBlocks[0]?.id);
    expect(calledBlockIds).toEqual(selectedBlockIds);
  });

  it('keeps block ranges aligned with note text when a queued parse survives a comment-only edit', async () => {
    const snapshot = createSnapshotWithText('// note\n\n디자인 누락된거 더블체크!');
    const queryClient = createTodoQueryClient();
    const adapter = new RecordingTodoExtractionAdapter();
    const repository: WorkspaceSnapshotRepository = {
      load: async () => snapshot,
      save: async () => undefined,
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useTodoWorkspace({
          repository,
          adapter,
        }),
      {
        wrapper,
      },
    );

    await waitFor(() => {
      expect(result.current.noteTitle).toBe('Hydrated note');
    });

    act(() => {
      result.current.setNoteText('// note\n\n디자인 누락된거 더블체크');
    });

    act(() => {
      result.current.setNoteText('// xnote\n\n디자인 누락된거 더블체크');
    });

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1100);
      });
    });

    await waitFor(() => {
      expect(adapter.calls).toHaveLength(1);
    });

    const targetBlock = result.current.blocks.find((block) => block.text === '디자인 누락된거 더블체크');

    expect(targetBlock).toBeTruthy();

    if (typeof targetBlock === 'undefined') {
      throw new Error('Expected target block to exist');
    }

    expect(
      result.current.noteText.slice(targetBlock.range.start, targetBlock.range.end),
    ).toBe(targetBlock.text);
  });
});
