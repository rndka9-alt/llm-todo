import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { TodoExtractionAdapter } from "./adapters/llm/todoExtractionAdapter";
import { NoteEditorPane } from "./features/editor/NoteEditorPane";
import { TodoListPane } from "./features/todos/TodoListPane";
import { ToastViewport } from "./features/toast/ToastViewport";
import { useToastQueue } from "./features/toast/useToastQueue";
import { useTodoWorkspace } from "./features/workspace/useTodoWorkspace";
import type { WorkspaceSnapshotRepository } from "./features/workspace/workspacePersistence";
import { createTodoQueryClient } from "./lib/queryClient";

interface AppProps {
  adapter?: TodoExtractionAdapter;
  repository?: WorkspaceSnapshotRepository;
}

function AppScreen(props: AppProps) {
  const toastQueue = useToastQueue();
  const workspace = useTodoWorkspace({
    ...(typeof props.adapter === "undefined" ? {} : { adapter: props.adapter }),
    ...(typeof props.repository === "undefined"
      ? {}
      : { repository: props.repository }),
    onExtractionError: toastQueue.pushToast,
  });

  return (
    <>
      <div className="h-screen overflow-hidden bg-surface text-content">
        <div className="flex h-full w-full flex-col">
          <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1.2fr)_minmax(0,0.8fr)] min-[700px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] min-[700px]:grid-rows-1">
            <div className="min-h-0 border-b border-separator/10 min-[700px]:order-2 min-[700px]:border-b-0 min-[700px]:border-l min-[700px]:border-separator/10">
              <NoteEditorPane
                noteText={workspace.noteText}
                displayHighlights={workspace.displayHighlights}
                analysisHighlights={workspace.analysisHighlights}
                selectedBlockIds={workspace.selectedBlockIds}
                selectionRange={workspace.selectedTextRange}
                onTextChange={workspace.setNoteText}
                onSelectionChange={workspace.updateSelection}
                onRegenerateSelection={workspace.regenerateSelectedBlocks}
                onRemoveSelection={workspace.removeSelectedBlockInterpretations}
                focusRange={workspace.editorFocusRange}
                focusNonce={workspace.editorFocusNonce}
              />
            </div>

            <div className="min-h-0 min-[700px]:order-1">
              <TodoListPane
                todos={workspace.todos}
                activeTodoId={workspace.activeTodoId}
                focusNonce={workspace.focusNonce}
                checkedTodoIds={workspace.checkedTodoIds}
                onToggleTodo={workspace.toggleTodo}
                onNavigateToSource={workspace.navigateToTodoSource}
              />
            </div>
          </main>
        </div>
      </div>
      <ToastViewport
        toasts={toastQueue.toasts}
        onDismiss={toastQueue.dismissToast}
      />
    </>
  );
}

export default function App(props: AppProps) {
  const [queryClient] = useState(createTodoQueryClient);
  const screenProps: AppProps = {
    ...(typeof props.adapter === "undefined" ? {} : { adapter: props.adapter }),
    ...(typeof props.repository === "undefined"
      ? {}
      : { repository: props.repository }),
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppScreen {...screenProps} />
    </QueryClientProvider>
  );
}
