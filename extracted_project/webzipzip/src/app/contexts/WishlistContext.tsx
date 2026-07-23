import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { wishlistApi } from "../../lib/api";

interface WishlistCtx {
  ids:    Set<string>;
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  count:  number;
  clear:  () => void;
}

const Ctx = createContext<WishlistCtx | null>(null);
const KEY = "ww_wishlist_v1";
const TOKEN_KEY = "ww_token";

function load(): Set<string> {
  try { const r = localStorage.getItem(KEY); return r ? new Set(JSON.parse(r)) : new Set(); } catch { return new Set(); }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(load);

  // Persist locally
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch {}
  }, [ids]);

  // Sync with backend on mount (if logged in)
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    const local = [...load()];
    // Sync local wishlist to server and get merged result
    wishlistApi.sync(local)
      .then(remote => setIds(new Set(remote)))
      .catch(() => { /* keep local */ });
  }, []); // eslint-disable-line

  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (localStorage.getItem(TOKEN_KEY)) wishlistApi.remove(id).catch(() => {});
      } else {
        next.add(id);
        if (localStorage.getItem(TOKEN_KEY)) wishlistApi.add(id).catch(() => {});
      }
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
