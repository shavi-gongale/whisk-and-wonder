import { createContext, useContext, useState, useCallback, useEffect } from "react";

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
  // Cards
  savedCards: SavedCard[];
  addCard: (c: Omit<SavedCard, "id">) => void;
  removeCard: (id: string) => void;
}

const ADDR_KEY = "ww_addresses_v1";
const CARD_KEY = "ww_cards_v1";

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  "demo@whiskandwonder.com": {
    password: "demo1234",
    user: {
      id: "u1",
      name: "Sophie Laurent",
      email: "demo@whiskandwonder.com",
      initials: "SL",
      memberSince: "March 2024",
      points: 2480,
      orders: 12,
    },
  },
  "owner@whiskandwonder.com": {
    password: "owner1234",
    user: {
      id: "u_owner",
      name: "Whisk & Wonder HQ",
      email: "owner@whiskandwonder.com",
      initials: "WW",
      memberSince: "January 2008",
      points: 0,
      orders: 0,
      isOwner: true,
    },
  },
};

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function loadAddresses(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAddresses(addresses: SavedAddress[]) {
  try {
    localStorage.setItem(ADDR_KEY, JSON.stringify(addresses));
  } catch { /* ignore */ }
}

function loadCards(): SavedCard[] {
  try {
    const raw = localStorage.getItem(CARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCards(cards: SavedCard[]) {
  try {
    localStorage.setItem(CARD_KEY, JSON.stringify(cards));
  } catch { /* ignore */ }
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>(loadAddresses);
  const [savedCards, setSavedCards] = useState<SavedCard[]>(loadCards);

  useEffect(() => { saveAddresses(addresses); }, [addresses]);
  useEffect(() => { saveCards(savedCards); }, [savedCards]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    await delay(900);
    setIsLoading(false);
    const found = MOCK_USERS[email.toLowerCase()];
    if (!found || found.password !== password) {
      throw new Error("Invalid email or password. Try demo@whiskandwonder.com / demo1234");
    }
    setUser(found.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, _password: string) => {
    setIsLoading(true);
    await delay(1100);
    setIsLoading(false);
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    setUser({
      id: `u_${Date.now()}`,
      name,
      email,
      initials,
      memberSince: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      points: 50,
      orders: 0,
    });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    await delay(800);
    setIsLoading(false);
    if (!email.includes("@")) throw new Error("Please enter a valid email address.");
    // In production: send real reset email. For now just resolves.
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone" | "avatar">>) => {
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, ...patch };
        if (patch.name) {
          updated.initials = patch.name
            .split(" ")
            .map(w => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
        return updated;
      });
    },
    [],
  );

  // ── Address management ────────────────────────────────────────────────────

  const addAddress = useCallback((a: Omit<SavedAddress, "id">) => {
    const newAddr: SavedAddress = { ...a, id: `addr_${Date.now()}` };
    setAddresses(prev => {
      const list = a.isDefault
        ? prev.map(x => ({ ...x, isDefault: false }))
        : prev;
      return [...list, newAddr];
    });
  }, []);

  const updateAddress = useCallback((id: string, patch: Partial<SavedAddress>) => {
    setAddresses(prev => {
      let list = prev;
      if (patch.isDefault) {
        list = prev.map(x => ({ ...x, isDefault: false }));
      }
      return list.map(a => (a.id === id ? { ...a, ...patch } : a));
    });
  }, []);

  const deleteAddress = useCallback((id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  }, []);

  const setDefaultAddress = useCallback((id: string) => {
    setAddresses(prev =>
      prev.map(a => ({ ...a, isDefault: a.id === id })),
    );
  }, []);

  // ── Card management ───────────────────────────────────────────────────────

  const addCard = useCallback((c: Omit<SavedCard, "id">) => {
    const newCard: SavedCard = { ...c, id: `card_${Date.now()}` };
    setSavedCards(prev => [...prev, newCard]);
  }, []);

  const removeCard = useCallback((id: string) => {
    setSavedCards(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        forgotPassword,
        updateProfile,
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        savedCards,
        addCard,
        removeCard,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
