import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, User, MapPin, CreditCard, ShoppingBag, Bell, Heart,
  Plus, Trash2, Check, Home, Briefcase, Star, Edit2, LogOut,
  ChevronRight, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useOrders } from "../contexts/OrderContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";
import { useProductStore } from "../contexts/ProductStoreContext";
import type { Product } from "../data/products";
import type { SavedAddress, SavedCard } from "../contexts/AuthContext";
import type { OrderStatus } from "../contexts/OrderContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const imgUrl = (id: string) => `https://images.unsplash.com/photo-${id}?w=56&h=56&fit=crop&auto=format&q=80`;

type Tab = "profile"|"addresses"|"cards"|"orders"|"notifications"|"wishlist";

interface Props {
  open: boolean;
  onClose: () => void;
  dark: boolean;
  onOrderTrack: (orderId: string) => void;
  onProduct: (p: Product) => void;
}

const statusColor: Record<OrderStatus, string> = {
  "Order Confirmed": C.lilac, "Preparing": C.apricot, "Baking": C.peach, "Decorating": "#F4D03F",
  "Packaging": C.mint, "Out For Delivery": "#5DADE2", "Delivered": "#27AE60",
};

function SmField({ label, value, onChange, type="text", dark: d }: { label:string; value:string; onChange:(v:string)=>void; type?:string; dark:boolean }) {
  const bg = d ? "rgba(255,255,255,0.06)" : C.oats;
  const text = d ? C.crema : C.cocoa;
  const border = d ? "rgba(255,255,255,0.1)" : C.shortbread;
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.16em", display:"block", marginBottom:5 }}>{label.toUpperCase()}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${border}`, background:bg, color:text, fontFamily:sans, fontSize:"0.82rem", outline:"none", boxSizing:"border-box" }}/>
    </div>
  );
}

