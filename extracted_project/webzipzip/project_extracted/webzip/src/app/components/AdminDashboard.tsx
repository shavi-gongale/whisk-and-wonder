import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, LayoutGrid, Package, ShoppingBag, Users, BarChart3, Star, TrendingUp,
  Plus, Pencil, Trash2, Tag, MessageSquare, Settings, Eye, EyeOff,
  CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, ChevronDown, Search,
  Upload, ChevronLeft, ChevronRight, ImageIcon,
} from "lucide-react";

// ─── File → data URL helper ───────────────────────────────────────────────────
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
import { useProductStore } from "../contexts/ProductStoreContext";
import { useOrders } from "../contexts/OrderContext";
import { useToast } from "../contexts/ToastContext";
import { useCoupons } from "../contexts/CouponsContext";
import { useReviews } from "../contexts/ReviewsContext";
import type { Product } from "../data/products";
import type { OrderStatus } from "../contexts/OrderContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const img   = (id: string, w=80, h=80) => {
  if (!id) return '';
  if (id.startsWith('data:') || id.startsWith('http') || id.startsWith('/')) return id;
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
};

const ALL_STATUSES: OrderStatus[] = ["Order Confirmed","Preparing","Baking","Decorating","Packaging","Out For Delivery","Delivered"];
const ALL_CATEGORIES = ["Birthday Cakes","Wedding Cakes","Chocolate Cakes","Strawberry Cakes","Cheesecakes","Cupcakes","Donuts","Cookies","Croissants","Macarons","Coffee","Tea","Bread","Pastries","Seasonal Specials","Gift Boxes","Brownies","Tarts","Muffins"];

type Tab = "dashboard"|"products"|"orders"|"customers"|"reviews"|"coupons"|"analytics"|"settings";

interface Props { open: boolean; onClose: () => void; dark: boolean; }

/* ── helpers ── */
function Btn({ children, onClick, variant="primary", small, full, disabled }: { children: React.ReactNode; onClick?: () => void; variant?: "primary"|"ghost"|"danger"|"mint"; small?: boolean; full?: boolean; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.hazelnut, color: "#fff" },
    ghost:   { background: "transparent", color: C.hazelnut, border: `1px solid ${C.shortbread}` },
    danger:  { background: "#E8606A", color: "#fff" },
    mint:    { background: C.mint, color: C.cocoa },
  };
  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.03 }} whileTap={{ scale: disabled ? 1 : 0.97 }} onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], border: (styles[variant].border as string) ?? "none", borderRadius: 10, padding: small ? "6px 13px" : "10px 20px", fontFamily: sans, fontSize: small ? "0.7rem" : "0.82rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined }}>
      {children}
    </motion.button>
  );
}

function Field({ label, value, onChange, type="text", textarea, placeholder, bg, text, border }: {
  label: string; value: string|number; onChange: (v:string)=>void; type?: string; textarea?: boolean; placeholder?: string;
  bg?: string; text?: string; border?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontFamily: sans, fontSize: "0.6rem", fontWeight: 700, color: C.hazelnut, letterSpacing: "0.14em", display: "block", marginBottom: 5 }}>{label.toUpperCase()}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${border ?? C.shortbread}`, fontFamily: sans, fontSize: "0.82rem", color: text ?? C.cocoa, background: bg ?? "#fff", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${border ?? C.shortbread}`, fontFamily: sans, fontSize: "0.82rem", color: text ?? C.cocoa, background: bg ?? "#fff", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label, textCol }: { checked: boolean; onChange: (v:boolean)=>void; label: string; textCol?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: sans, fontSize: "0.76rem", color: textCol ?? C.cocoa, userSelect: "none" }}>
      <button onClick={() => onChange(!checked)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: checked ? C.mint : C.shortbread, padding: 0 }}>
        {checked ? <ToggleRight size={22} color={C.mint}/> : <ToggleLeft size={22} color={C.shortbread}/>}
      </button>
      {label}
    </label>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontFamily: sans, fontSize: "0.6rem", fontWeight: 700, background: color+"22", color, border: `1px solid ${color}44`, borderRadius: 100, padding: "3px 9px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>;
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 20px", border: `1px solid rgba(255,255,255,0.1)` }}>
      {icon && <div style={{ marginBottom: 10, color: color ?? C.apricot }}>{icon}</div>}
      <p style={{ fontFamily: serif, fontSize: "1.6rem", fontWeight: 700, color: color ?? C.apricot, marginBottom: 4 }}>{value}</p>
      <p style={{ fontFamily: sans, fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>{label}</p>
      {sub && <p style={{ fontFamily: sans, fontSize: "0.65rem", color: "rgba(255,255,255,0.45)" }}>{sub}</p>}
    </div>
  );
}

const statusColor: Record<OrderStatus, string> = {
  "Order Confirmed": C.lilac, "Preparing": C.apricot, "Baking": C.peach, "Decorating": "#F4D03F",
  "Packaging": C.mint, "Out For Delivery": "#5DADE2", "Delivered": "#27AE60",
};

const emptyDraft = {
  name:"", desc:"", longDesc:"", price:0, originalPrice:0, discount:0, rating:5, reviewCount:0,
  tag:"New", imgId:"", galleryImgIds:[] as string[], category:"", ingredients:[] as string[],
  allergens:[] as string[], calories:0, sizes:[{ label:"Standard", price:0 }] as { label:string; price:number }[],
  relatedIds:[] as string[], tags:[] as string[], prepTime:"", deliveryTime:"",
  isNew:true, isBestSeller:false, isFeatured:false, isEggless:false, isVegetarian:false, isPremium:false, isSeasonal:false,
  stock:20, availability:"In Stock" as string, isHidden:false,
};

