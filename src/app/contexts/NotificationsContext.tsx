import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { notificationsApi } from "../../lib/api";

export interface Notification {
  id: string;
  type: "order" | "promo" | "review" | "system";
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  icon?: string;
  data?: Record<string, unknown>;
}

interface NotificationsCtx {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "date" | "isRead">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const Ctx = createContext<NotificationsCtx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(() => {
    if (!localStorage.getItem("ww_token")) return;
    notificationsApi.list()
      .then(remote => setNotifications(remote as Notification[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "date" | "isRead">) => {
      const newNotification: Notification = {
        ...n,
        id: `local_${Date.now()}`,
        date: new Date().toISOString(),
        isRead: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
      // Order-created notifications are persisted by the server. This local entry
      // only keeps the immediate guest-checkout confirmation visible.
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    if (!id.startsWith("local_")) notificationsApi.markRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    notificationsApi.markAllRead().catch(() => {});
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    // Deleting is intentionally per notification on the server; clear the
    // current view after marking persisted records read.
  }, []);

  return (
    <Ctx.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be inside NotificationsProvider");
  return ctx;
}
