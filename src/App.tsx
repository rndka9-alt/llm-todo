import { NoteEditorPane } from './features/editor/NoteEditorPane';
import { TodoListPane } from './features/todos/TodoListPane';
import { useTodoWorkspace } from './features/workspace/useTodoWorkspace';

function formatUpdatedLabel(timestamp: number | null): string {
  if (timestamp === null) {
    return 'waiting';
  }

  const formatter = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return formatter.format(timestamp);
}

export default function App() {
  const workspace = useTodoWorkspace();

  return (
    <div className="min-h-screen px-4 py-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-900/65 px-5 py-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200/70">LLM TODO PoC</p>
            <input
              value={workspace.noteTitle}
              onChange={(event) => {
                workspace.setNoteTitle(event.currentTarget.value);
              }}
              className="mt-2 w-full bg-transparent text-2xl font-semibold tracking-tight text-white outline-none placeholder:text-slate-500"
              placeholder="Untitled note"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              state: <span className="text-sky-200">{workspace.parseState}</span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              updated: {formatUpdatedLabel(workspace.lastUpdatedAt)}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {workspace.todos.length} todos
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto pb-1">
          <main className="grid min-h-full min-w-[60rem] grid-cols-[minmax(20rem,0.9fr)_minmax(32rem,1.4fr)] gap-4">
            <TodoListPane
              todos={workspace.todos}
              activeTodoId={workspace.activeTodoId}
              focusNonce={workspace.focusNonce}
              checkedTodoIds={workspace.checkedTodoIds}
              onToggleTodo={workspace.toggleTodo}
            />

            <NoteEditorPane
              noteText={workspace.noteText}
              blocks={workspace.blocks}
              displayHighlights={workspace.displayHighlights}
              analysisHighlights={workspace.analysisHighlights}
              onTextChange={workspace.setNoteText}
              onSelectionChange={workspace.updateSelection}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