export function AdminDashboard({ open, onClose, dark }: Props) {
  const { products, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { orders, updateOrderStatus } = useOrders();
  const { toast } = useToast();
  const { coupons, addCoupon, deleteCoupon, toggleCoupon } = useCoupons();
  const { getAllReviews, addOwnerReply, hideReview, deleteReview } = useReviews();

  const [tab, setTab] = useState<Tab>("dashboard");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [productSearch, setProductSearch] = useState("");
  const [productCatFilter, setProductCatFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [reviewFilter, setReviewFilter] = useState<"all"|"hidden"|"verified">("all");
  const [couponDraft, setCouponDraft] = useState({ code:"", discount:10, description:"", minOrder:200, maxDiscount:200, expiresAt:"2025-12-31", active:true });
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ww_settings_v1") || "{}"); } catch { return {}; }
  });
  const [settingsForm, setSettingsForm] = useState({
    storeName: settings.storeName ?? "Whisk & Wonder",
    tagline: settings.tagline ?? "Artisan Bakery Since 2008",
    phone: settings.phone ?? "+91 98765 43210",
    email: settings.email ?? "hello@whiskandwonder.com",
    address: settings.address ?? "12, Baker Street, Colaba, Mumbai",
    hours: settings.hours ?? "Tue–Sun 8am–8pm",
    deliveryRadius: settings.deliveryRadius ?? "10",
    minOrder: settings.minOrder ?? "300",
  });

  const allReviews = getAllReviews();
  const bg     = dark ? "#17100A" : "#f4ede3";
  const panel  = dark ? "#221609" : "#fff";
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const border = dark ? "rgba(255,255,255,0.09)" : C.shortbread;
  const fBg    = dark ? "rgba(255,255,255,0.06)" : C.oats;
  const sideActive = dark ? "rgba(255,188,138,0.14)" : C.oats;

  /* ── analytics data ── */
  const now = Date.now();
  const dayMs = 86400000;
  const todayOrders  = orders.filter(o => now - new Date(o.date).getTime() < dayMs);
  const weekOrders   = orders.filter(o => now - new Date(o.date).getTime() < 7 * dayMs);
  const monthOrders  = orders.filter(o => now - new Date(o.date).getTime() < 30 * dayMs);
  const todayRev  = todayOrders.reduce((s,o)=>s+o.total,0);
  const weekRev   = weekOrders.reduce((s,o)=>s+o.total,0);
  const monthRev  = monthOrders.reduce((s,o)=>s+o.total,0);
  const totalRev  = orders.reduce((s,o)=>s+o.total,0);
  const avgOrder  = orders.length ? totalRev / orders.length : 0;

  const productSales = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach(o => o.items.forEach(i => m.set(i.name, (m.get(i.name)||0) + i.qty)));
    return m;
  }, [orders]);
  const topProducts = Array.from(productSales.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const lowStock = products.filter(p => (p.stock ?? 99) < 10);

  const uniqueCustomers = useMemo(() => {
    const m = new Map<string, { name:string; email:string; count:number; spent:number }>();
    orders.forEach(o => {
      const e = o.customer.email;
      const ex = m.get(e);
      if (ex) { ex.count++; ex.spent += o.total; }
      else m.set(e, { name: o.customer.name, email: e, count: 1, spent: o.total });
    });
    return Array.from(m.values());
  }, [orders]);

  /* last 7 days bar chart data */
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * dayMs);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const rev = orders.filter(o => {
      const od = new Date(o.date);
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() && od.getDate() === d.getDate();
    }).reduce((s,o)=>s+o.total,0);
    return { label, rev };
  }), [orders, now]);
  const maxRev = Math.max(...last7.map(d => d.rev), 1);

  /* category breakdown */
  const catBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach(o => o.items.forEach(i => m.set(i.category, (m.get(i.category)||0) + i.price * i.qty)));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [orders]);

  const selectedOrderData = orders.find(o => o.id === selectedOrder);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCat = !productCatFilter || p.category === productCatFilter;
    return matchSearch && matchCat;
  }), [products, productSearch, productCatFilter]);

  const filteredReviews = allReviews.filter(r => {
    if (reviewFilter === "hidden") return r.hidden;
    if (reviewFilter === "verified") return r.verified;
    return true;
  });

  const startCreate = () => { setDraft({ ...emptyDraft, category: ALL_CATEGORIES[0] }); setCreating(true); setEditing(null); };
  const startEdit = (p: Product) => {
    setDraft({
      name:p.name, desc:p.desc, longDesc:p.longDesc ?? "", price:p.price,
      originalPrice:(p as any).originalPrice ?? 0, discount:(p as any).discount ?? 0,
      rating:p.rating, reviewCount:p.reviewCount, tag:p.tag, imgId:p.imgId,
      galleryImgIds:(p as any).galleryImgIds ?? [], category:p.category,
      ingredients:p.ingredients, allergens:(p as any).allergens ?? [],
      calories:p.calories, sizes:p.sizes, relatedIds:p.relatedIds,
      tags:(p as any).tags ?? [], prepTime:(p as any).prepTime ?? "", deliveryTime:(p as any).deliveryTime ?? "",
      isNew:!!p.isNew, isBestSeller:!!p.isBestSeller, isFeatured:!!p.isFeatured,
      isEggless:!!(p as any).isEggless, isVegetarian:!!(p as any).isVegetarian,
      isPremium:!!(p as any).isPremium, isSeasonal:!!(p as any).isSeasonal,
      stock:p.stock ?? 20, availability:(p as any).availability ?? "In Stock",
      isHidden:!!(p as any).isHidden,
    });
    setEditing(p); setCreating(false);
  };

  const cancelForm = () => { setEditing(null); setCreating(false); };

  const saveDraft = () => {
    if (!draft.name.trim() || !draft.imgId.trim() || !draft.category.trim()) {
      toast("Name, category and image ID are required", "error"); return;
    }
    const payload = {
      ...draft,
      sizes: draft.sizes.length ? draft.sizes : [{ label: "Standard", price: draft.price }],
    };
    if (editing) { updateProduct(editing.id, payload as any); toast(`${draft.name} updated ✓`, "success"); setEditing(null); }
    else { addProduct(payload as any); toast(`${draft.name} added 🎉`, "success"); setCreating(false); }
  };

  const saveSettings = () => {
    localStorage.setItem("ww_settings_v1", JSON.stringify(settingsForm));
    setSettings(settingsForm);
    toast("Settings saved ✓", "success");
  };

  const handleAddCoupon = () => {
    if (!couponDraft.code.trim()) { toast("Coupon code required", "error"); return; }
    addCoupon({ ...couponDraft, code: couponDraft.code.toUpperCase() });
    toast(`Coupon ${couponDraft.code.toUpperCase()} added`, "success");
    setCouponDraft({ code:"", discount:10, description:"", minOrder:200, maxDiscount:200, expiresAt:"2025-12-31", active:true });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id:"dashboard",  label:"Dashboard",  icon: <LayoutGrid size={15}/> },
    { id:"products",   label:"Products",   icon: <Package size={15}/> },
    { id:"orders",     label:"Orders",     icon: <ShoppingBag size={15}/> },
    { id:"customers",  label:"Customers",  icon: <Users size={15}/> },
    { id:"reviews",    label:"Reviews",    icon: <Star size={15}/> },
    { id:"coupons",    label:"Coupons",    icon: <Tag size={15}/> },
    { id:"analytics",  label:"Analytics",  icon: <BarChart3 size={15}/> },
    { id:"settings",   label:"Settings",   icon: <Settings size={15}/> },
  ];

  const showForm = creating || !!editing;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ position:"fixed", inset:0, zIndex:200, background: dark?"#0D0805":"#EFE6D9", display:"flex", flexDirection:"column" }}>

          {/* Mobile top tabs */}
          <div style={{ display:"flex", overflowX:"auto", borderBottom:`1px solid ${border}`, background: dark?"#17100A":"#fff", flexShrink:0, scrollbarWidth:"none" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"0 12px", gap:4, flexShrink:0, borderRight:`1px solid ${border}` }}>
              <BarChart3 size={16} color={C.apricot}/>
              <span style={{ fontFamily:serif, fontSize:"0.85rem", fontWeight:700, color:text, whiteSpace:"nowrap", padding:"0 8px" }}>Owner Console</span>
            </div>
            {tabs.map(t => (
              <button key={t.id} onClick={()=>{ setTab(t.id); cancelForm(); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"14px 16px", border:"none", borderBottom: tab===t.id?`2.5px solid ${C.apricot}`:"2.5px solid transparent", background:"transparent", color: tab===t.id?C.apricot:sub, fontFamily:sans, fontSize:"0.74rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                {t.icon}{t.label}
              </button>
            ))}
            <div style={{ flex:1 }}/>
            <button onClick={onClose} style={{ padding:"0 18px", background:"none", border:"none", color:sub, cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0, fontFamily:sans, fontSize:"0.76rem" }}>
              <X size={16}/> Close
            </button>
          </div>

          {/* Main content */}
          <div style={{ flex:1, overflowY:"auto", padding:"28px clamp(14px, 4vw, 48px)" }}>
            <AnimatePresence mode="wait">

              {/* ── DASHBOARD ── */}
              {tab === "dashboard" && (
                <motion.div key="dash" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:24 }}>Business Overview</h2>

                  {/* Stats grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:28 }}>
                    {[
                      { label:"Total Revenue", value:`₹${totalRev.toLocaleString("en-IN")}`, icon:<TrendingUp size={18}/>, color:C.apricot },
                      { label:"Total Orders", value:String(orders.length), icon:<ShoppingBag size={18}/>, color:C.mint },
                      { label:"Customers", value:String(uniqueCustomers.length), icon:<Users size={18}/>, color:C.lilac },
                      { label:"Avg. Order Value", value:`₹${avgOrder.toFixed(0)}`, icon:<BarChart3 size={18}/>, color:C.peach },
                    ].map((s,i) => (
                      <div key={i} style={{ background: dark?"rgba(255,255,255,0.05)":"#fff", borderRadius:16, padding:"18px 20px", border:`1px solid ${border}` }}>
                        <div style={{ color:s.color, marginBottom:10 }}>{s.icon}</div>
                        <p style={{ fontFamily:serif, fontSize:"1.5rem", fontWeight:700, color:s.color }}>{s.value}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.67rem", fontWeight:600, color:sub, letterSpacing:"0.06em", marginTop:3 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Revenue by period */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:28 }}>
                    {[["Today", `₹${todayRev.toFixed(0)}`, todayOrders.length], ["This Week", `₹${weekRev.toFixed(0)}`, weekOrders.length], ["This Month", `₹${monthRev.toFixed(0)}`, monthOrders.length]].map(([label,rev,cnt]) => (
                      <div key={label as string} style={{ background: dark?"rgba(255,188,138,0.08)":"#fffaf5", border:`1px solid ${dark?"rgba(255,188,138,0.18)":C.apricot+"44"}`, borderRadius:14, padding:"16px 18px" }}>
                        <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:C.apricot, letterSpacing:"0.1em", marginBottom:6 }}>{(label as string).toUpperCase()}</p>
                        <p style={{ fontFamily:serif, fontSize:"1.3rem", fontWeight:700, color:text }}>{rev as string}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{cnt as number} orders</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                    {/* Top products */}
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px" }}>
                      <h3 style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text, marginBottom:14, letterSpacing:"0.06em" }}>TOP SELLING</h3>
                      {topProducts.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>No sales data yet.</p>}
                      {topProducts.map(([name,qty],i) => (
                        <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${border}` }}>
                          <span style={{ fontFamily:serif, fontWeight:700, color:C.apricot, width:18, fontSize:"0.9rem" }}>{i+1}</span>
                          <span style={{ fontFamily:sans, fontSize:"0.8rem", color:text, flex:1 }}>{name}</span>
                          <span style={{ fontFamily:sans, fontSize:"0.72rem", color:sub }}>{qty} sold</span>
                        </div>
                      ))}
                    </div>

                    {/* Low stock alerts */}
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px" }}>
                      <h3 style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text, marginBottom:14, letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:8 }}>
                        <AlertTriangle size={14} color="#E8606A"/> LOW STOCK ALERTS
                      </h3>
                      {lowStock.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>All products well stocked ✓</p>}
                      {lowStock.map(p => (
                        <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${border}` }}>
                          <span style={{ fontFamily:sans, fontSize:"0.79rem", color:text }}>{p.name}</span>
                          <Badge label={`${p.stock ?? 0} left`} color="#E8606A"/>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent orders */}
                  <div style={{ marginTop:24, background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px" }}>
                    <h3 style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text, marginBottom:14 }}>RECENT ORDERS</h3>
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${border}` }}>
                        <div style={{ flex:1 }}>
                          <p style={{ fontFamily:sans, fontSize:"0.8rem", fontWeight:600, color:text }}>{o.orderNum ?? o.id.slice(-6)}</p>
                          <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{o.customer.name} · {new Date(o.date).toLocaleDateString("en-IN")}</p>
                        </div>
                        <Badge label={o.status} color={statusColor[o.status]}/>
                        <span style={{ fontFamily:serif, fontWeight:700, color:C.peach, fontSize:"0.9rem" }}>₹{o.total.toFixed(0)}</span>
                      </div>
                    ))}
                    {orders.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.8rem", color:sub }}>No orders yet.</p>}
                  </div>
                </motion.div>
              )}

              {/* ── PRODUCTS ── */}
              {tab === "products" && !showForm && (
                <motion.div key="products" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
                    <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text }}>Products ({products.length})</h2>
                    <Btn onClick={startCreate}><Plus size={14}/> Add Product</Btn>
                  </div>
                  <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
                    <div style={{ position:"relative", flex:1, minWidth:180 }}>
                      <Search size={13} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:sub }}/>
                      <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products…"
                        style={{ width:"100%", padding:"9px 12px 9px 34px", borderRadius:10, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.8rem", color:text, background:fBg, outline:"none", boxSizing:"border-box" }}/>
                    </div>
                    <select value={productCatFilter} onChange={e=>setProductCatFilter(e.target.value)}
                      style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${border}`, background:fBg, color:text, fontFamily:sans, fontSize:"0.78rem", cursor:"pointer" }}>
                      <option value="">All Categories</option>
                      {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ background: dark?"rgba(255,255,255,0.03)":"#fff", borderRadius:16, border:`1px solid ${border}`, overflow:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${border}` }}>
                          {["Product","Category","Price","Stock","Availability",""].map(h => (
                            <th key={h} style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.1em", padding:"12px 14px", textAlign:"left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map(p => (
                          <tr key={p.id} style={{ borderBottom:`1px solid ${border}`, opacity:(p as any).isHidden?0.45:1 }}>
                            <td style={{ padding:"10px 14px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <img src={img(p.imgId)} alt={p.name} style={{ width:40, height:40, borderRadius:8, objectFit:"cover", flexShrink:0 }}/>
                                <div>
                                  <p style={{ fontFamily:sans, fontWeight:600, fontSize:"0.82rem", color:text }}>{p.name}</p>
                                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:3 }}>
                                    {p.isBestSeller && <Badge label="Bestseller" color={C.apricot}/>}
                                    {p.isFeatured && <Badge label="Featured" color={C.peach}/>}
                                    {p.isNew && <Badge label="New" color={C.mint}/>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:"10px 14px", fontFamily:sans, fontSize:"0.76rem", color:sub }}>{p.category}</td>
                            <td style={{ padding:"10px 14px", fontFamily:serif, fontWeight:700, color:C.peach }}>₹{p.price}</td>
                            <td style={{ padding:"10px 14px" }}>
                              <Badge label={String(p.stock ?? "—")} color={(p.stock ?? 99) < 10 ? "#E8606A" : C.mint}/>
                            </td>
                            <td style={{ padding:"10px 14px", fontFamily:sans, fontSize:"0.72rem", color:sub }}>{(p as any).availability ?? "In Stock"}</td>
                            <td style={{ padding:"10px 14px" }}>
                              <div style={{ display:"flex", gap:6 }}>
                                <Btn variant="ghost" small onClick={() => { updateProduct(p.id, { isHidden: !(p as any).isHidden } as any); }}>
                                  {(p as any).isHidden ? <Eye size={12}/> : <EyeOff size={12}/>}
                                </Btn>
                                <Btn variant="ghost" small onClick={() => startEdit(p)}><Pencil size={12}/></Btn>
                                <Btn variant="danger" small onClick={() => setConfirmDelete(p.id)}><Trash2 size={12}/></Btn>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                      <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"24px", textAlign:"center" }}>No products found.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Product form */}
              {tab === "products" && showForm && (
                <motion.div key="product-form" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{ maxWidth:720 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:22 }}>
                    <Btn variant="ghost" small onClick={cancelForm}><X size={13}/> Cancel</Btn>
                    <h2 style={{ fontFamily:serif, fontSize:"1.5rem", fontWeight:700, color:text }}>{editing?"Edit Product":"New Product"}</h2>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <Field label="Name" value={draft.name} onChange={v=>setDraft(d=>({...d,name:v}))} bg={fBg} text={text} border={border}/>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.14em", display:"block", marginBottom:5 }}>CATEGORY</label>
                      <select value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))}
                        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.82rem", color:text, background:fBg, outline:"none" }}>
                        {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <Field label="Short description" value={draft.desc} onChange={v=>setDraft(d=>({...d,desc:v}))} bg={fBg} text={text} border={border}/>
                  <Field label="Long description" value={draft.longDesc} onChange={v=>setDraft(d=>({...d,longDesc:v}))} textarea bg={fBg} text={text} border={border}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                    <Field label="Price (₹)" type="number" value={draft.price} onChange={v=>setDraft(d=>({...d,price:parseFloat(v)||0}))} bg={fBg} text={text} border={border}/>
                    <Field label="Original Price (₹)" type="number" value={draft.originalPrice} onChange={v=>setDraft(d=>({...d,originalPrice:parseFloat(v)||0}))} bg={fBg} text={text} border={border}/>
                    <Field label="Discount (%)" type="number" value={draft.discount} onChange={v=>setDraft(d=>({...d,discount:parseFloat(v)||0}))} bg={fBg} text={text} border={border}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                    <Field label="Stock" type="number" value={draft.stock} onChange={v=>setDraft(d=>({...d,stock:parseInt(v)||0}))} bg={fBg} text={text} border={border}/>
                    <Field label="Calories" type="number" value={draft.calories} onChange={v=>setDraft(d=>({...d,calories:parseInt(v)||0}))} bg={fBg} text={text} border={border}/>
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.14em", display:"block", marginBottom:5 }}>AVAILABILITY</label>
                      <select value={draft.availability} onChange={e=>setDraft(d=>({...d,availability:e.target.value}))}
                        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.82rem", color:text, background:fBg, outline:"none" }}>
                        {["In Stock","Out of Stock","Pre-order","Seasonal"].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <Field label="Prep Time (e.g. 2 hours)" value={draft.prepTime} onChange={v=>setDraft(d=>({...d,prepTime:v}))} bg={fBg} text={text} border={border}/>
                    <Field label="Delivery Time (e.g. Same Day)" value={draft.deliveryTime} onChange={v=>setDraft(d=>({...d,deliveryTime:v}))} bg={fBg} text={text} border={border}/>
                  </div>
                  {/* ── MAIN IMAGE ── */}
                  <div style={{ marginBottom:18, gridColumn:"1 / -1" }}>
                    <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.14em", display:"block", marginBottom:8 }}>MAIN PRODUCT IMAGE</label>
                    <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                      {/* Preview */}
                      <div style={{ width:100, height:100, borderRadius:14, border:`2px solid ${border}`, overflow:"hidden", flexShrink:0, background:dark?"rgba(255,255,255,0.05)":C.oats, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {draft.imgId ? (
                          <img src={img(draft.imgId, 200, 200)} alt="Main" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        ) : (
                          <ImageIcon size={28} color={C.shortbread}/>
                        )}
                      </div>
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10, minWidth:200 }}>
                        {/* Upload button */}
                        <label style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:10, background:C.hazelnut, color:"#fff", fontFamily:sans, fontSize:"0.78rem", fontWeight:600, cursor:"pointer", width:"fit-content" }}>
                          <Upload size={14}/> Upload Image
                          <input type="file" accept="image/*" style={{ display:"none" }}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const dataUrl = await fileToDataUrl(file);
                              setDraft(d => ({ ...d, imgId: dataUrl, galleryImgIds: d.galleryImgIds.length ? d.galleryImgIds : [dataUrl] }));
                            }}
                          />
                        </label>
                        <span style={{ fontFamily:sans, fontSize:"0.62rem", color:sub }}>or paste an Unsplash photo ID below</span>
                        <input value={draft.imgId.startsWith("data:") ? "" : draft.imgId}
                          onChange={e => setDraft(d => ({ ...d, imgId: e.target.value }))}
                          placeholder="e.g. 1602663491496-73f07481dbea"
                          style={{ padding:"8px 12px", borderRadius:9, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.78rem", color:text, background:fBg, outline:"none" }}
                        />
                        {draft.imgId && (
                          <button onClick={() => setDraft(d => ({ ...d, imgId:"" }))}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"#E8606A", fontFamily:sans, fontSize:"0.72rem", textAlign:"left", display:"flex", alignItems:"center", gap:4, padding:0 }}>
                            <Trash2 size={12}/> Remove image
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── GALLERY IMAGES ── */}
                  <div style={{ marginBottom:18, gridColumn:"1 / -1" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.14em" }}>GALLERY IMAGES</label>
                      <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:8, background:`${C.hazelnut}22`, border:`1px solid ${C.shortbread}`, color:C.hazelnut, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, cursor:"pointer" }}>
                        <Upload size={12}/> Add Images
                        <input type="file" accept="image/*" multiple style={{ display:"none" }}
                          onChange={async e => {
                            const files = Array.from(e.target.files ?? []);
                            const dataUrls = await Promise.all(files.map(fileToDataUrl));
                            setDraft(d => ({ ...d, galleryImgIds: [...d.galleryImgIds, ...dataUrls] }));
                          }}
                        />
                      </label>
                    </div>
                    {draft.galleryImgIds.length === 0 ? (
                      <div style={{ padding:"18px", borderRadius:12, border:`1px dashed ${border}`, textAlign:"center" }}>
                        <p style={{ fontFamily:sans, fontSize:"0.75rem", color:sub }}>No gallery images yet. Upload images or add Unsplash IDs.</p>
                        <div style={{ marginTop:10, display:"flex", gap:8, justifyContent:"center", alignItems:"center" }}>
                          <input placeholder="Unsplash photo ID"
                            style={{ padding:"7px 12px", borderRadius:9, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.75rem", color:text, background:fBg, outline:"none", width:220 }}
                            onKeyDown={e => {
                              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                                const val = (e.target as HTMLInputElement).value.trim();
                                setDraft(d => ({ ...d, galleryImgIds: [...d.galleryImgIds, val] }));
                                (e.target as HTMLInputElement).value = "";
                              }
                            }}
                          />
                          <span style={{ fontFamily:sans, fontSize:"0.65rem", color:sub }}>Press Enter to add</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                        {draft.galleryImgIds.map((gid, i) => (
                          <div key={i} style={{ position:"relative", width:90, flexShrink:0 }}>
                            <div style={{ width:90, height:68, borderRadius:10, overflow:"hidden", border:`2px solid ${draft.imgId === gid ? C.apricot : border}` }}>
                              <img src={img(gid, 180, 136)} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                            </div>
                            {/* Controls */}
                            <div style={{ display:"flex", gap:2, marginTop:4, justifyContent:"center" }}>
                              <button onClick={() => { if (i>0) setDraft(d => { const arr=[...d.galleryImgIds]; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; return {...d,galleryImgIds:arr}; }); }}
                                disabled={i===0}
                                style={{ background:"none", border:`1px solid ${border}`, borderRadius:5, padding:"2px 5px", cursor:i===0?"not-allowed":"pointer", color:sub, opacity:i===0?0.3:1 }}>
                                <ChevronLeft size={11}/>
                              </button>
                              <button onClick={() => { const n=draft.galleryImgIds.length-1; if(i<n) setDraft(d=>{const arr=[...d.galleryImgIds];[arr[i+1],arr[i]]=[arr[i],arr[i+1]];return{...d,galleryImgIds:arr};}); }}
                                disabled={i===draft.galleryImgIds.length-1}
                                style={{ background:"none", border:`1px solid ${border}`, borderRadius:5, padding:"2px 5px", cursor:i===draft.galleryImgIds.length-1?"not-allowed":"pointer", color:sub, opacity:i===draft.galleryImgIds.length-1?0.3:1 }}>
                                <ChevronRight size={11}/>
                              </button>
                              <button onClick={() => setDraft(d => ({ ...d, galleryImgIds: d.galleryImgIds.filter((_,j)=>j!==i) }))}
                                style={{ background:"none", border:`1px solid #E8606A44`, borderRadius:5, padding:"2px 5px", cursor:"pointer", color:"#E8606A" }}>
                                <Trash2 size={11}/>
                              </button>
                            </div>
                            {/* Set as main */}
                            {draft.imgId !== gid && (
                              <button onClick={() => setDraft(d => ({ ...d, imgId: gid }))}
                                style={{ display:"block", width:"100%", marginTop:3, background:"none", border:`1px solid ${border}`, borderRadius:5, padding:"2px 0", cursor:"pointer", fontFamily:sans, fontSize:"0.55rem", color:sub }}>
                                Set main
                              </button>
                            )}
                            {draft.imgId === gid && (
                              <div style={{ textAlign:"center", fontFamily:sans, fontSize:"0.55rem", color:C.apricot, marginTop:3, fontWeight:700 }}>★ Main</div>
                            )}
                          </div>
                        ))}
                        {/* Add by Unsplash ID inline */}
                        <div style={{ width:90, flexShrink:0 }}>
                          <div style={{ width:90, height:68, borderRadius:10, border:`1px dashed ${border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
                            <ImageIcon size={16} color={sub}/>
                          </div>
                          <input placeholder="Add ID + Enter"
                            style={{ marginTop:4, width:"100%", padding:"4px 6px", borderRadius:6, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.62rem", color:text, background:fBg, outline:"none", boxSizing:"border-box" }}
                            onKeyDown={e => {
                              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                                const val = (e.target as HTMLInputElement).value.trim();
                                setDraft(d => ({ ...d, galleryImgIds: [...d.galleryImgIds, val] }));
                                (e.target as HTMLInputElement).value = "";
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Field label="Tag (e.g. Bestseller, New)" value={draft.tag} onChange={v=>setDraft(d=>({...d,tag:v}))} bg={fBg} text={text} border={border}/>
                  <Field label="Ingredients (comma-separated)" value={draft.ingredients.join(", ")} onChange={v=>setDraft(d=>({...d,ingredients:v.split(",").map(s=>s.trim()).filter(Boolean)}))} bg={fBg} text={text} border={border}/>
                  <Field label="Allergens (comma-separated)" value={draft.allergens.join(", ")} onChange={v=>setDraft(d=>({...d,allergens:v.split(",").map(s=>s.trim()).filter(Boolean)}))} bg={fBg} text={text} border={border}/>
                  <Field label="Tags (comma-separated)" value={draft.tags.join(", ")} onChange={v=>setDraft(d=>({...d,tags:v.split(",").map(s=>s.trim()).filter(Boolean)}))} bg={fBg} text={text} border={border}/>

                  {/* Sizes */}
                  <div style={{ marginBottom:18 }}>
                    <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.14em", display:"block", marginBottom:8 }}>SIZES</label>
                    {draft.sizes.map((sz,i) => (
                      <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"center" }}>
                        <input value={sz.label} onChange={e=>setDraft(d=>({...d,sizes:d.sizes.map((s,j)=>j===i?{...s,label:e.target.value}:s)}))}
                          placeholder="Label" style={{ flex:2, padding:"8px 10px", borderRadius:9, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.78rem", color:text, background:fBg, outline:"none" }}/>
                        <input type="number" value={sz.price} onChange={e=>setDraft(d=>({...d,sizes:d.sizes.map((s,j)=>j===i?{...s,price:parseFloat(e.target.value)||0}:s)}))}
                          placeholder="₹" style={{ flex:1, padding:"8px 10px", borderRadius:9, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.78rem", color:text, background:fBg, outline:"none" }}/>
                        {draft.sizes.length > 1 && (
                          <button onClick={()=>setDraft(d=>({...d,sizes:d.sizes.filter((_,j)=>j!==i)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#E8606A", display:"flex" }}><X size={14}/></button>
                        )}
                      </div>
                    ))}
                    <Btn variant="ghost" small onClick={()=>setDraft(d=>({...d,sizes:[...d.sizes,{label:"",price:0}]}))}><Plus size={12}/> Add Size</Btn>
                  </div>

                  {/* Toggles */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:22, padding:"16px", background:fBg, borderRadius:14, border:`1px solid ${border}` }}>
                    {([["isNew","New Arrival"],["isBestSeller","Bestseller"],["isFeatured","Featured"],["isEggless","Eggless"],["isVegetarian","Vegetarian"],["isPremium","Premium"],["isSeasonal","Seasonal"],["isHidden","Hidden"]] as [keyof typeof draft,string][]).map(([key,label]) => (
                      <Toggle key={key} checked={draft[key] as boolean} onChange={v=>setDraft(d=>({...d,[key]:v}))} label={label} textCol={text}/>
                    ))}
                  </div>

                  <div style={{ display:"flex", gap:10 }}>
                    <Btn onClick={saveDraft}><CheckCircle2 size={15}/> {editing?"Update":"Create"} Product</Btn>
                    <Btn variant="ghost" onClick={cancelForm}>Cancel</Btn>
                  </div>
                </motion.div>
              )}

              {/* ── ORDERS ── */}
              {tab === "orders" && (
                <motion.div key="orders" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:22 }}>Orders ({orders.length})</h2>
                  {orders.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.85rem", color:sub }}>No orders yet. Completed checkouts will appear here.</p>}
                  <div style={{ display:"grid", gap:12 }}>
                    {orders.map(o => (
                      <div key={o.id} style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:14, border:`1px solid ${selectedOrder===o.id?C.apricot:border}`, padding:"16px 20px", cursor:"pointer", transition:"border 0.2s" }}
                        onClick={() => setSelectedOrder(selectedOrder===o.id?null:o.id)}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", justifyContent:"space-between" }}>
                          <div>
                            <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.84rem", color:text }}>{o.orderNum ?? `#${o.id.slice(-6)}`}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>{o.customer.name} · {o.customer.email}</p>
                          </div>
                          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                            <Badge label={o.status} color={statusColor[o.status]}/>
                            <span style={{ fontFamily:serif, fontWeight:700, color:C.peach }}>₹{o.total.toFixed(0)}</span>
                            <span style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{new Date(o.date).toLocaleDateString("en-IN")}</span>
                            <ChevronDown size={14} color={sub} style={{ transform: selectedOrder===o.id?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedOrder === o.id && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} style={{ overflow:"hidden" }}>
                              <div style={{ paddingTop:16, borderTop:`1px solid ${border}`, marginTop:14 }}>
                                {/* Items */}
                                <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:10 }}>ORDER ITEMS</p>
                                {o.items.map(item => (
                                  <div key={item.id} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                                    <img src={img(item.imgId)} alt={item.name} style={{ width:36, height:36, borderRadius:8, objectFit:"cover" }}/>
                                    <div style={{ flex:1 }}>
                                      <p style={{ fontFamily:sans, fontSize:"0.78rem", color:text }}>{item.name}</p>
                                      <p style={{ fontFamily:sans, fontSize:"0.66rem", color:sub }}>{item.size} × {item.qty}</p>
                                    </div>
                                    <span style={{ fontFamily:serif, fontWeight:700, color:C.peach }}>₹{(item.price*item.qty).toFixed(0)}</span>
                                  </div>
                                ))}
                                {/* Address */}
                                {o.address && (
                                  <p style={{ fontFamily:sans, fontSize:"0.72rem", color:sub, marginTop:12 }}>
                                    📍 {o.address.line1}{o.address.line2?`, ${o.address.line2}`:""}, {o.address.city}
                                  </p>
                                )}
                                {/* Update status */}
                                <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:14, flexWrap:"wrap" }}>
                                  <label style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:600, color:sub }}>Update status:</label>
                                  <select value={o.status} onChange={e => { updateOrderStatus(o.id, e.target.value as OrderStatus); toast(`Order ${o.orderNum ?? o.id.slice(-6)} → ${e.target.value}`, "success"); }}
                                    style={{ padding:"7px 12px", borderRadius:9, border:`1px solid ${border}`, background:fBg, color:text, fontFamily:sans, fontSize:"0.76rem", cursor:"pointer" }}>
                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── CUSTOMERS ── */}
              {tab === "customers" && (
                <motion.div key="customers" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:22 }}>Customers ({uniqueCustomers.length})</h2>
                  {uniqueCustomers.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.85rem", color:sub }}>Customers who place an order will appear here.</p>}
                  <div style={{ background: dark?"rgba(255,255,255,0.03)":"#fff", borderRadius:16, border:`1px solid ${border}`, overflow:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${border}` }}>
                          {["Customer","Email","Orders","Lifetime Spend"].map(h => (
                            <th key={h} style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.1em", padding:"12px 16px", textAlign:"left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueCustomers.sort((a,b)=>b.spent-a.spent).map(c => (
                          <tr key={c.email} style={{ borderBottom:`1px solid ${border}` }}>
                            <td style={{ padding:"12px 16px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ width:34, height:34, borderRadius:"50%", background:C.apricot, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  <span style={{ fontFamily:sans, fontWeight:700, fontSize:"0.76rem", color:"#fff" }}>{c.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
                                </div>
                                <span style={{ fontFamily:sans, fontWeight:600, fontSize:"0.82rem", color:text }}>{c.name}</span>
                              </div>
                            </td>
                            <td style={{ padding:"12px 16px", fontFamily:sans, fontSize:"0.76rem", color:sub }}>{c.email}</td>
                            <td style={{ padding:"12px 16px" }}><Badge label={`${c.count} order${c.count!==1?"s":""}`} color={C.lilac}/></td>
                            <td style={{ padding:"12px 16px", fontFamily:serif, fontWeight:700, color:C.apricot }}>₹{c.spent.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ── REVIEWS ── */}
              {tab === "reviews" && (
                <motion.div key="reviews" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:22 }}>
                    <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text }}>Reviews ({allReviews.length})</h2>
                    <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                      {(["all","verified","hidden"] as const).map(f => (
                        <button key={f} onClick={()=>setReviewFilter(f)}
                          style={{ padding:"7px 14px", borderRadius:100, border:`1px solid ${f===reviewFilter?C.apricot:border}`, background: f===reviewFilter?`${C.apricot}22`:"transparent", color: f===reviewFilter?C.apricot:sub, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    {filteredReviews.map(r => (
                      <div key={r.id} style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:14, border:`1px solid ${r.hidden?C.peach+"55":border}`, padding:"16px 20px", opacity:r.hidden?0.6:1 }}>
                        <div style={{ display:"flex", gap:10, justifyContent:"space-between", flexWrap:"wrap", marginBottom:10 }}>
                          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <div style={{ width:36, height:36, borderRadius:"50%", background:C.lilac, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <span style={{ fontFamily:sans, fontWeight:700, fontSize:"0.7rem", color:"#fff" }}>{r.userInitials}</span>
                            </div>
                            <div>
                              <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.82rem", color:text }}>{r.userName}</p>
                              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                <span style={{ color:C.apricot }}>{Array.from({length:5}).map((_,i)=>i<r.rating?"★":"☆").join("")}</span>
                                {r.verified && <Badge label="Verified" color={C.mint}/>}
                                {r.hidden && <Badge label="Hidden" color={C.peach}/>}
                                <span style={{ fontFamily:sans, fontSize:"0.65rem", color:sub }}>{new Date(r.date).toLocaleDateString("en-IN")}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            <Btn variant="ghost" small onClick={()=>hideReview(r.id)}>{r.hidden?<Eye size={12}/>:<EyeOff size={12}/>} {r.hidden?"Show":"Hide"}</Btn>
                            <Btn variant="danger" small onClick={()=>deleteReview(r.id)}><Trash2 size={12}/></Btn>
                          </div>
                        </div>
                        <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.82rem", color:text, marginBottom:4 }}>{r.title}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub, lineHeight:1.6, marginBottom:12 }}>{r.text}</p>
                        {r.ownerReply && (
                          <div style={{ background: dark?"rgba(255,255,255,0.05)":C.oats, borderRadius:10, padding:"12px 14px", borderLeft:`3px solid ${C.apricot}`, marginBottom:12 }}>
                            <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:C.apricot, marginBottom:4 }}>OWNER REPLY</p>
                            <p style={{ fontFamily:sans, fontSize:"0.78rem", color:text }}>{r.ownerReply.text}</p>
                          </div>
                        )}
                        {!r.ownerReply && (
                          <div style={{ display:"flex", gap:8 }}>
                            <input value={replyText[r.id]??""} onChange={e=>setReplyText(p=>({...p,[r.id]:e.target.value}))}
                              placeholder="Write owner reply…"
                              style={{ flex:1, padding:"8px 12px", borderRadius:9, border:`1px solid ${border}`, background:fBg, color:text, fontFamily:sans, fontSize:"0.78rem", outline:"none" }}/>
                            <Btn small onClick={()=>{ if(replyText[r.id]?.trim()){ addOwnerReply(r.id, replyText[r.id]); setReplyText(p=>({...p,[r.id]:""})); toast("Reply posted","success"); } }}>
                              <MessageSquare size={12}/> Reply
                            </Btn>
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredReviews.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.85rem", color:sub, padding:24 }}>No reviews match this filter.</p>}
                  </div>
                </motion.div>
              )}

              {/* ── COUPONS ── */}
              {tab === "coupons" && (
                <motion.div key="coupons" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:22 }}>Coupons</h2>

                  {/* Add form */}
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px", marginBottom:24 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:C.apricot, letterSpacing:"0.1em", marginBottom:14 }}>ADD NEW COUPON</p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
                      <Field label="Code" value={couponDraft.code} onChange={v=>setCouponDraft(d=>({...d,code:v.toUpperCase()}))} placeholder="e.g. SUMMER20" bg={fBg} text={text} border={border}/>
                      <Field label="Discount (%)" type="number" value={couponDraft.discount} onChange={v=>setCouponDraft(d=>({...d,discount:parseInt(v)||0}))} bg={fBg} text={text} border={border}/>
                      <Field label="Min Order (₹)" type="number" value={couponDraft.minOrder} onChange={v=>setCouponDraft(d=>({...d,minOrder:parseInt(v)||0}))} bg={fBg} text={text} border={border}/>
                      <Field label="Max Discount (₹)" type="number" value={couponDraft.maxDiscount} onChange={v=>setCouponDraft(d=>({...d,maxDiscount:parseInt(v)||0}))} bg={fBg} text={text} border={border}/>
                      <Field label="Expires At" type="date" value={couponDraft.expiresAt} onChange={v=>setCouponDraft(d=>({...d,expiresAt:v}))} bg={fBg} text={text} border={border}/>
                      <Field label="Description" value={couponDraft.description} onChange={v=>setCouponDraft(d=>({...d,description:v}))} placeholder="Short description" bg={fBg} text={text} border={border}/>
                    </div>
                    <Btn onClick={handleAddCoupon}><Plus size={14}/> Add Coupon</Btn>
                  </div>

                  {/* Coupon list */}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {coupons.map(c => (
                      <div key={c.id} style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center", justifyContent:"space-between", background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:14, border:`1px solid ${c.active?border:C.peach+"44"}`, padding:"14px 18px", opacity:c.active?1:0.55 }}>
                        <div>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                            <span style={{ fontFamily:sans, fontWeight:700, fontSize:"0.88rem", color:C.apricot, letterSpacing:"0.08em" }}>{c.code}</span>
                            <Badge label={`${c.discount}% OFF`} color={C.mint}/>
                            {!c.active && <Badge label="Inactive" color={C.peach}/>}
                          </div>
                          <p style={{ fontFamily:sans, fontSize:"0.72rem", color:sub }}>{c.description || "No description"} · Min ₹{c.minOrder} · Max ₹{c.maxDiscount} off · Expires {c.expiresAt}</p>
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <Btn variant="ghost" small onClick={()=>toggleCoupon(c.id)}>{c.active?"Deactivate":"Activate"}</Btn>
                          <Btn variant="danger" small onClick={()=>deleteCoupon(c.id)}><Trash2 size={12}/></Btn>
                        </div>
                      </div>
                    ))}
                    {coupons.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.85rem", color:sub }}>No coupons yet.</p>}
                  </div>
                </motion.div>
              )}

              {/* ── ANALYTICS ── */}
              {tab === "analytics" && (
                <motion.div key="analytics" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:22 }}>Analytics</h2>

                  {/* Revenue bar chart */}
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"22px 24px", marginBottom:22 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:18 }}>REVENUE — LAST 7 DAYS</p>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:120 }}>
                      {last7.map(d => (
                        <div key={d.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                          <span style={{ fontFamily:sans, fontSize:"0.6rem", color:sub }}>{d.rev>0?`₹${d.rev.toFixed(0)}`:""}</span>
                          <motion.div initial={{ height:0 }} animate={{ height: `${d.rev > 0 ? (d.rev / maxRev) * 80 : 4}px` }} transition={{ duration:0.6, delay:0.05 }}
                            style={{ width:"100%", background: d.rev>0?`linear-gradient(to top,${C.hazelnut},${C.apricot})`:"rgba(255,255,255,0.08)", borderRadius:"6px 6px 0 0", minHeight:4 }}/>
                          <span style={{ fontFamily:sans, fontSize:"0.65rem", color:sub }}>{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:22 }}>
                    {/* Top 5 products */}
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px" }}>
                      <p style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:16 }}>TOP 5 PRODUCTS</p>
                      {topProducts.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>No sales yet.</p>}
                      {topProducts.map(([name,qty],i) => {
                        const maxQty = topProducts[0]?.[1] ?? 1;
                        return (
                          <div key={name} style={{ marginBottom:12 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                              <span style={{ fontFamily:sans, fontSize:"0.76rem", color:text }}>{i+1}. {name}</span>
                              <span style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:C.apricot }}>{qty} sold</span>
                            </div>
                            <div style={{ height:6, borderRadius:100, background:dark?"rgba(255,255,255,0.08)":C.oats, overflow:"hidden" }}>
                              <motion.div initial={{width:0}} animate={{width:`${(qty/maxQty)*100}%`}} transition={{duration:0.8,delay:i*0.1}}
                                style={{ height:"100%", background:`linear-gradient(90deg,${C.hazelnut},${C.apricot})`, borderRadius:100 }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Revenue by category */}
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"20px 22px" }}>
                      <p style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:16 }}>REVENUE BY CATEGORY</p>
                      {catBreakdown.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>No data yet.</p>}
                      {catBreakdown.map(([cat,rev],i) => {
                        const maxCat = catBreakdown[0]?.[1] ?? 1;
                        const colors = [C.apricot, C.mint, C.lilac, C.peach, C.shortbread, "#5DADE2"];
                        return (
                          <div key={cat} style={{ marginBottom:12 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                              <span style={{ fontFamily:sans, fontSize:"0.76rem", color:text }}>{cat}</span>
                              <span style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:colors[i%colors.length] }}>₹{rev.toFixed(0)}</span>
                            </div>
                            <div style={{ height:6, borderRadius:100, background:dark?"rgba(255,255,255,0.08)":C.oats, overflow:"hidden" }}>
                              <motion.div initial={{width:0}} animate={{width:`${(rev/maxCat)*100}%`}} transition={{duration:0.8,delay:i*0.1}}
                                style={{ height:"100%", background:colors[i%colors.length], borderRadius:100 }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14 }}>
                    {[
                      { label:"Products Listed", value:String(products.length), color:C.mint },
                      { label:"Active Coupons", value:String(coupons.filter(c=>c.active).length), color:C.lilac },
                      { label:"Total Reviews", value:String(allReviews.length), color:C.apricot },
                      { label:"Avg Rating", value: allReviews.length ? (allReviews.reduce((s,r)=>s+r.rating,0)/allReviews.length).toFixed(1) : "—", color:C.peach },
                    ].map(s => (
                      <div key={s.label} style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:14, border:`1px solid ${border}`, padding:"16px 18px" }}>
                        <p style={{ fontFamily:serif, fontSize:"1.4rem", fontWeight:700, color:s.color }}>{s.value}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub, marginTop:4 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── SETTINGS ── */}
              {tab === "settings" && (
                <motion.div key="settings" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{ maxWidth:640 }}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.8rem", fontWeight:700, color:text, marginBottom:22 }}>Store Settings</h2>
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"22px 24px", marginBottom:20 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:C.apricot, letterSpacing:"0.12em", marginBottom:16 }}>STORE INFO</p>
                    <Field label="Store Name" value={settingsForm.storeName} onChange={v=>setSettingsForm(s=>({...s,storeName:v}))} bg={fBg} text={text} border={border}/>
                    <Field label="Tagline" value={settingsForm.tagline} onChange={v=>setSettingsForm(s=>({...s,tagline:v}))} bg={fBg} text={text} border={border}/>
                    <Field label="Phone" value={settingsForm.phone} onChange={v=>setSettingsForm(s=>({...s,phone:v}))} bg={fBg} text={text} border={border}/>
                    <Field label="Email" value={settingsForm.email} onChange={v=>setSettingsForm(s=>({...s,email:v}))} bg={fBg} text={text} border={border}/>
                    <Field label="Address" value={settingsForm.address} onChange={v=>setSettingsForm(s=>({...s,address:v}))} textarea bg={fBg} text={text} border={border}/>
                  </div>
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"22px 24px", marginBottom:20 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:C.apricot, letterSpacing:"0.12em", marginBottom:16 }}>OPERATING HOURS</p>
                    <Field label="Working Hours" value={settingsForm.hours} onChange={v=>setSettingsForm(s=>({...s,hours:v}))} placeholder="e.g. Tue–Sun 8am–8pm" bg={fBg} text={text} border={border}/>
                  </div>
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":"#fff", borderRadius:16, border:`1px solid ${border}`, padding:"22px 24px", marginBottom:24 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:C.apricot, letterSpacing:"0.12em", marginBottom:16 }}>DELIVERY SETTINGS</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      <Field label="Delivery Radius (km)" type="number" value={settingsForm.deliveryRadius} onChange={v=>setSettingsForm(s=>({...s,deliveryRadius:v}))} bg={fBg} text={text} border={border}/>
                      <Field label="Min Order (₹)" type="number" value={settingsForm.minOrder} onChange={v=>setSettingsForm(s=>({...s,minOrder:v}))} bg={fBg} text={text} border={border}/>
                    </div>
                  </div>
                  <Btn onClick={saveSettings}><CheckCircle2 size={15}/> Save Settings</Btn>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Confirm delete dialog */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
                <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
                  style={{ background: dark?"#221609":"#fff", borderRadius:18, padding:"28px 30px", maxWidth:380, width:"100%", textAlign:"center" }}>
                  <AlertTriangle size={32} color="#E8606A" style={{ marginBottom:14 }}/>
                  <h3 style={{ fontFamily:serif, fontSize:"1.2rem", color:text, marginBottom:10 }}>Delete Product?</h3>
                  <p style={{ fontFamily:sans, fontSize:"0.8rem", color:sub, marginBottom:22 }}>This action cannot be undone.</p>
                  <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                    <Btn variant="ghost" onClick={()=>setConfirmDelete(null)}>Cancel</Btn>
                    <Btn variant="danger" onClick={()=>{ deleteProduct(confirmDelete); toast("Product deleted","info"); setConfirmDelete(null); }}>
                      <Trash2 size={14}/> Delete
                    </Btn>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