function Btn({ children, onClick, variant="primary", small }: { children:React.ReactNode; onClick?:()=>void; variant?:"primary"|"ghost"|"danger"|"mint"; small?:boolean }) {
  const s: Record<string,React.CSSProperties> = {
    primary:{ background:C.hazelnut, color:"#fff" },
    ghost:  { background:"transparent", color:C.hazelnut, border:`1px solid ${C.shortbread}` },
    danger: { background:"#E8606A", color:"#fff" },
    mint:   { background:C.mint, color:C.cocoa },
  };
  return (
    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={onClick}
      style={{ ...s[variant], border:(s[variant].border as string)??"none", borderRadius:9, padding:small?"6px 14px":"10px 20px", fontFamily:sans, fontSize:small?"0.7rem":"0.8rem", fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
      {children}
    </motion.button>
  );
}

const ADDR_LABELS = ["Home","Work","Other"] as const;
const CARD_BRANDS = ["Visa","Mastercard","RuPay","AmEx"] as const;

const emptyAddr: Omit<SavedAddress,"id"> = { label:"Home", name:"", phone:"", line1:"", line2:"", city:"", state:"", pincode:"", isDefault:false };
const emptyCard: Omit<SavedCard,"id"> = { last4:"", brand:"Visa", expiry:"", name:"" };

export function UserProfileModal({ open, onClose, dark, onOrderTrack, onProduct }: Props) {
  const { user, addresses, savedCards, logout, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, addCard, removeCard } = useAuth();
  const { orders } = useOrders();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const { add: addToCart } = useCart();
  const { products } = useProductStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("profile");
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });
  const [editingAddr, setEditingAddr] = useState<SavedAddress | null>(null);
  const [addingAddr, setAddingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState<Omit<SavedAddress,"id">>({ ...emptyAddr });
  const [addingCard, setAddingCard] = useState(false);
  const [cardForm, setCardForm] = useState<Omit<SavedCard,"id">>({ ...emptyCard });
  const [showCardNum, setShowCardNum] = useState(false);

  const bg     = dark ? "#1A1008" : C.crema;
  const panel  = dark ? "#221609" : "#fff";
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const border = dark ? "rgba(255,255,255,0.09)" : C.shortbread;
  const fBg    = dark ? "rgba(255,255,255,0.06)" : C.oats;

  const wishlistProducts = products.filter(p => wishlistIds.has(p.id));
  const userOrders = orders;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id:"profile",       label:"Profile",       icon:<User size={14}/> },
    { id:"addresses",     label:"Addresses",     icon:<MapPin size={14}/>, badge: addresses.length },
    { id:"cards",         label:"Cards",         icon:<CreditCard size={14}/>, badge: savedCards.length },
    { id:"orders",        label:"Orders",        icon:<ShoppingBag size={14}/>, badge: userOrders.length },
    { id:"notifications", label:"Notifications", icon:<Bell size={14}/>, badge: unreadCount||undefined },
    { id:"wishlist",      label:"Wishlist",      icon:<Heart size={14}/>, badge: wishlistIds.size||undefined },
  ];

  const saveProfile = () => {
    if (!profileForm.name.trim()) { toast("Name is required","error"); return; }
    const initials = profileForm.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    updateProfile({ name: profileForm.name, phone: profileForm.phone, initials });
    toast("Profile updated ✓","success");
  };

  const saveAddr = () => {
    if (!addrForm.name || !addrForm.line1 || !addrForm.city || !addrForm.pincode) {
      toast("Please fill all required fields","error"); return;
    }
    if (editingAddr) { updateAddress(editingAddr.id, addrForm); toast("Address updated","success"); }
    else { addAddress(addrForm); toast("Address saved","success"); }
    setAddingAddr(false); setEditingAddr(null); setAddrForm({ ...emptyAddr });
  };

  const saveCard = () => {
    if (!cardForm.last4 || cardForm.last4.length !== 4 || !cardForm.expiry || !cardForm.name) {
      toast("Please fill all card details","error"); return;
    }
    addCard(cardForm);
    toast("Card saved","success");
    setAddingCard(false); setCardForm({ ...emptyCard });
  };

  const brandIcon: Record<string,string> = { Visa:"💳", Mastercard:"🟠", RuPay:"🇮🇳", AmEx:"🔵" };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="upm-bg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", zIndex:450 }}/>
          <motion.div key="upm-modal"
            initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} exit={{opacity:0,y:32}}
            transition={{duration:0.32,ease:[0.16,1,0.3,1]}}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(860px,96vw)", maxHeight:"90vh", background:bg, borderRadius:24, border:`1px solid ${border}`, boxShadow:"0 30px 80px rgba(0,0,0,0.35)", zIndex:451, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Header */}
            <div style={{ padding:"18px 24px 0", flexShrink:0, borderBottom:`1px solid ${border}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,${C.apricot},${C.peach})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:serif, fontWeight:700, fontSize:"1rem", color:"#fff" }}>{user?.initials ?? "?"}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily:serif, fontWeight:700, fontSize:"1.1rem", color:text }}>{user?.name ?? "Guest"}</p>
                    <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{user?.email} · Member since {user?.memberSince}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ logout(); onClose(); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:9, background:"transparent", border:`1px solid ${border}`, color:sub, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, cursor:"pointer" }}>
                    <LogOut size={12}/> Sign Out
                  </button>
                  <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:6 }}><X size={20}/></button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", border:"none", borderBottom:`2.5px solid ${tab===t.id?C.apricot:"transparent"}`, background:"transparent", color:tab===t.id?C.apricot:sub, fontFamily:sans, fontSize:"0.74rem", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", position:"relative", flexShrink:0 }}>
                    {t.icon} {t.label}
                    {t.badge !== undefined && t.badge > 0 && (
                      <span style={{ background:t.id==="notifications"?"#E8606A":C.apricot, color:"#fff", fontSize:"0.58rem", fontWeight:700, borderRadius:100, padding:"1px 6px", marginLeft:2 }}>{t.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 28px" }}>
              <AnimatePresence mode="wait">

                {/* PROFILE */}
                {tab === "profile" && (
                  <motion.div key="profile" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    <div style={{ maxWidth:480 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:6 }}>
                        <SmField label="Full Name" value={profileForm.name} onChange={v=>setProfileForm(f=>({...f,name:v}))} dark={dark}/>
                        <SmField label="Phone" value={profileForm.phone} onChange={v=>setProfileForm(f=>({...f,phone:v}))} dark={dark}/>
                      </div>
                      <div style={{ marginBottom:18, padding:"12px 16px", background:fBg, borderRadius:12, border:`1px solid ${border}` }}>
                        <p style={{ fontFamily:sans, fontSize:"0.66rem", color:sub, marginBottom:4 }}>EMAIL (read-only)</p>
                        <p style={{ fontFamily:sans, fontSize:"0.82rem", color:text }}>{user?.email}</p>
                      </div>
                      <Btn onClick={saveProfile}><Check size={14}/> Save Profile</Btn>

                      {/* Stats */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:24 }}>
                        {[
                          { label:"Loyalty Points", value:String(user?.points ?? 0), color:C.apricot },
                          { label:"Total Orders", value:String(userOrders.length), color:C.mint },
                          { label:"Member Since", value:user?.memberSince ?? "—", color:C.lilac },
                        ].map(s => (
                          <div key={s.label} style={{ background:fBg, borderRadius:14, padding:"14px 16px", border:`1px solid ${border}`, textAlign:"center" }}>
                            <p style={{ fontFamily:serif, fontSize:"1.3rem", fontWeight:700, color:s.color }}>{s.value}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.64rem", color:sub, marginTop:4 }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ADDRESSES */}
                {tab === "addresses" && (
                  <motion.div key="addresses" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    {!addingAddr && !editingAddr && (
                      <>
                        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
                          <Btn onClick={()=>{ setAddingAddr(true); setAddrForm({...emptyAddr}); }}><Plus size={13}/> Add Address</Btn>
                        </div>
                        {addresses.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"20px 0" }}>No saved addresses yet.</p>}
                        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                          {addresses.map(a => {
                            const Icon = a.label === "Home" ? Home : a.label === "Work" ? Briefcase : Star;
                            return (
                              <div key={a.id} style={{ background:panel, borderRadius:14, border:`1.5px solid ${a.isDefault?C.apricot:border}`, padding:"14px 18px" }}>
                                <div style={{ display:"flex", gap:10, justifyContent:"space-between", flexWrap:"wrap" }}>
                                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${C.apricot}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                                      <Icon size={16} color={C.apricot}/>
                                    </div>
                                    <div>
                                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                                        <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.84rem", color:text }}>{a.label} — {a.name}</p>
                                        {a.isDefault && <span style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, background:`${C.mint}22`, color:C.mint, border:`1px solid ${C.mint}44`, borderRadius:100, padding:"2px 8px" }}>Default</span>}
                                      </div>
                                      <p style={{ fontFamily:sans, fontSize:"0.74rem", color:sub, lineHeight:1.6 }}>
                                        {a.line1}{a.line2?`, ${a.line2}`:""}<br/>{a.city}, {a.state} {a.pincode}
                                      </p>
                                      <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>{a.phone}</p>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                    {!a.isDefault && <Btn variant="ghost" small onClick={()=>{ setDefaultAddress(a.id); toast("Default address updated","success"); }}>Set Default</Btn>}
                                    <Btn variant="ghost" small onClick={()=>{ setEditingAddr(a); setAddrForm({ label:a.label, name:a.name, phone:a.phone, line1:a.line1, line2:a.line2??"", city:a.city, state:a.state, pincode:a.pincode, isDefault:a.isDefault }); }}><Edit2 size={11}/></Btn>
                                    <Btn variant="danger" small onClick={()=>{ deleteAddress(a.id); toast("Address removed","info"); }}><Trash2 size={11}/></Btn>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {(addingAddr || editingAddr) && (
                      <div style={{ maxWidth:480 }}>
                        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:18 }}>
                          <Btn variant="ghost" small onClick={()=>{ setAddingAddr(false); setEditingAddr(null); }}><X size={12}/> Cancel</Btn>
                          <h3 style={{ fontFamily:serif, fontSize:"1.1rem", fontWeight:700, color:text }}>{editingAddr?"Edit Address":"New Address"}</h3>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <label style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.16em", display:"block", marginBottom:5 }}>LABEL</label>
                          <div style={{ display:"flex", gap:8 }}>
                            {ADDR_LABELS.map(l => (
                              <button key={l} onClick={()=>setAddrForm(f=>({...f,label:l}))}
                                style={{ padding:"7px 16px", borderRadius:100, border:`1.5px solid ${addrForm.label===l?C.apricot:border}`, background:addrForm.label===l?`${C.apricot}22`:"transparent", color:addrForm.label===l?C.apricot:sub, fontFamily:sans, fontSize:"0.74rem", fontWeight:600, cursor:"pointer" }}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                          <SmField label="Full Name" value={addrForm.name} onChange={v=>setAddrForm(f=>({...f,name:v}))} dark={dark}/>
                          <SmField label="Phone" value={addrForm.phone} onChange={v=>setAddrForm(f=>({...f,phone:v}))} dark={dark}/>
                        </div>
                        <SmField label="Address Line 1" value={addrForm.line1} onChange={v=>setAddrForm(f=>({...f,line1:v}))} dark={dark}/>
                        <SmField label="Address Line 2 (optional)" value={addrForm.line2??""} onChange={v=>setAddrForm(f=>({...f,line2:v}))} dark={dark}/>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                          <SmField label="City" value={addrForm.city} onChange={v=>setAddrForm(f=>({...f,city:v}))} dark={dark}/>
                          <SmField label="State" value={addrForm.state} onChange={v=>setAddrForm(f=>({...f,state:v}))} dark={dark}/>
                          <SmField label="Pincode" value={addrForm.pincode} onChange={v=>setAddrForm(f=>({...f,pincode:v}))} dark={dark}/>
                        </div>
                        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:18, fontFamily:sans, fontSize:"0.78rem", color:text }}>
                          <input type="checkbox" checked={addrForm.isDefault} onChange={e=>setAddrForm(f=>({...f,isDefault:e.target.checked}))} style={{ accentColor:C.apricot }}/>
                          Set as default address
                        </label>
                        <Btn onClick={saveAddr}><Check size={14}/> Save Address</Btn>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* SAVED CARDS */}
                {tab === "cards" && (
                  <motion.div key="cards" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    {!addingCard && (
                      <>
                        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
                          <Btn onClick={()=>setAddingCard(true)}><Plus size={13}/> Add Card</Btn>
                        </div>
                        {savedCards.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"20px 0" }}>No saved cards yet.</p>}
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                          {savedCards.map(c => (
                            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, background:panel, borderRadius:14, border:`1px solid ${border}`, padding:"14px 18px" }}>
                              <span style={{ fontSize:"1.6rem" }}>{brandIcon[c.brand]}</span>
                              <div style={{ flex:1 }}>
                                <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.84rem", color:text }}>{c.brand} •••• {c.last4}</p>
                                <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>{c.name} · Expires {c.expiry}</p>
                              </div>
                              <Btn variant="danger" small onClick={()=>{ removeCard(c.id); toast("Card removed","info"); }}><Trash2 size={12}/></Btn>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {addingCard && (
                      <div style={{ maxWidth:440 }}>
                        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:18 }}>
                          <Btn variant="ghost" small onClick={()=>setAddingCard(false)}><X size={12}/> Cancel</Btn>
                          <h3 style={{ fontFamily:serif, fontSize:"1.1rem", fontWeight:700, color:text }}>Add New Card</h3>
                        </div>
                        <SmField label="Cardholder Name" value={cardForm.name} onChange={v=>setCardForm(f=>({...f,name:v}))} dark={dark}/>
                        <div style={{ marginBottom:12 }}>
                          <label style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.16em", display:"block", marginBottom:5 }}>LAST 4 DIGITS</label>
                          <div style={{ position:"relative" }}>
                            <input type={showCardNum?"text":"password"} value={cardForm.last4} onChange={e=>setCardForm(f=>({...f,last4:e.target.value.slice(0,4)}))} maxLength={4} placeholder="1234"
                              style={{ width:"100%", padding:"9px 40px 9px 12px", borderRadius:10, border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, background:fBg, color:text, fontFamily:sans, fontSize:"0.82rem", outline:"none", boxSizing:"border-box" }}/>
                            <button onClick={()=>setShowCardNum(!showCardNum)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:sub, display:"flex" }}>
                              {showCardNum?<EyeOff size={14}/>:<Eye size={14}/>}
                            </button>
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                          <div style={{ marginBottom:12 }}>
                            <label style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:C.hazelnut, letterSpacing:"0.16em", display:"block", marginBottom:5 }}>BRAND</label>
                            <select value={cardForm.brand} onChange={e=>setCardForm(f=>({...f,brand:e.target.value as SavedCard["brand"]}))}
                              style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, background:fBg, color:text, fontFamily:sans, fontSize:"0.82rem", outline:"none" }}>
                              {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                          <SmField label="Expiry (MM/YY)" value={cardForm.expiry} onChange={v=>setCardForm(f=>({...f,expiry:v}))} placeholder="MM/YY" dark={dark}/>
                        </div>
                        <Btn onClick={saveCard}><Check size={14}/> Save Card</Btn>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ORDERS */}
                {tab === "orders" && (
                  <motion.div key="orders" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    {userOrders.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"20px 0" }}>No orders yet. Start shopping! 🥐</p>}
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {userOrders.map(o => (
                        <div key={o.id} style={{ background:panel, borderRadius:14, border:`1px solid ${border}`, padding:"14px 18px" }}>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                            <div>
                              <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.84rem", color:text }}>{o.orderNum ?? `#${o.id.slice(-6)}`}</p>
                              <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{new Date(o.date).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</p>
                            </div>
                            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                              <span style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, background:`${statusColor[o.status]}22`, color:statusColor[o.status], border:`1px solid ${statusColor[o.status]}44`, borderRadius:100, padding:"3px 10px" }}>{o.status}</span>
                              <span style={{ fontFamily:serif, fontWeight:700, color:C.peach, fontSize:"0.92rem" }}>₹{o.total.toFixed(0)}</span>
                              <button onClick={()=>{ onOrderTrack(o.id); onClose(); }}
                                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:9, border:`1px solid ${border}`, background:"transparent", color:C.hazelnut, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, cursor:"pointer" }}>
                                Track <ChevronRight size={12}/>
                              </button>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            {o.items.slice(0,3).map(item => (
                              <img key={item.id} src={imgUrl(item.imgId)} alt={item.name} title={item.name}
                                style={{ width:36, height:36, borderRadius:8, objectFit:"cover", border:`1px solid ${border}` }}/>
                            ))}
                            {o.items.length > 3 && <div style={{ width:36, height:36, borderRadius:8, background:fBg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:sans, fontSize:"0.64rem", color:sub }}>+{o.items.length-3}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* NOTIFICATIONS */}
                {tab === "notifications" && (
                  <motion.div key="notifications" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:16 }}>
                      {unreadCount > 0 && <Btn variant="ghost" small onClick={markAllRead}><Check size={12}/> Mark All Read</Btn>}
                      {notifications.length > 0 && <Btn variant="danger" small onClick={()=>{ clearAll(); toast("Notifications cleared","info"); }}><Trash2 size={12}/> Clear All</Btn>}
                    </div>
                    {notifications.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"20px 0" }}>No notifications yet.</p>}
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {notifications.map(n => (
                        <motion.div key={n.id} layout
                          style={{ background: n.read?panel:`${C.apricot}12`, borderRadius:14, border:`1px solid ${n.read?border:C.apricot+"44"}`, padding:"14px 18px", cursor:"pointer" }}
                          onClick={()=>markRead(n.id)}>
                          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                            <span style={{ fontSize:"1.2rem", flexShrink:0 }}>{n.icon ?? (n.type==="order"?"🛒":n.type==="promo"?"🎁":"🔔")}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text }}>{n.title}</p>
                                {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:C.peach, flexShrink:0, marginTop:3 }}/>}
                              </div>
                              <p style={{ fontFamily:sans, fontSize:"0.74rem", color:sub, lineHeight:1.5 }}>{n.message}</p>
                              <p style={{ fontFamily:sans, fontSize:"0.62rem", color:sub, marginTop:6, opacity:0.6 }}>
                                {new Date(n.date).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* WISHLIST */}
                {tab === "wishlist" && (
                  <motion.div key="wishlist" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0}}>
                    {wishlistProducts.length === 0 && <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, padding:"20px 0" }}>Your wishlist is empty. Browse products and tap the heart! ❤️</p>}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
                      {wishlistProducts.map(p => (
                        <div key={p.id} style={{ background:panel, borderRadius:16, border:`1px solid ${border}`, overflow:"hidden" }}>
                          <div style={{ position:"relative", cursor:"pointer" }} onClick={()=>{ onProduct(p); onClose(); }}>
                            <img src={imgUrl(p.imgId)} alt={p.name} style={{ width:"100%", height:130, objectFit:"cover", display:"block" }}/>
                            <button onClick={e=>{ e.stopPropagation(); toggleWishlist(p.id); }}
                              style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.45)", border:"none", borderRadius:"50%", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#ff6b6b" }}>
                              <Heart size={14} fill="#ff6b6b"/>
                            </button>
                          </div>
                          <div style={{ padding:"12px 14px" }}>
                            <p style={{ fontFamily:serif, fontWeight:700, fontSize:"0.84rem", color:text, marginBottom:2 }}>{p.name}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub, marginBottom:10 }}>{p.category}</p>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                              <span style={{ fontFamily:serif, fontWeight:700, fontSize:"0.96rem", color:C.peach }}>₹{p.price}</span>
                              <button onClick={()=>{ addToCart({ productId:p.id, name:p.name, price:p.price, qty:1, imgId:p.imgId, size:p.sizes[0]?.label??"Standard", category:p.category }); toast(`${p.name} added to cart 🛒`,"success"); }}
                                style={{ padding:"6px 14px", borderRadius:9, background:C.hazelnut, color:"#fff", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.72rem", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                                <Plus size={12}/> Add
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
