import { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface OrderItem {
  id: string;
  name: string;
  imgId: string;
  price: number;
  quantity: number;
  size?: string;
}

export type OrderStatus =
  | "Order Confirmed"
  | "Preparing"
  | "Baking"
  | "Decorating"
  | "Packaging"
  | "Out For Delivery"
  | "Delivered";

export interface TrackingStep {
  step: OrderStatus;
  completedAt?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  date: string;
  status: OrderStatus;
  statusUpdatedAt: string;
  address: string;
  paymentMethod: string;
  trackingSteps: TrackingStep[];
  estimatedDelivery: string;
  couponCode?: string;
  notes?: string;
}

interface OrderCtx {
  orders: Order[];
  addOrder: (o: Omit<Order, "id" | "date" | "status" | "statusUpdatedAt" | "trackingSteps">) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

const STORAGE_KEY = "ww_orders_v2";

const ALL_STEPS: OrderStatus[] = [
  "Order Confirmed",
  "Preparing",
  "Baking",
  "Decorating",
  "Packaging",
  "Out For Delivery",
  "Delivered",
];

function buildInitialTrackingSteps(now: string): TrackingStep[] {
  return ALL_STEPS.map((step, i) =>
    i === 0 ? { step, completedAt: now } : { step },
  );
}

function load(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch { /* ignore */ }
}

const Ctx = createContext<OrderCtx | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(load);

  useEffect(() => { save(orders); }, [orders]);

  const addOrder = useCallback(
    (o: Omit<Order, "id" | "date" | "status" | "statusUpdatedAt" | "trackingSteps">): Order => {
      const now = new Date().toISOString();
      const order: Order = {
        ...o,
        id: `ord_${Date.now()}`,
        date: now,
        status: "Order Confirmed",
        statusUpdatedAt: now,
        trackingSteps: buildInitialTrackingSteps(now),
      };
      setOrders(prev => [order, ...prev]);
      return order;
    },
    [],
  );

  const updateOrderStatus = useCallback((id: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== id) return order;
        const updatedSteps = order.trackingSteps.map(ts =>
          ts.step === status && !ts.completedAt ? { ...ts, completedAt: now } : ts,
        );
        return { ...order, status, statusUpdatedAt: now, trackingSteps: updatedSteps };
      }),
    );
  }, []);

  return (
    <Ctx.Provider value={{ orders, addOrder, updateOrderStatus }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
