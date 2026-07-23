import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi, usersApi } from "../../lib/api";

export interface SavedAddress {
  id: string;
  label: "Home" | "Work" | "Other";
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: "Visa" | "Mastercard" | "RuPay" | "AmEx";
  expiry: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  memberSince: string;
  points: number;
  orders: number;
  isOwner?: boolean;
  phone?: string;
  avatar?: string;
}

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, "name" | "phone" | "avatar">>) => void;
  // Addresses
  addresses: SavedAddress[];
  addAddress: (a: Omit<SavedAddress, "id">) => void;
  updateAddress: (id: string, patch: Partial<SavedAddress>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  // Cards (local only)
  savedCards: SavedCard[];
  addCard: (c: Omit<SavedCard, "id">) => void;
  removeCard: (id: string) => void;
}

const TOKEN_KEY  = "ww_token";
const CARD_KEY   = "ww_cards_v1";

function loadCards(): SavedCard[] {
  try { const r = localStorage.getItem(CARD_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveCards(cards: SavedCard[]) {
  try { localStorage.setItem(CARD_KEY, JSON.stringify(cards)); } catch {}
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);  // true while restoring session
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>(loadCards);

  useEffect(() => { saveCards(savedCards); }, [savedCards]);

  // ── Restore session from stored JWT ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setIsLoading(false); return; }
    Promise.all([
      authApi.me().catch(() => null),
      usersApi.getAddresses().catch(() => [] as SavedAddress[]),
    ])
      .then(([meRes, addrs]) => {
        if (meRes?.user) {
          setUser(meRes.user as unknown as User);
          setAddresses(addrs as SavedAddress[]);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: u, token } = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, token);
      setUser(u as unknown as User);
      // Fetch addresses in background
      usersApi.getAddresses()
        .then(a => setAddresses(a as SavedAddress[]))
        .catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: u, token } = await authApi.signup(name, email, password);
      localStorage.setItem(TOKEN_KEY, token);
      setUser(u as unknown as User);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setAddresses([]);
  }, []);

  // ── Forgot password ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Update profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback((patch: Partial<Pick<User, "name" | "phone" | "avatar">>) => {
    // Optimistic local update immediately
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      if (patch.name) {
        updated.initials = patch.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      }
      return updated;
    });
    // Sync with API (fire-and-forget)
    usersApi.updateProfile(patch)
      .then(u => setUser(prev => prev ? { ...prev, ...u } : prev))
      .catch(() => { /* keep optimistic update */ });
  }, []);

  // ── Addresses ──────────────────────────────────────────────────────────────
  const addAddress = useCallback((a: Omit<SavedAddress, "id">) => {
    // Optimistic
    const temp: SavedAddress = { ...a, id: `addr_${Date.now()}` };
    setAddresses(prev => {
      const list = a.isDefault ? prev.map(x => ({ ...x, isDefault: false })) : prev;
      return [...list, temp];
    });
    // Persist
    usersApi.addAddress(a as Parameters<typeof usersApi.addAddress>[0])
      .then(saved => {
        setAddresses(prev => prev.map(x => x.id === temp.id ? saved as unknown as SavedAddress : x));
      })
      .catch(() => {});
  }, []);

  const updateAddress = useCallback((id: string, patch: Partial<SavedAddress>) => {
    setAddresses(prev => {
      let list = prev;
      if (patch.isDefault) list = prev.map(x => ({ ...x, isDefault: false }));
      return list.map(a => (a.id === id ? { ...a, ...patch } : a));
    });
    usersApi.updateAddress(id, patch as Parameters<typeof usersApi.updateAddress>[1])
      .catch(() => {});
  }, []);

  const deleteAddress = useCallback((id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    usersApi.deleteAddress(id).catch(() => {});
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
    usersApi.updateAddress(id, { isDefault: true } as Parameters<typeof usersApi.updateAddress>[1])
      .catch(() => {});
  }, []);

  // ── Cards (local only) ─────────────────────────────────────────────────────
  const addCard = useCallback((c: Omit<SavedCard, "id">) => {
    setSavedCards(prev => [...prev, { ...c, id: `card_${Date.now()}` }]);
  }, []);

  const removeCard = useCallback((id: string) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{
      user, isLoading, login, signup, logout, forgotPassword, updateProfile,
      addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
      savedCards, addCard, removeCard,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
