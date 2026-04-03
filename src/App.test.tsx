import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MockTodoExtractionAdapter } from './adapters/llm/mockTodoExtractionAdapter';
import App from './App';
import type { WorkspaceSnapshotRepository } from './features/workspace/workspacePersistence';

const repository: WorkspaceSnapshotRepository = {
  load: async () => null,
  save: async () => undefined,
};

describe('App', () => {
  it('renders extracted todos and refreshes them after note edits', async () => {
    render(<App adapter={new MockTodoExtractionAdapter()} repository={repository} />);
    expect(screen.queryByText('LLM TODO PoC')).toBeNull();
    expect(screen.queryByPlaceholderText('Untitled note')).toBeNull();
    expect(screen.queryByText('Derived TODOs')).toBeNull();
    expect(screen.queryByText('Source Note')).toBeNull();
    expect(screen.getByText(/state:/i)).toBeTruthy();
    expect(screen.getByText(/updated:/i)).toBeTruthy();
    expect(screen.getByText(/^\d+\s+todos$/i)).toBeTruthy();

    expect(
      await screen.findByText('Fix the mobile settings bug before Friday #frontend', {}, {
        timeout: 2000,
      }),
    ).toBeTruthy();

    const editor = screen.getByPlaceholderText(
      'Write freeform notes here. TODOs will be derived on the left.',
    );

    fireEvent.change(editor, {
      target: {
        value:
          'Kickoff notes\nNeed to book the launch room tomorrow.\n\nLaunch prep\n- Fix the mobile settings bug before Friday #frontend',
      },
    });

    expect(
      await screen.findByText('book the launch room tomorrow', {}, {
        timeout: 2000,
      }),
    ).toBeTruthy();
  });
});
