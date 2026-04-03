import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders extracted todos and refreshes them after note edits', async () => {
    vi.useFakeTimers();

    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(screen.getByText('Fix the mobile settings bug before Friday #frontend')).toBeTruthy();

    const editor = screen.getByPlaceholderText(
      'Write freeform notes here. TODOs will be derived on the left.',
    );

    fireEvent.change(editor, {
      target: {
        value:
          'Kickoff notes\nNeed to book the launch room tomorrow.\n\nLaunch prep\n- Fix the mobile settings bug before Friday #frontend',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(screen.getByText('book the launch room tomorrow')).toBeTruthy();

    vi.useRealTimers();
  });
});
