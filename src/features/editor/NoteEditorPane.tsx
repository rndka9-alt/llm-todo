import { RefreshCw } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { AnalysisHighlight, DisplayHighlight, TextRange } from '../../domain/models';
import { buildDecoratedText } from './buildDecoratedText';

interface NoteEditorPaneProps {
  noteText: string;
  displayHighlights: DisplayHighlight[];
  analysisHighlights: AnalysisHighlight[];
  selectedBlockIds: string[];
  selectionRange: TextRange | null;
  onTextChange: (value: string) => void;
  onSelectionChange: (selectionStart: number, selectionEnd: number) => void;
  onRegenerateSelection: () => void;
}

export function NoteEditorPane(props: NoteEditorPaneProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [mirrorWidth, setMirrorWidth] = useState<number | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionMarkerRef = useRef<HTMLSpanElement | null>(null);
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

    const currentTextarea = textarea;

    function syncMirrorWidth() {
      const nextWidth = currentTextarea.clientWidth;

      setMirrorWidth((currentWidth) => {
        if (currentWidth === nextWidth) {
          return currentWidth;
        }

        return nextWidth;
      });
    }

    syncMirrorWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncMirrorWidth();
    });

    observer.observe(currentTextarea);

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
      const nextWidth = textarea.clientWidth;

      if (currentWidth === nextWidth) {
        return currentWidth;
      }

      return nextWidth;
    });
  }, [props.noteText]);

  useLayoutEffect(() => {
    if (props.selectionRange === null || props.selectedBlockIds.length === 0) {
      setSelectionAnchor(null);
      return;
    }

    const marker = selectionMarkerRef.current;

    if (marker === null) {
      setSelectionAnchor(null);
      return;
    }

    const nextAnchor = {
      top: Math.max(8, marker.offsetTop - scrollTop - 44),
      left:
        mirrorWidth === null
          ? Math.max(8, marker.offsetLeft - scrollLeft)
          : Math.min(
              Math.max(8, marker.offsetLeft - scrollLeft),
              Math.max(8, mirrorWidth - 168),
            ),
    };

    setSelectionAnchor((currentAnchor) => {
      if (
        currentAnchor !== null &&
        currentAnchor.top === nextAnchor.top &&
        currentAnchor.left === nextAnchor.left
      ) {
        return currentAnchor;
      }

      return nextAnchor;
    });
  }, [mirrorWidth, props.noteText, props.selectedBlockIds, props.selectionRange, scrollLeft, scrollTop]);

  function clearTextareaSelection() {
    const textarea = textareaRef.current;

    if (textarea === null) {
      return;
    }

    const collapseIndex = props.selectionRange?.end ?? textarea.selectionEnd;

    textarea.focus();
    textarea.setSelectionRange(collapseIndex, collapseIndex);
    props.onSelectionChange(collapseIndex, collapseIndex);
  }

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

          {props.selectionRange !== null && props.selectedBlockIds.length > 0 ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-0">
              <div
                className={`${editorTextClassName} absolute left-0 top-0 text-transparent`}
                style={{
                  width: mirrorWidth === null ? undefined : `${mirrorWidth}px`,
                }}
              >
                {props.noteText.slice(0, props.selectionRange.start)}
                <span ref={selectionMarkerRef} className="inline-block h-7 w-0 align-top" />
                {props.noteText.slice(props.selectionRange.start)}
              </div>
            </div>
          ) : null}

          {selectionAnchor !== null && props.selectedBlockIds.length > 0 ? (
            <div
              className="pointer-events-none absolute z-20"
              style={{
                left: `${selectionAnchor.left}px`,
                top: `${selectionAnchor.top}px`,
              }}
            >
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  props.onRegenerateSelection();
                  clearTextareaSelection();
                }}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-slate-900/95 px-3 py-2 text-xs font-medium text-sky-100 shadow-[0_10px_30px_rgba(2,6,23,0.45)] transition hover:border-sky-200/50 hover:bg-slate-900"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                <span>재생성하기</span>
              </button>
            </div>
          ) : null}

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
