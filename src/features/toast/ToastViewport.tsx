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
            className="pointer-events-auto flex items-center justify-between rounded-2xl border border-rose-200/20 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-[0_18px_48px_rgba(15,23,42,0.4)] backdrop-blur"
          >
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => {
                props.onDismiss(toast.id);
              }}
              className="ml-4 rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300"
            >
              닫기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
