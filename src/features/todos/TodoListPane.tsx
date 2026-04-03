import { useEffect, useRef, useState } from 'react';
import type { TodoProjectionItem } from '../../domain/models';

interface TodoListPaneProps {
  todos: TodoProjectionItem[];
  activeTodoId: string | null;
  focusNonce: number;
  checkedTodoIds: string[];
  onToggleTodo: (todoId: string) => void;
}

function renderPriority(priority: TodoProjectionItem['priority']): string | null {
  if (priority === 'high') {
    return 'high';
  }

  if (priority === 'medium') {
    return 'medium';
  }

  if (priority === 'low') {
    return 'low';
  }

  return null;
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
    <section className="flex min-h-[38rem] flex-col rounded-[28px] border border-white/10 bg-slate-900/65 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
      <header className="border-b border-white/10 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Derived TODOs</p>
        <p className="mt-1 text-sm text-slate-300">
          Source order first. Projection only. No manual authoring here.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ol className="space-y-2">
          {props.todos.map((todo) => {
            const isChecked = props.checkedTodoIds.includes(todo.id);
            const isActive = props.activeTodoId === todo.id;
            const isFlashed = flashedTodoId === todo.id;
            const priority = renderPriority(todo.priority);

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
                  'rounded-2xl border px-3 py-3 transition-all duration-700',
                  isActive || isFlashed
                    ? 'border-sky-300/60 bg-sky-200/12 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]'
                    : 'border-white/8 bg-white/[0.03]',
                ].join(' ')}
                style={{
                  marginLeft: `${todo.depth * 14}px`,
                }}
              >
                <label className="flex cursor-default items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => props.onToggleTodo(todo.id)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-300"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'h-2.5 w-2.5 rounded-full',
                          todo.accentToken,
                        ].join(' ')}
                      />
                      <p
                        className={[
                          'truncate text-sm text-slate-100 transition-opacity',
                          isChecked ? 'line-through opacity-50' : 'opacity-100',
                        ].join(' ')}
                      >
                        {todo.title}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {priority ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                          {priority}
                        </span>
                      ) : null}
                      {todo.dueDate ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                          {todo.dueDate}
                        </span>
                      ) : null}
                      {todo.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ol>

        {props.todos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
            No extracted TODOs yet. Keep writing on the right.
          </div>
        ) : null}
      </div>
    </section>
  );
}
