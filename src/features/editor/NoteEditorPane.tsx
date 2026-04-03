import { useState } from 'react';
import type { AnalysisHighlight, DisplayHighlight, NoteBlock } from '../../domain/models';
import { buildDecoratedText } from './buildDecoratedText';

interface NoteEditorPaneProps {
  noteText: string;
  blocks: NoteBlock[];
  displayHighlights: DisplayHighlight[];
  analysisHighlights: AnalysisHighlight[];
  onTextChange: (value: string) => void;
  onSelectionChange: (selectionStart: number, selectionEnd: number) => void;
}

function getBlockStatusLabel(status: NoteBlock['parseStatus']): string {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'parsing':
      return 'parsing';
    case 'updated':
      return 'updated';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

export function NoteEditorPane(props: NoteEditorPaneProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const decoratedSegments = buildDecoratedText(
    props.noteText,
    props.displayHighlights,
    props.analysisHighlights,
  );

  return (
    <section className="flex min-h-[38rem] flex-col rounded-[28px] border border-white/10 bg-slate-900/65 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Source Note</p>
          <p className="mt-1 text-sm text-slate-300">
            Editable note is the single source of truth.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {props.blocks.map((block, index) => (
            <span
              key={block.id}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300"
            >
              B{index + 1} {getBlockStatusLabel(block.parseStatus)}
            </span>
          ))}
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden px-5 py-5">
        <div className="relative h-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80">
          <div className="pointer-events-none absolute inset-0 overflow-hidden px-5 py-5">
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
            className="relative z-10 h-full w-full resize-none bg-transparent px-5 py-5 font-mono text-[15px] leading-7 text-slate-100 outline-none caret-sky-300 [overflow-wrap:anywhere]"
          />
        </div>
      </div>
    </section>
  );
}
