import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { MockTodoExtractionAdapter } from '../../adapters/llm/mockTodoExtractionAdapter';
import { createTodoQueryClient } from '../../lib/queryClient';
import type { PersistedWorkspaceSnapshot, WorkspaceSnapshotRepository } from './workspacePersistence';
import { createPersistedSnapshot } from './workspacePersistence';
import { createInitialWorkspaceState } from './workspaceState';
import { useTodoWorkspace } from './useTodoWorkspace';

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
});
