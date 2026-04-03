import { useLayoutEffect, useRef, useState } from 'react';
import type { AnalysisHighlight, DisplayHighlight } from '../../domain/models';
import { buildDecoratedText } from './buildDecoratedText';

interface NoteEditorPaneProps {
  noteText: string;
  displayHighlights: DisplayHighlight[];
  analysisHighlights: AnalysisHighlight[];
  onTextChange: (value: string) => void;
  onSelectionChange: (selectionStart: number, selectionEnd: number) => void;
}

export function NoteEditorPane(props: NoteEditorPaneProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [mirrorWidth, setMirrorWidth] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorFieldId = 'note-editor-input';
  const editorFieldName = 'noteText';
  const decoratedSegments = buildDecoratedText(
    props.noteText,
    props.displayHighlights,
    props.analysisHighlights,
  );
  const editorTextClassName =
    'min-h-full whitespace-pre-wrap break-words px-4 py-4 font-mono text-[15px] leading-7 [overflow-wrap:anywhere]';

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (textarea === null) {
      return;
    }

    function syncMirrorWidth() {
      setMirrorWidth((currentWidth) => {
        if (currentWidth === textarea.clientWidth) {
          return currentWidth;
        }

        return textarea.clientWidth;
      });
    }

    syncMirrorWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncMirrorWidth();
    });

    observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (textarea === null) {
      return;
    }

    setMirrorWidth((currentWidth) => {
      if (currentWidth === textarea.clientWidth) {
        return currentWidth;
      }

      return textarea.clientWidth;
    });
  }, [props.noteText]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className={`${editorTextClassName} note-editor-mirror text-transparent`}
              style={{
                transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
                width: mirrorWidth === null ? undefined : `${mirrorWidth}px`,
              }}
            >
              {decoratedSegments.map((segment) => (
                <span key={segment.key} className={segment.className}>
                  {segment.text}
                </span>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            id={editorFieldId}
            name={editorFieldName}
            value={props.noteText}
            onChange={(event) => {
              props.onTextChange(event.currentTarget.value);
              props.onSelectionChange(
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );
            }}
            onSelect={(event) => {
              props.onSelectionChange(
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );
            }}
            onKeyUp={(event) => {
              props.onSelectionChange(
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );
            }}
            onClick={(event) => {
              props.onSelectionChange(
                event.currentTarget.selectionStart,
                event.currentTarget.selectionEnd,
              );
            }}
            onScroll={(event) => {
              setScrollTop(event.currentTarget.scrollTop);
              setScrollLeft(event.currentTarget.scrollLeft);
            }}
            placeholder="Write freeform notes here. TODOs will be derived on the left."
            spellCheck={false}
            className={`scrollbar-hidden relative z-10 h-full w-full resize-none bg-transparent ${editorTextClassName} text-slate-100 outline-none caret-sky-300`}
          />
        </div>
      </div>
    </section>
  );
}
