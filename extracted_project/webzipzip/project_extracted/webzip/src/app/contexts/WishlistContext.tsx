import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface WishlistCtx {
  ids:    Set<string>;
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  count:  number;
  clear:  () => void;
}

const Ctx = createContext<WishlistCtx | null>(null);
const KEY = "ww_wishlist_v1";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch {}
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const has   = useCallback((id: string) => ids.has(id), [ids]);
  const clear = useCallback(() => setIds(new Set()), []);

  return (
    <Ctx.Provider value={{ ids, toggle, has, count: ids.size, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider");
  return ctx;
}
