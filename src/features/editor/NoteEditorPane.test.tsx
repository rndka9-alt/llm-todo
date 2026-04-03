import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteEditorPane } from './NoteEditorPane';

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const entry: ResizeObserverEntry = {
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    };

    this.callback(
      [entry],
      this,
    );
  }

  disconnect() {}

  unobserve() {}
}

describe('NoteEditorPane', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const clientWidthSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'clientWidth', 'get');

  beforeEach(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
    clientWidthSpy.mockReturnValue(312);
  });

  afterEach(() => {
    clientWidthSpy.mockReset();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('syncs the mirror layer width to the textarea client width', () => {
    const { container } = render(
      <NoteEditorPane
        noteText={'회의도 가야한다..!!\n\n진짜 가야함'}
        displayHighlights={[
          {
            id: 'todo-1:highlight:0',
            todoId: 'todo-1',
            blockId: 'block-1',
            range: {
              start: 0,
              end: 12,
            },
            colorToken: 'bg-amber-300/30',
            accentToken: 'bg-amber-300',
          },
        ]}
        analysisHighlights={[]}
        onTextChange={() => undefined}
        onSelectionChange={() => undefined}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      'Write freeform notes here. TODOs will be derived on the left.',
    );
    const mirror = container.querySelector('.note-editor-mirror');

    expect(textarea).toBeTruthy();
    expect(mirror).toBeTruthy();
    expect(mirror?.getAttribute('style')).toContain('width: 312px');
  });
});
