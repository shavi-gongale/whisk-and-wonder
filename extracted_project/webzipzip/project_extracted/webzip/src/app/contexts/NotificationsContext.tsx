import { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface Notification {
  id: string;
  type: "order" | "promo" | "review" | "system";
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  icon: string;
}

interface NotificationsCtx {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "date" | "isRead">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "ww_notifications_v1";

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "promo",
    title: "Welcome to Whisk & Wonder! 🎉",
    message: "Use code WELCOME10 for 10% off your first order. Happy baking adventures await!",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    icon: "🎊",
  },
  {
    id: "n2",
    type: "order",
    title: "Your Order is Out for Delivery!",
    message: "Your Triple Chocolate Cake (Order #ORD-4821) is on its way. Expected delivery in 30–45 minutes.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    icon: "🚚",
  },
  {
    id: "n3",
    type: "system",
    title: "New Arrivals: Summer Collection",
    message: "Fresh mango cheesecakes, coconut lime tarts, and passion fruit donuts are now available. Limited stock!",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    icon: "🌟",
  },
  {
    id: "n4",
    type: "review",
    title: "Owner Replied to Your Review",
    message: "Whisk & Wonder replied: \"Thank you so much! We're thrilled you loved the rose & pistachio donuts. See you soon! 💕\"",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    icon: "💬",
  },
  {
    id: "n5",
    type: "promo",
    title: "Festive Season Offer 🪔",
    message: "Celebrate with FESTIVE50 — get up to ₹800 off on orders above ₹2000. Valid through the festive season only!",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    icon: "🎁",
  },
];

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_NOTIFICATIONS;
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch { /* ignore */ }
}

const Ctx = createContext<NotificationsCtx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  useEffect(() => { saveNotifications(notifications); }, [notifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "date" | "isRead">) => {
      const newNotification: Notification = {
        ...n,
        id: `notif_${Date.now()}`,
        date: new Date().toISOString(),
        isRead: false,
      };
      setNotifications(prev => [newNotification, ...prev]);
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
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
