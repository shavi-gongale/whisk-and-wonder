import { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id:      string;
  message: string;
  type:    ToastType;
}

interface ToastCtx {
  toasts:  Toast[];
  toast:   (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `t_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    if (type !== "loading") {
      setTimeout(() => dismiss(id), 3800);
    }
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
