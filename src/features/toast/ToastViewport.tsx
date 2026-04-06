import type { ToastItem } from './useToastQueue';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastViewport(props: ToastViewportProps) {
  if (props.toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-xl flex-col gap-2">
        {props.toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between rounded-2xl border border-error/20 bg-surface/95 px-4 py-3 text-sm text-content-base shadow-toast backdrop-blur"
          >
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => {
                props.onDismiss(toast.id);
              }}
              className="ml-4 rounded-full border border-separator/10 px-2 py-1 text-xs text-content-subtle"
            >
              닫기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
