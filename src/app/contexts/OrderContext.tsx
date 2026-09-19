import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ordersApi } from "../../lib/api";

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
  refreshOrders: () => Promise<void>;
}

const TOKEN_KEY   = "ww_token";

const ALL_STEPS: OrderStatus[] = [
  "Order Confirmed","Preparing","Baking","Decorating","Packaging","Out For Delivery","Delivered",
];

function buildInitialTrackingSteps(now: string): TrackingStep[] {
  return ALL_STEPS.map((step, i) => i === 0 ? { step, completedAt: now } : { step });
}

const Ctx = createContext<OrderCtx | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  // Fetch orders from backend when we have a token
  const refreshOrders = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const remote = await ordersApi.getAll();
      const mapped = remote as unknown as Order[];
        setOrders(mapped);
    } catch { setOrders([]); }
  }, []);

  // Sync on mount if token is present
  useEffect(() => { refreshOrders(); }, []); // eslint-disable-line

  const addOrder = useCallback(
    (o: Omit<Order, "id" | "date" | "status" | "statusUpdatedAt" | "trackingSteps">): Order => {
      const now = new Date().toISOString();
      const tempId = `ord_${Date.now()}`;
      const order: Order = {
        ...o,
        id: tempId,
        date: now,
        status: "Order Confirmed",
        statusUpdatedAt: now,
        trackingSteps: buildInitialTrackingSteps(now),
      };
      // Add locally immediately (optimistic)
      setOrders(prev => [order, ...prev]);

      // Persist to backend (fire-and-forget, replace temp id when done)
      ordersApi.create(o as Parameters<typeof ordersApi.create>[0])
        .then(saved => {
          const s = saved as unknown as Order;
          setOrders(prev => prev.map(x => x.id === tempId ? { ...order, id: s.id } : x));
        })
        .catch(() => setOrders(prev => prev.filter(x => x.id !== tempId)));

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
    ordersApi.updateStatus(id, status).catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ orders, addOrder, updateOrderStatus, refreshOrders }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
