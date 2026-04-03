import { useEffect, useRef, useState } from 'react';

export interface ToastItem {
  id: number;
  message: string;
}

export function useToastQueue(autoDismissMs: number = 3200) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timerMapRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  function dismissToast(id: number) {
    const timerId = timerMapRef.current.get(id);

    if (typeof timerId !== 'undefined') {
      clearTimeout(timerId);
      timerMapRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function pushToast(message: string) {
    const id = nextIdRef.current;

    nextIdRef.current += 1;

    setToasts((current) => [...current, { id, message }]);

    const timerId = setTimeout(() => {
      dismissToast(id);
    }, autoDismissMs);

    timerMapRef.current.set(id, timerId);
  }

  useEffect(() => {
    return () => {
      timerMapRef.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      timerMapRef.current.clear();
    };
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
