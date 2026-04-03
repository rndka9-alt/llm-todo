import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders extracted todos and refreshes them after note edits', async () => {
    render(<App />);
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
