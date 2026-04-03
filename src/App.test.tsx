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
    const { container } = render(
      <App adapter={new MockTodoExtractionAdapter()} repository={repository} />,
    );
    expect(screen.queryByText('LLM TODO PoC')).toBeNull();
    expect(screen.queryByPlaceholderText('Untitled note')).toBeNull();
    expect(screen.queryByText('Derived TODOs')).toBeNull();
    expect(screen.queryByText('Source Note')).toBeNull();
    expect(screen.getByText(/state:/i)).toBeTruthy();
    expect(screen.getByText(/updated:/i)).toBeTruthy();
    expect(screen.getByText(/^\d+\s+todos$/i)).toBeTruthy();
    const main = container.querySelector('main');
    expect(main?.className).toContain('grid-cols-1');
    expect(main?.className).toContain('min-[700px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]');
    expect(main?.className).not.toContain('min-w-[60rem]');

    const todoTitle = await screen.findByText('Fix the mobile settings bug before Friday #frontend', {}, {
      timeout: 2000,
    });
    expect(todoTitle).toBeTruthy();
    expect(todoTitle.className).toContain('whitespace-pre-wrap');
    expect(todoTitle.className).not.toContain('truncate');
    const checkbox = screen.getAllByRole('checkbox')[0];
    const indicator = checkbox.parentElement?.querySelector('span');
    expect(checkbox.parentElement?.className).toContain('items-center');
    expect(checkbox.parentElement?.className).toContain('pt-1');
    expect(indicator?.className).toContain('shrink-0');
    expect(container.querySelector('ol')?.className).toContain('space-y-2');
    expect(container.querySelector('ol')?.parentElement?.className).toContain('scrollbar-hidden');
    expect(container.querySelector('ol')?.textContent).not.toContain('high');

    const editor = screen.getByPlaceholderText(
      'Write freeform notes here. TODOs will be derived on the left.',
    );
    expect(editor.getAttribute('id')).toBe('note-editor-input');
    expect(editor.getAttribute('name')).toBe('noteText');

    expect(checkbox.getAttribute('id')).toBeTruthy();
    expect(checkbox.getAttribute('name')).toBe(checkbox.getAttribute('id'));

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
