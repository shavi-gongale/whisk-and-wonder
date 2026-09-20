import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { couponsApi, type CouponRecord } from "../../lib/api";

export interface Coupon {
  id?: string;
  code: string;
  discount: number;
  description: string;
  minOrder: number;
  maxDiscount?: number;
  expiresAt?: string;
  isActive: boolean;
  active?: boolean;
  type?: "percent" | "flat";
  value?: number;
  maxUses?: number;
  usesCount?: number;
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

function mapCoupon(coupon: CouponRecord): Coupon {
  return {
    ...coupon,
    discount: coupon.discount ?? coupon.value ?? 0,
    isActive: coupon.isActive ?? coupon.active ?? true,
    active: coupon.active ?? coupon.isActive ?? true,
    minOrder: coupon.minOrder ?? 0,
    usedBy: [],
  };
}

const Ctx = createContext<CouponsCtx | null>(null);

export function CouponsProvider({ children }: { children: React.ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const refresh = useCallback(() => {
    const load = localStorage.getItem("ww_token") ? couponsApi.list() : couponsApi.available();
    load.then(rows => setCoupons(rows.map(mapCoupon))).catch(() => {
      couponsApi.available().then(rows => setCoupons(rows.map(mapCoupon))).catch(() => {});
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const applyCoupon = useCallback(
    (code: string, orderTotal: number, userId?: string): ApplyResult => {
      const coupon = coupons.find(c => c.code === code.toUpperCase().trim());
      if (!coupon) return { valid: false, discount: 0, message: "Invalid coupon code. Please check and try again." };
      if (!coupon.isActive && !coupon.active) return { valid: false, discount: 0, message: "This coupon is no longer active." };
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, discount: 0, message: "This coupon has expired." };
      if (orderTotal < coupon.minOrder) {
        return { valid: false, discount: 0, message: `Minimum order of ₹${coupon.minOrder} required for this coupon.` };
      }
      if (userId && coupon.usedBy.includes(userId)) return { valid: false, discount: 0, message: "You have already used this coupon." };

      let discountAmount = coupon.type === "flat"
        ? coupon.discount
        : (orderTotal * coupon.discount) / 100;
      if (coupon.maxDiscount !== undefined) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      discountAmount = Math.round(Math.min(discountAmount, orderTotal));
      return { valid: true, discount: discountAmount, message: `Coupon applied. You saved ₹${discountAmount}.` };
    },
    [coupons],
  );

  const addCoupon = useCallback((c: Omit<Coupon, "usedBy">) => {
    couponsApi.create({
      code: c.code,
      type: c.type || "percent",
      value: c.value ?? c.discount,
      description: c.description,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount,
      expiresAt: c.expiresAt,
    }).then(saved => setCoupons(prev => [mapCoupon(saved), ...prev])).catch(() => {});
  }, []);

  const deleteCoupon = useCallback((code: string) => {
    const coupon = coupons.find(c => c.code === code || c.id === code);
    if (coupon?.id) couponsApi.remove(coupon.id).catch(() => {});
    setCoupons(prev => prev.filter(c => c.code !== code && c.id !== code));
  }, [coupons]);

  const toggleCoupon = useCallback((code: string) => {
    const coupon = coupons.find(c => c.code === code || c.id === code);
    if (!coupon?.id) return;
    const next = !(coupon.isActive ?? coupon.active);
    couponsApi.update(coupon.id, { isActive: next })
      .then(saved => setCoupons(prev => prev.map(c => c.id === coupon.id ? mapCoupon(saved) : c)))
      .catch(() => {});
  }, [coupons]);

  const updateCoupon = useCallback((code: string, patch: Partial<Coupon>) => {
    const coupon = coupons.find(c => c.code === code || c.id === code);
    if (!coupon?.id) return;
    couponsApi.update(coupon.id, patch)
      .then(saved => setCoupons(prev => prev.map(c => c.id === coupon.id ? mapCoupon(saved) : c)))
      .catch(() => {});
  }, [coupons]);

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