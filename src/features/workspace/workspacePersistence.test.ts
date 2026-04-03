import { describe, expect, it } from 'vitest';
import { createInitialWorkspaceState } from './workspaceState';
import { createPersistedSnapshot, restoreWorkspaceState } from './workspacePersistence';

describe('workspacePersistence', () => {
  it('drops transient parsing state from persisted snapshots', () => {
    const state = createInitialWorkspaceState(10);
    const snapshot = createPersistedSnapshot({
      ...state,
      parseState: 'parsing',
      blocks: state.blocks.map((block, index) => ({
        ...block,
        parseStatus: index === 0 ? 'parsing' : 'queued',
      })),
    }, 20);

    expect(snapshot.interpretations).toEqual([]);
    expect(snapshot.blocks.map((block) => block.parseStatus)).toEqual(['idle', 'idle', 'idle']);
  });

  it('restores stable workspace data and resets transient ui state', () => {
    const state = createInitialWorkspaceState(10);
    const snapshot = createPersistedSnapshot({
      ...state,
      noteTitle: 'Saved note',
      checkedTodoIds: ['todo-1'],
      activeTodoId: 'todo-2',
      focusNonce: 99,
      interpretations: [
        {
          blockId: state.blocks[0]?.id ?? 'missing',
          todos: [],
        },
      ],
    }, 20);

    const restored = restoreWorkspaceState(snapshot, 30);

    expect(restored.noteTitle).toBe('Saved note');
    expect(restored.checkedTodoIds).toEqual(['todo-1']);
    expect(restored.activeTodoId).toBeNull();
    expect(restored.focusNonce).toBe(0);
    expect(restored.parseState).toBe('updated');
  });
});
