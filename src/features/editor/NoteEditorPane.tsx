import { useState } from 'react';
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
  const editorFieldId = 'note-editor-input';
  const editorFieldName = 'noteText';
  const decoratedSegments = buildDecoratedText(
    props.noteText,
    props.displayHighlights,
    props.analysisHighlights,
  );

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="relative h-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden px-4 py-4">
            <div
              className="min-h-full whitespace-pre-wrap break-words font-mono text-[15px] leading-7 text-transparent [overflow-wrap:anywhere]"
              style={{
                transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
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
            className="relative z-10 h-full w-full resize-none bg-transparent px-4 py-4 font-mono text-[15px] leading-7 text-slate-100 outline-none caret-sky-300 [overflow-wrap:anywhere]"
          />
        </div>
      </div>
    </section>
  );
}
