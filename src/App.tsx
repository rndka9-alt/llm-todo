import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { NoteEditorPane } from './features/editor/NoteEditorPane';
import { TodoListPane } from './features/todos/TodoListPane';
import { ToastViewport } from './features/toast/ToastViewport';
import { useToastQueue } from './features/toast/useToastQueue';
import { useTodoWorkspace } from './features/workspace/useTodoWorkspace';
import { createTodoQueryClient } from './lib/queryClient';

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

function AppScreen() {
  const toastQueue = useToastQueue();
  const workspace = useTodoWorkspace({
    onExtractionError: toastQueue.pushToast,
  });

  return (
    <>
      <div className="h-screen overflow-hidden px-4 py-4 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
          <header className="flex flex-wrap items-center gap-3 rounded-[28px] border border-white/10 bg-slate-900/65 px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              state: <span className="text-sky-200">{workspace.parseState}</span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              updated: {formatUpdatedLabel(workspace.lastUpdatedAt)}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {workspace.todos.length} todos
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-x-auto pb-1">
            <main className="grid h-full min-h-0 min-w-[60rem] grid-cols-[minmax(20rem,0.9fr)_minmax(32rem,1.4fr)] gap-4">
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
      <ToastViewport toasts={toastQueue.toasts} onDismiss={toastQueue.dismissToast} />
    </>
  );
}

export default function App() {
  const [queryClient] = useState(createTodoQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AppScreen />
    </QueryClientProvider>
  );
}
