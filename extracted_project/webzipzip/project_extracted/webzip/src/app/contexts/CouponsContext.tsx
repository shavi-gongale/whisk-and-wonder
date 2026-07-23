import { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface Coupon {
  code: string;
  discount: number; // percentage
  description: string;
  minOrder: number; // minimum order in ₹ (0 = no minimum)
  maxDiscount?: number; // cap in ₹
  expiresAt?: string;
  isActive: boolean;
  usedBy: string[];
}

interface ApplyResult {
  valid: boolean;
  discount: number;
  message: string;
}

interface CouponsCtx {
  coupons: Coupon[];
  applyCoupon: (code: string, orderTotal: number, userId?: string) => ApplyResult;
  addCoupon: (c: Omit<Coupon, "usedBy">) => void;
  deleteCoupon: (code: string) => void;
  toggleCoupon: (code: string) => void;
  updateCoupon: (code: string, patch: Partial<Coupon>) => void;
}

const STORAGE_KEY = "ww_coupons_v1";

const SEED_COUPONS: Coupon[] = [
  {
    code: "WELCOME10",
    discount: 10,
    description: "10% off on your first order — no minimum required!",
    minOrder: 0,
    isActive: true,
    usedBy: [],
  },
  {
    code: "SWEET15",
    discount: 15,
    description: "15% off on orders above ₹500. Sweeten your day!",
    minOrder: 500,
    isActive: true,
    usedBy: [],
  },
  {
    code: "BIRTHDAY20",
    discount: 20,
    description: "20% off (up to ₹300) on orders above ₹800. Perfect for celebrations!",
    minOrder: 800,
    maxDiscount: 300,
    isActive: true,
    usedBy: [],
  },
  {
    code: "VIP25",
    discount: 25,
    description: "Exclusive 25% off (up to ₹500) for our VIP members on orders above ₹1500.",
    minOrder: 1500,
    maxDiscount: 500,
    isActive: true,
    usedBy: [],
  },
  {
    code: "FIRSTORDER",
    discount: 30,
    description: "30% off (up to ₹400) — welcome gift for new customers!",
    minOrder: 0,
    maxDiscount: 400,
    isActive: true,
    usedBy: [],
  },
  {
    code: "FESTIVE50",
    discount: 50,
    description: "Festive special! 50% off (up to ₹800) on orders above ₹2000.",
    minOrder: 2000,
    maxDiscount: 800,
    expiresAt: "2025-01-31T23:59:59Z",
    isActive: true,
    usedBy: [],
  },
];

function loadCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_COUPONS;
    const parsed: Coupon[] = JSON.parse(raw);
    // Ensure all seed coupon codes exist (merge, don't overwrite user additions)
    const existingCodes = new Set(parsed.map(c => c.code));
    const merged = [...parsed];
    for (const seed of SEED_COUPONS) {
      if (!existingCodes.has(seed.code)) merged.push(seed);
    }
    return merged;
  } catch {
    return SEED_COUPONS;
  }
}

function saveCoupons(coupons: Coupon[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  } catch { /* ignore */ }
}

const Ctx = createContext<CouponsCtx | null>(null);

export function CouponsProvider({ children }: { children: React.ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);

  useEffect(() => { saveCoupons(coupons); }, [coupons]);

  const applyCoupon = useCallback(
    (code: string, orderTotal: number, userId?: string): ApplyResult => {
      const coupon = coupons.find(c => c.code === code.toUpperCase().trim());

      if (!coupon) {
        return { valid: false, discount: 0, message: "Invalid coupon code. Please check and try again." };
      }
      if (!coupon.isActive) {
        return { valid: false, discount: 0, message: "This coupon is no longer active." };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { valid: false, discount: 0, message: "This coupon has expired." };
      }
      if (orderTotal < coupon.minOrder) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order of ₹${coupon.minOrder} required for this coupon.`,
        };
      }
      if (userId && coupon.usedBy.includes(userId)) {
        return { valid: false, discount: 0, message: "You have already used this coupon." };
      }

      let discountAmount = (orderTotal * coupon.discount) / 100;
      if (coupon.maxDiscount !== undefined) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
      discountAmount = Math.round(discountAmount);

      // Mark coupon as used by this user
      if (userId) {
        setCoupons(prev =>
          prev.map(c =>
            c.code === coupon.code ? { ...c, usedBy: [...c.usedBy, userId] } : c,
          ),
        );
      }

      return {
        valid: true,
        discount: discountAmount,
        message: `🎉 Coupon applied! You saved ₹${discountAmount}.`,
      };
    },
    [coupons],
  );

  const addCoupon = useCallback((c: Omit<Coupon, "usedBy">) => {
    setCoupons(prev => {
      if (prev.some(existing => existing.code === c.code)) {
        throw new Error(`Coupon code "${c.code}" already exists.`);
      }
      return [...prev, { ...c, usedBy: [] }];
    });
  }, []);

  const deleteCoupon = useCallback((code: string) => {
    setCoupons(prev => prev.filter(c => c.code !== code));
  }, []);

  const toggleCoupon = useCallback((code: string) => {
    setCoupons(prev =>
      prev.map(c => (c.code === code ? { ...c, isActive: !c.isActive } : c)),
    );
  }, []);

  const updateCoupon = useCallback((code: string, patch: Partial<Coupon>) => {
    setCoupons(prev =>
      prev.map(c => (c.code === code ? { ...c, ...patch } : c)),
    );
  }, []);

  return (
    <Ctx.Provider value={{ coupons, applyCoupon, addCoupon, deleteCoupon, toggleCoupon, updateCoupon }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCoupons() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCoupons must be inside CouponsProvider");
  return ctx;
}
