import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TextRange, TodoProjectionItem } from '../../domain/models';

interface TodoListPaneProps {
  todos: TodoProjectionItem[];
  activeTodoId: string | null;
  focusNonce: number;
  checkedTodoIds: string[];
  onToggleTodo: (todoId: string) => void;
  onNavigateToSource: (range: TextRange) => void;
}

export function TodoListPane(props: TodoListPaneProps) {
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [flashedTodoId, setFlashedTodoId] = useState<string | null>(null);

  useEffect(() => {
    if (props.activeTodoId === null) {
      return;
    }

    const node = itemRefs.current.get(props.activeTodoId);

    if (node) {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }

    setFlashedTodoId(props.activeTodoId);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setFlashedTodoId(null);
    }, 1200);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [props.activeTodoId, props.focusNonce]);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <ol className="space-y-2 px-4 py-4">
          {props.todos.map((todo) => {
            const isChecked = props.checkedTodoIds.includes(todo.id);
            const isActive = props.activeTodoId === todo.id;
            const isFlashed = flashedTodoId === todo.id;
            const checkboxId = `todo-checkbox-${todo.id}`;

            return (
              <li
                key={todo.id}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(todo.id, node);
                  } else {
                    itemRefs.current.delete(todo.id);
                  }
                }}
                className={[
                  'rounded-2xl transition-all duration-700',
                  isActive || isFlashed
                    ? 'bg-accent-soft/10'
                    : 'bg-transparent',
                ].join(' ')}
                style={{
                  marginLeft: `${todo.depth * 14}px`,
                }}
              >
                <div className="flex items-start gap-3">
                  <label className="flex min-w-0 flex-1 cursor-default items-start gap-3">
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id={checkboxId}
                        name={checkboxId}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => props.onToggleTodo(todo.id)}
                        className="h-4 w-4 rounded border-separator/20 bg-surface text-accent"
                      />
                      <span
                        className={[
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          todo.accentToken,
                        ].join(' ')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          'whitespace-pre-wrap break-words text-sm text-content-base transition-opacity [overflow-wrap:anywhere]',
                          isChecked ? 'line-through opacity-50' : 'opacity-100',
                        ].join(' ')}
                      >
                        {todo.title}
                      </p>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => props.onNavigateToSource(todo.displayRange)}
                    className="shrink-0 pt-1 text-content-faint transition-colors hover:text-accent"
                    aria-label="노트에서 원문 보기"
                  >
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        {props.todos.length === 0 ? (
          <div className="px-4 py-6 text-sm text-content-muted">
            No extracted TODOs yet. Keep writing on the right.
          </div>
        ) : null}
      </div>
    </section>
  );
}
