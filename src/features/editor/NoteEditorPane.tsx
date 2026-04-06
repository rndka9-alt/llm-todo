import { RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  onRemoveSelection: () => void;
  focusRange: TextRange | null;
  focusNonce: number;
}

export function NoteEditorPane(props: NoteEditorPaneProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [mirrorWidth, setMirrorWidth] = useState<number | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const selectionMarkerRef = useRef<HTMLSpanElement | null>(null);
  const editorFieldId = 'note-editor-input';
  const editorFieldName = 'noteText';
  const visibleDisplayHighlights = props.displayHighlights.filter(
    (dh) => !props.analysisHighlights.some((ah) => dh.range.start < ah.range.end && ah.range.start < dh.range.end),
  );
  const decoratedSegments = buildDecoratedText(
    props.noteText,
    visibleDisplayHighlights,
    [],
  );
  const analysisOverlaySegments = buildDecoratedText(
    props.noteText,
    [],
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

  // // 자동 이어쓰기 후 커서 위치 복원
  useLayoutEffect(() => {
    const pos = pendingCursorRef.current;

    if (pos === null) {
      return;
    }

    pendingCursorRef.current = null;

    const textarea = textareaRef.current;

    if (textarea === null) {
      return;
    }

    textarea.setSelectionRange(pos, pos);
    props.onSelectionChange(pos, pos);
  }, [props.noteText]); // eslint-disable-line react-hooks/exhaustive-deps

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
              Math.max(8, mirrorWidth - 320),
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.metaKey || event.ctrlKey) {
      return;
    }

    const textarea = event.currentTarget;
    const { value, selectionStart, selectionEnd } = textarea;

    if (selectionStart !== selectionEnd) {
      return;
    }

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const currentLine = value.slice(lineStart, selectionStart);

    const match = currentLine.match(/^(\s*\/\/)/);

    if (match === null) {
      return;
    }

    const commentPrefix = match[1]!;
    const afterComment = currentLine.slice(commentPrefix.length);

    // // 뒤에 실질적 내용이 있을 때만 자동 이어쓰기
    if (afterComment.trimStart().length === 0) {
      return;
    }

    event.preventDefault();

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);
    const insertion = '\n' + commentPrefix + ' ';
    const newValue = before + insertion + after;

    pendingCursorRef.current = selectionStart + insertion.length;
    props.onTextChange(newValue);
  }

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

  useEffect(() => {
    function handleSelectionChange() {
      const textarea = textareaRef.current;

      if (textarea === null || document.activeElement !== textarea) {
        return;
      }

      props.onSelectionChange(textarea.selectionStart, textarea.selectionEnd);
    }

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  });

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea === null || props.focusRange === null || props.focusNonce === 0) {
      return;
    }

    const { start, end } = props.focusRange;

    // 커서를 끝에 놓아 브라우저가 해당 위치로 스크롤하도록 유도
    textarea.focus();
    textarea.setSelectionRange(end, end);

    // 스크롤 완료 후 셀렉션 확장
    requestAnimationFrame(() => {
      textarea.setSelectionRange(start, end);
      props.onSelectionChange(start, end);
    });
  }, [props.focusNonce]); // eslint-disable-line react-hooks/exhaustive-deps

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
              className="pointer-events-none absolute z-20 transition-[top,left] duration-150 ease-out"
              style={{
                left: `${selectionAnchor.left}px`,
                top: `${selectionAnchor.top}px`,
              }}
            >
              <div className="pointer-events-auto inline-flex items-center rounded-full border border-sky-300/35 bg-slate-900/95 shadow-[0_10px_30px_rgba(2,6,23,0.45)]">
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    props.onRegenerateSelection();
                    clearTextareaSelection();
                  }}
                  className="inline-flex items-center gap-2 rounded-l-full px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-white/10"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                  <span>재생성하기</span>
                </button>
                <span className="h-4 w-px bg-sky-300/25" />
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    props.onRemoveSelection();
                    clearTextareaSelection();
                  }}
                  className="inline-flex items-center gap-2 rounded-r-full px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-white/10"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                  <span>투두 제거하기</span>
                </button>
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            id={editorFieldId}
            name={editorFieldName}
            value={props.noteText}
            onKeyDown={handleKeyDown}
            onChange={(event) => {
              props.onTextChange(event.currentTarget.value);
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

          {props.analysisHighlights.length > 0 ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden animate-pulse">
              <div
                className={`${editorTextClassName} text-transparent`}
                style={{
                  transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
                  width: mirrorWidth === null ? undefined : `${mirrorWidth}px`,
                }}
              >
                {analysisOverlaySegments.map((segment) => (
                  <span key={segment.key} className={segment.className}>
                    {segment.text}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
