import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  imgId: string;
  size: string;
  category: string;
}

interface CartCtx {
  items:       CartItem[];
  count:       number;
  total:       number;
  add:         (item: Omit<CartItem, "id">) => void;
  remove:      (id: string) => void;
  updateQty:   (id: string, qty: number) => void;
  clear:       () => void;
  isInCart:    (productId: string, size: string) => boolean;
}

const Ctx = createContext<CartCtx | null>(null);

const STORAGE_KEY = "ww_cart_v1";

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => { save(items); }, [items]);

  const add = useCallback((item: Omit<CartItem, "id">) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId && i.size === item.size);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, qty: i.qty + item.qty } : i);
      }
      return [...prev, { ...item, id: `${item.productId}-${item.size}-${Date.now()}` }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isInCart = useCallback((productId: string, size: string) =>
    items.some(i => i.productId === productId && i.size === size), [items]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <Ctx.Provider value={{ items, count, total, add, remove, updateQty, clear, isInCart }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
