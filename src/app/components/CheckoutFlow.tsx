import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Check, ChevronRight, ChevronLeft, Package, Truck, Zap, Tag, CreditCard,
  MapPin, User, Mail, Phone, Home, Briefcase, Star, Plus, FileText,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { useSound } from "../contexts/SoundContext";
import { useOrders } from "../contexts/OrderContext";
import { useCoupons } from "../contexts/CouponsContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { deliveryApi, paymentApi } from "../../lib/api";
import { AddressMapPicker } from "./AddressMapPicker";
import type { SavedAddress } from "../contexts/AuthContext";
import { resolveImage } from "../../lib/image";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const imgUrl = (id: string) => resolveImage(id, 64, 64, 80);

type Step = "review"|"contact"|"address"|"delivery"|"coupon"|"payment"|"success";
const STEPS: Step[] = ["review","contact","address","delivery","coupon","payment","success"];
const STEP_LABELS: Record<Step,string> = { review:"Review", contact:"Contact", address:"Address", delivery:"Delivery", coupon:"Coupon", payment:"Payment", success:"Done!" };

const DELIVERY_OPTIONS = [
  { id:"standard", label:"Standard Delivery", desc:"3–5 business days", price:49, Icon:Package },
  { id:"express",  label:"Express Delivery",  desc:"Next business day",  price:99, Icon:Truck },
  { id:"sameday",  label:"Same-Day Delivery", desc:"Order before 12pm",  price:149, Icon:Zap },
];

type PayMethod = "cod"|"card"|"upi"|"netbanking";

interface Props { open: boolean; onClose: () => void; dark: boolean; onOrderTrack?: (id: string) => void; }

function InpField({ label, value, onChange, type="text", placeholder, icon, dark: d }: {
  label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder:string; icon:React.ReactNode; dark:boolean;
}) {
  const bg = d ? "rgba(255,255,255,0.06)" : C.oats;
  const bdr = d ? "rgba(255,255,255,0.1)" : C.shortbread;
  const txt = d ? C.crema : C.cocoa;
  return (
    <div>
      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:d?C.shortbread:C.hazelnut, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>{label.toUpperCase()}</label>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:d?C.shortbread:C.hazelnut, opacity:0.45, display:"flex" }}>{icon}</span>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ width:"100%", padding:"11px 14px 11px 40px", borderRadius:12, background:bg, border:`1px solid ${bdr}`, fontFamily:sans, fontSize:"0.84rem", color:txt, outline:"none", boxSizing:"border-box" }}
          onFocus={e=>e.currentTarget.style.borderColor=C.hazelnut}
          onBlur={e=>e.currentTarget.style.borderColor=bdr}/>
      </div>
    </div>
  );
}

export function CheckoutFlow({ open, onClose, dark, onOrderTrack }: Props) {
  const { items, total, count, clear } = useCart();
  const { user, addresses, savedCards, addAddress, addCard } = useAuth();
  const { toast } = useToast();
  const { playSfx } = useSound();
  const { addOrder } = useOrders();
  const { applyCoupon, coupons: allCoupons } = useCoupons();
  const { addNotification } = useNotifications();

  const [step, setStep] = useState<Step>("review");
  const [contact, setContact] = useState({ name:user?.name??"", email:user?.email??"", phone:user?.phone??"" });
  const [selectedAddrId, setSelectedAddrId] = useState<string|null>(addresses[0]?.id ?? null);
  const [addingNewAddr, setAddingNewAddr] = useState(false);
  const [newAddr, setNewAddr] = useState<{ label:"Home"|"Work"|"Other"; name:string; phone:string; line1:string; line2:string; city:string; state:string; pincode:string; lat?:number; lng?:number }>({ label:"Home", name:"", phone:"", line1:"", line2:"", city:"", state:"Mumbai", pincode:"", lat:undefined, lng:undefined });
  const [saveNewAddr, setSaveNewAddr] = useState(false);
  const [mapAddr, setMapAddr] = useState<{ line1:string; line2:string; city:string; postcode:string; country:string; lat?:number; lng?:number }>({ line1:"", line2:"", city:"", postcode:"", country:"India" });
  const [delivery, setDelivery] = useState("standard");
  const [deliveryOptions, setDeliveryOptions] = useState(DELIVERY_OPTIONS);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ valid:boolean; discount:number; message:string } | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [selectedCardId, setSelectedCardId] = useState<string|null>(savedCards[0]?.id ?? null);
  const [newCard, setNewCard] = useState({ last4:"", brand:"Visa" as const, expiry:"", name:"" });
  const [saveNewCard, setSaveNewCard] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string|null>(null);

  useEffect(() => {
    if (open) {
      setContact({ name:user?.name??"", email:user?.email??"", phone:user?.phone??"" });
      if (addresses.length > 0) { setSelectedAddrId(addresses[0].id); setAddingNewAddr(false); }
      if (savedCards.length > 0) setSelectedCardId(savedCards[0].id);
    }
  }, [open]);

  useEffect(() => {
    const pincode = (addingNewAddr ? newAddr.pincode : getDeliveryAddress()?.pincode) || "";
    if (!/^\d{6}$/.test(pincode)) return;
    deliveryApi.zones(pincode)
      .then(zones => {
        const mapped = zones.map(zone => {
          const fallback = DELIVERY_OPTIONS.find(option => option.id === zone.optionKey) || DELIVERY_OPTIONS[0];
          return { ...fallback, id: zone.optionKey, price: zone.fee, desc: zone.estimatedTime };
        });
        if (mapped.length) {
          setDeliveryOptions(mapped as typeof DELIVERY_OPTIONS);
          if (!mapped.some(option => option.id === delivery)) setDelivery(mapped[0].id);
        }
      })
      .catch(() => {});
  }, [addingNewAddr, newAddr.pincode, selectedAddrId, addresses]);

  const deliveryOpt = deliveryOptions.find(d=>d.id===delivery) || deliveryOptions[0];
  const subtotal = total;
  const discount = couponResult?.valid ? couponResult.discount : 0;
  const deliveryFee = deliveryOpt.price;
  const grandTotal = subtotal - discount + deliveryFee;

  const bg     = dark ? "#1A1008" : C.crema;
  const border = dark ? "rgba(255,255,255,0.07)" : C.shortbread;
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const fBg    = dark ? "rgba(255,255,255,0.06)" : C.oats;

  const stepIdx   = STEPS.indexOf(step);
  const isSuccess = step === "success";

  const goNext = (s: Step) => setStep(s);
  const goBack = () => setStep(STEPS[Math.max(0, stepIdx-1)] as Step);

  const getDeliveryAddress = (): SavedAddress | null => {
    if (!addingNewAddr && selectedAddrId) return addresses.find(a=>a.id===selectedAddrId) ?? null;
    return null;
  };

  const handleApplyCoupon = () => {
    const res = applyCoupon(couponCode, subtotal);
    setCouponResult(res);
    if (res.valid) toast(res.message, "success");
    else toast(res.message, "error");
  };

  const getPaymentLabel = () => {
    if (payMethod === "cod") return "Cash on Delivery";
    if (payMethod === "upi") return `UPI — ${upiId || "N/A"}`;
    if (payMethod === "netbanking") return "Net Banking";
    if (payMethod === "card") {
      const sc = savedCards.find(c=>c.id===selectedCardId);
      if (sc) return `${sc.brand} •••• ${sc.last4}`;
      return `Card •••• ${newCard.last4}`;
    }
    return payMethod;
  };

  const handlePlaceOrder = async () => {
    if (payMethod === "card" && !selectedCardId) {
      if (!newCard.last4 || newCard.last4.length !== 4 || !newCard.expiry || !newCard.name) {
        toast("Please complete card details","error"); return;
      }
    }
    if (payMethod === "upi" && !upiId.trim()) { toast("Please enter your UPI ID","error"); return; }

    const savedAddr = getDeliveryAddress();
    const addr = savedAddr ? {
      name: savedAddr.name, phone: savedAddr.phone, email: contact.email,
      line1: savedAddr.line1, line2: savedAddr.line2, city: savedAddr.city,
      state: savedAddr.state, pincode: savedAddr.pincode, lat: savedAddr.lat, lng: savedAddr.lng,
    } : {
      name: newAddr.name || contact.name, phone: newAddr.phone || contact.phone, email: contact.email,
      line1: newAddr.line1, line2: newAddr.line2, city: newAddr.city,
      state: newAddr.state, pincode: newAddr.pincode, lat: newAddr.lat, lng: newAddr.lng,
    };

    if (!addr.line1 || !addr.city) { toast("Delivery address is required","error"); return; }

    setSubmitting(true);
    if (payMethod !== "cod") {
      try {
        const paymentConfig = await paymentApi.config();
        if (!paymentConfig.configured) {
          toast("Online payments are not available yet. Please choose Cash on Delivery.", "error");
          setSubmitting(false);
          return;
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Unable to check payment availability", "error");
        setSubmitting(false);
        return;
      }
    }

    if (saveNewAddr && addingNewAddr && newAddr.line1) {
      addAddress({ label: newAddr.label, name: newAddr.name, phone: newAddr.phone, line1: newAddr.line1, line2: newAddr.line2, city: newAddr.city, state: newAddr.state, pincode: newAddr.pincode, isDefault: false, lat: newAddr.lat, lng: newAddr.lng });
    }

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + (delivery === "sameday" ? 0 : delivery === "express" ? 1 : 4));
    const estimatedDelivery = estDate.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" });
    let created: any;
    try {
      created = await addOrder({
      customer: { name: contact.name, email: contact.email, phone: contact.phone },
      items,
      subtotal,
      discount,
      deliveryFee,
      total: grandTotal,
      address: addr,
      paymentMethod: payMethod,
      estimatedDelivery,
      couponCode: couponResult?.valid ? couponCode : undefined,
      notes: notes || undefined,
      });
    } catch (error) {
      setSubmitting(false);
      toast(error instanceof Error ? error.message : "Unable to place this order", "error");
      return;
    }

    const orderNum = created.orderNum || `WW-${String(created.id).padStart(6, "0")}`;

    if (payMethod !== "cod") {
      try {
        const providerOrder = await paymentApi.createOrder(created.id, grandTotal);
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
          document.body.appendChild(script);
        });
        await new Promise<void>((resolve, reject) => {
          const Razorpay = (window as any).Razorpay;
          if (!Razorpay) return reject(new Error("Razorpay checkout is unavailable"));
          const checkout = new Razorpay({
            key: providerOrder.keyId,
            amount: providerOrder.amount,
            currency: providerOrder.currency,
            name: "Whisk & Wonder",
            description: `Order ${orderNum}`,
            order_id: providerOrder.id,
            prefill: { name: contact.name, email: contact.email, contact: contact.phone },
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              try {
                await paymentApi.verify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            modal: { ondismiss: () => reject(new Error("Payment was cancelled")) },
          });
          checkout.open();
        });
      } catch (error) {
        setSubmitting(false);
        toast(error instanceof Error ? error.message : "Payment was not completed", "error");
        return;
      }
    }

    if (saveNewCard && payMethod === "card" && !selectedCardId) {
      addCard({ last4: newCard.last4, brand: newCard.brand as any, expiry: newCard.expiry, name: newCard.name });
    }
    setSubmitting(false);

    setCreatedOrderId(created.id);

    addNotification({
      type: "order",
      title: "Order Confirmed! 🎉",
      message: `Your order ${orderNum} has been placed. Estimated delivery: ${estimatedDelivery}`,
      icon: "🥐",
       orderId: created.id,
    });

    clear();
    toast("Order placed! 🥐 Thank you!", "success");
    playSfx("checkout");
    goNext("success");
  };

  const handleClose = () => { setStep("review"); onClose(); };

  const addrLabelIcon = (lbl: string) => lbl === "Home" ? <Home size={13}/> : lbl === "Work" ? <Briefcase size={13}/> : <Star size={13}/>;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="co-bg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={handleClose}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", zIndex:400 }}/>
          <motion.div key="co-modal"
            initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
            transition={{duration:0.34,ease:[0.16,1,0.3,1]}}
            style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"min(680px,100vw)", maxHeight:"92vh", background:bg, borderRadius:"24px 24px 0 0", border:`1px solid ${border}`, boxShadow:"0 -30px 80px rgba(0,0,0,0.38)", zIndex:401, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Header */}
            {!isSuccess && (
              <div style={{ padding:"20px 28px 0", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <h2 style={{ fontFamily:serif, fontSize:"1.25rem", fontWeight:700, color:text, margin:0 }}>Checkout</h2>
                  <button onClick={handleClose} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex" }}><X size={20}/></button>
                </div>
                {/* Step progress */}
                <div style={{ display:"flex", gap:0, marginBottom:18, overflowX:"auto", scrollbarWidth:"none" }}>
                  {STEPS.filter(s=>s!=="success").map((s,i) => {
                    const done = STEPS.indexOf(step) > i;
                    const active = step === s;
                    return (
                      <div key={s} style={{ flex:1, display:"flex", alignItems:"center", minWidth:0 }}>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1, minWidth:0 }}>
                          <div style={{ width:22, height:22, borderRadius:"50%", background:done?C.mint:active?C.hazelnut:dark?"rgba(255,255,255,0.08)":C.oats, border:`1.5px solid ${done?C.mint:active?C.hazelnut:border}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.25s", flexShrink:0 }}>
                            {done ? <Check size={11} color="#fff"/> : <span style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:active?"#fff":sub }}>{i+1}</span>}
                          </div>
                          <span style={{ fontFamily:sans, fontSize:"0.5rem", fontWeight:600, color:active?C.hazelnut:done?C.mint:sub, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{STEP_LABELS[s]}</span>
                        </div>
                        {i < STEPS.filter(s=>s!=="success").length-1 && (
                          <div style={{ width:"100%", height:1, background:done?C.mint:border, flex:1, margin:"0 2px", marginBottom:14, transition:"background 0.3s" }}/>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ height:1, background:border }}/>
              </div>
            )}

            {/* Content */}
            <div style={{ flex:1, overflowY:"auto", padding:isSuccess?"0":"18px 28px 22px" }}>
              <AnimatePresence mode="wait">

                {/* REVIEW */}
                {step === "review" && (
                  <motion.div key="review" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:18 }}>
                      {items.map(item => (
                        <div key={item.id} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:14, background:fBg, border:`1px solid ${border}` }}>
                          <img src={imgUrl(item.imgId)} alt={item.name} style={{ width:50, height:50, borderRadius:10, objectFit:"cover", flexShrink:0 }}/>
                          <div style={{ flex:1 }}>
                            <p style={{ fontFamily:serif, fontSize:"0.84rem", fontWeight:700, color:text, marginBottom:2 }}>{item.name}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.66rem", color:sub }}>{item.size} × {item.qty}</p>
                          </div>
                          <span style={{ fontFamily:serif, fontSize:"0.92rem", fontWeight:700, color:C.peach, flexShrink:0 }}>₹{(item.price*item.qty).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"14px 16px", borderRadius:14, background:fBg, border:`1px solid ${border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>Subtotal ({count} items)</span>
                        <span style={{ fontFamily:sans, fontSize:"0.78rem", fontWeight:600, color:text }}>₹{subtotal.toFixed(0)}</span>
                      </div>
                      <div style={{ height:1, background:border, margin:"8px 0" }}/>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontFamily:serif, fontSize:"1rem", fontWeight:700, color:text }}>Estimated Total</span>
                        <span style={{ fontFamily:serif, fontSize:"1rem", fontWeight:700, color:C.peach }}>₹{subtotal.toFixed(0)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* CONTACT */}
                {step === "contact" && (
                  <motion.div key="contact" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      <InpField label="Full Name" value={contact.name} onChange={v=>setContact(c=>({...c,name:v}))} placeholder="Your full name" icon={<User size={13}/>} dark={dark}/>
                      <InpField label="Email" type="email" value={contact.email} onChange={v=>setContact(c=>({...c,email:v}))} placeholder="your@email.com" icon={<Mail size={13}/>} dark={dark}/>
                      <InpField label="Phone" type="tel" value={contact.phone} onChange={v=>setContact(c=>({...c,phone:v}))} placeholder="+91 98765 43210" icon={<Phone size={13}/>} dark={dark}/>
                    </div>
                  </motion.div>
                )}

                {/* ADDRESS */}
                {step === "address" && (
                  <motion.div key="address" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    {/* Saved addresses */}
                    {addresses.length > 0 && !addingNewAddr && (
                      <div style={{ marginBottom:18 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.12em", marginBottom:12 }}>SAVED ADDRESSES</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                          {addresses.map(a => (
                            <button key={a.id} onClick={()=>setSelectedAddrId(a.id)}
                              style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"14px 16px", borderRadius:14, border:`1.5px solid ${selectedAddrId===a.id?C.hazelnut:border}`, background:selectedAddrId===a.id?dark?"rgba(122,92,58,0.18)":C.oats:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}>
                              <div style={{ width:32, height:32, borderRadius:"50%", background:`${C.apricot}22`, display:"flex", alignItems:"center", justifyContent:"center", color:C.apricot, flexShrink:0 }}>{addrLabelIcon(a.label)}</div>
                              <div style={{ flex:1 }}>
                                <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text, marginBottom:3 }}>{a.label} — {a.name}</p>
                                <p style={{ fontFamily:sans, fontSize:"0.72rem", color:sub, lineHeight:1.5 }}>{a.line1}{a.line2?`, ${a.line2}`:""}, {a.city}, {a.state} {a.pincode}</p>
                                <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{a.phone}</p>
                              </div>
                              {selectedAddrId === a.id && <Check size={16} color={C.mint} style={{ flexShrink:0, marginTop:4 }}/>}
                            </button>
                          ))}
                        </div>
                        <button onClick={()=>setAddingNewAddr(true)}
                          style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, padding:"10px 16px", borderRadius:12, border:`1px dashed ${border}`, background:"transparent", color:sub, fontFamily:sans, fontSize:"0.78rem", fontWeight:600, cursor:"pointer", width:"100%" }}>
                          <Plus size={14}/> Add new address
                        </button>
                      </div>
                    )}

                    {/* New address form */}
                    {(addingNewAddr || addresses.length === 0) && (
                      <div>
                        {addresses.length > 0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                            <button onClick={()=>setAddingNewAddr(false)} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex" }}><ChevronLeft size={18}/></button>
                            <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.84rem", color:text }}>New Address</p>
                          </div>
                        )}
                        {/* Label selector */}
                        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                          {(["Home","Work","Other"] as const).map(l => (
                            <button key={l} onClick={()=>setNewAddr(a=>({...a,label:l}))}
                              style={{ padding:"7px 16px", borderRadius:100, border:`1.5px solid ${newAddr.label===l?C.apricot:border}`, background:newAddr.label===l?`${C.apricot}22`:"transparent", color:newAddr.label===l?C.apricot:sub, fontFamily:sans, fontSize:"0.74rem", fontWeight:600, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                        <AddressMapPicker dark={dark} value={mapAddr} onChange={v=>{ setMapAddr(v); setNewAddr(a=>({ ...a, line1:v.line1, line2:v.line2, city:v.city, pincode:v.postcode, lat:v.lat, lng:v.lng })); }}/>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
                          <InpField label="Name" value={newAddr.name} onChange={v=>setNewAddr(a=>({...a,name:v}))} placeholder="Recipient name" icon={<User size={13}/>} dark={dark}/>
                          <InpField label="Phone" type="tel" value={newAddr.phone} onChange={v=>setNewAddr(a=>({...a,phone:v}))} placeholder="+91 …" icon={<Phone size={13}/>} dark={dark}/>
                        </div>
                        <div style={{ marginTop:4 }}>
                          <InpField label="Address Line 1" value={newAddr.line1} onChange={v=>setNewAddr(a=>({...a,line1:v}))} placeholder="Street & building" icon={<MapPin size={13}/>} dark={dark}/>
                        </div>
                        <div style={{ marginTop:12 }}>
                          <InpField label="Address Line 2" value={newAddr.line2} onChange={v=>setNewAddr(a=>({...a,line2:v}))} placeholder="Apt, floor (optional)" icon={<MapPin size={13}/>} dark={dark}/>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:12 }}>
                          <InpField label="City" value={newAddr.city} onChange={v=>setNewAddr(a=>({...a,city:v}))} placeholder="Mumbai" icon={<MapPin size={13}/>} dark={dark}/>
                          <InpField label="State" value={newAddr.state} onChange={v=>setNewAddr(a=>({...a,state:v}))} placeholder="Maharashtra" icon={<MapPin size={13}/>} dark={dark}/>
                          <InpField label="Pincode" value={newAddr.pincode} onChange={v=>setNewAddr(a=>({...a,pincode:v}))} placeholder="400001" icon={<MapPin size={13}/>} dark={dark}/>
                        </div>
                        {user && (
                          <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, cursor:"pointer", fontFamily:sans, fontSize:"0.76rem", color:sub }}>
                            <input type="checkbox" checked={saveNewAddr} onChange={e=>setSaveNewAddr(e.target.checked)} style={{ accentColor:C.apricot }}/>
                            Save address to my profile
                          </label>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* DELIVERY */}
                {step === "delivery" && (
                  <motion.div key="delivery" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {deliveryOptions.map(opt => (
                        <button key={opt.id} onClick={()=>setDelivery(opt.id)}
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:16, background:delivery===opt.id?dark?"rgba(122,92,58,0.18)":C.oats:"transparent", border:`1.5px solid ${delivery===opt.id?C.hazelnut:border}`, cursor:"pointer", textAlign:"left", transition:"all 0.18s" }}>
                          <div style={{ width:40, height:40, borderRadius:"50%", background:delivery===opt.id?`${C.hazelnut}22`:fBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <opt.Icon size={18} color={delivery===opt.id?C.hazelnut:sub}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontFamily:sans, fontSize:"0.84rem", fontWeight:700, color:text, marginBottom:2 }}>{opt.label}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>{opt.desc}</p>
                          </div>
                          <span style={{ fontFamily:serif, fontSize:"0.95rem", fontWeight:700, color:delivery===opt.id?C.peach:sub, flexShrink:0 }}>+₹{opt.price}</span>
                        </button>
                      ))}
                    </div>
                    {/* Order notes */}
                    <div style={{ marginTop:18 }}>
                      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", display:"block", marginBottom:8 }}>ORDER NOTES (OPTIONAL)</label>
                      <div style={{ position:"relative" }}>
                        <FileText size={13} style={{ position:"absolute", left:13, top:13, color:sub, opacity:0.5 }}/>
                        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Allergies, special requests, gift message…" rows={3}
                          style={{ width:"100%", padding:"10px 14px 10px 36px", borderRadius:12, background:fBg, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.82rem", color:text, outline:"none", boxSizing:"border-box", resize:"vertical" }}/>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* COUPON */}
                {step === "coupon" && (
                  <motion.div key="coupon" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.12em", marginBottom:14 }}>APPLY COUPON</p>
                    <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                      <div style={{ flex:1, position:"relative" }}>
                        <Tag size={13} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:sub, opacity:0.5 }}/>
                        <input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code"
                          style={{ width:"100%", padding:"11px 12px 11px 36px", borderRadius:12, background:fBg, border:`1px solid ${couponResult?.valid?C.mint:border}`, fontFamily:sans, fontSize:"0.82rem", color:text, outline:"none", boxSizing:"border-box" }}/>
                      </div>
                      <button onClick={handleApplyCoupon}
                        style={{ padding:"11px 20px", borderRadius:12, background:C.hazelnut, color:"#fff", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.78rem", fontWeight:700, flexShrink:0 }}>
                        Apply
                      </button>
                    </div>
                    {couponResult && (
                      <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}
                        style={{ padding:"12px 16px", borderRadius:12, background:couponResult.valid?`${C.mint}18`:`${C.peach}18`, border:`1px solid ${couponResult.valid?C.mint:C.peach}44`, marginBottom:18 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.78rem", color:couponResult.valid?C.mint:C.peach, fontWeight:600 }}>
                          {couponResult.valid?"✓":"✗"} {couponResult.message}
                        </p>
                      </motion.div>
                    )}
                    {/* Available coupons */}
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.12em", marginBottom:12 }}>AVAILABLE COUPONS</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {allCoupons.filter(c=>c.active && new Date(c.expiresAt)>=new Date()).map(c => (
                        <button key={c.id} onClick={()=>{ setCouponCode(c.code); const res = applyCoupon(c.code, subtotal); setCouponResult(res); if(res.valid) toast(res.message,"success"); else toast(res.message,"error"); }}
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, border:`1.5px solid ${couponResult?.valid&&couponCode===c.code?C.mint:border}`, background:couponResult?.valid&&couponCode===c.code?`${C.mint}11`:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}>
                          <div style={{ width:38, height:38, borderRadius:"50%", background:`${C.mint}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <Tag size={16} color={C.mint}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.82rem", color:text }}>{c.code} <span style={{ color:C.mint }}>— {c.discount}% OFF</span></p>
                            <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>{c.description} · Min ₹{c.minOrder} · Expires {c.expiresAt}</p>
                          </div>
                          {couponResult?.valid && couponCode === c.code && <Check size={16} color={C.mint}/>}
                        </button>
                      ))}
                      {allCoupons.filter(c=>c.active).length === 0 && <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>No active coupons available.</p>}
                    </div>
                  </motion.div>
                )}

                {/* PAYMENT */}
                {step === "payment" && (
                  <motion.div key="payment" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}} transition={{duration:0.22}}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.12em", marginBottom:14 }}>PAYMENT METHOD</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                      {([
                        { id:"cod", label:"Cash on Delivery", desc:"Pay when your order arrives", icon:"💵" },
                        { id:"card", label:"Credit / Debit Card", desc:"Visa, Mastercard, RuPay, AmEx", icon:"💳" },
                        { id:"upi", label:"UPI", desc:"PhonePe, GPay, Paytm", icon:"📱" },
                        { id:"netbanking", label:"Net Banking", desc:"All major banks", icon:"🏦" },
                      ] as { id:PayMethod; label:string; desc:string; icon:string }[]).map(opt => (
                        <button key={opt.id} onClick={()=>setPayMethod(opt.id)}
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:16, background:payMethod===opt.id?dark?"rgba(122,92,58,0.18)":C.oats:"transparent", border:`1.5px solid ${payMethod===opt.id?C.hazelnut:border}`, cursor:"pointer", textAlign:"left", transition:"all 0.18s" }}>
                          <span style={{ fontSize:"1.5rem", flexShrink:0 }}>{opt.icon}</span>
                          <div style={{ flex:1 }}>
                            <p style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:700, color:text, marginBottom:2 }}>{opt.label}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{opt.desc}</p>
                          </div>
                          {payMethod===opt.id && <Check size={16} color={C.mint} style={{ flexShrink:0 }}/>}
                        </button>
                      ))}
                    </div>

                    {/* Card details */}
                    {payMethod === "card" && (
                      <AnimatePresence>
                        <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} style={{ overflow:"hidden" }}>
                          {savedCards.length > 0 && (
                            <div style={{ marginBottom:14 }}>
                              <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.12em", marginBottom:10 }}>SAVED CARDS</p>
                              {savedCards.map(c => (
                                <button key={c.id} onClick={()=>setSelectedCardId(c.id)}
                                  style={{ display:"flex", gap:12, alignItems:"center", width:"100%", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${selectedCardId===c.id?C.hazelnut:border}`, background:selectedCardId===c.id?dark?"rgba(122,92,58,0.18)":C.oats:"transparent", cursor:"pointer", marginBottom:8, textAlign:"left" }}>
                                  <span style={{ fontSize:"1.4rem" }}>💳</span>
                                  <div style={{ flex:1 }}>
                                    <p style={{ fontFamily:sans, fontWeight:700, fontSize:"0.8rem", color:text }}>{c.brand} •••• {c.last4}</p>
                                    <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub }}>{c.name} · {c.expiry}</p>
                                  </div>
                                  {selectedCardId===c.id && <Check size={14} color={C.mint}/>}
                                </button>
                              ))}
                              <button onClick={()=>setSelectedCardId(null)}
                                style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px", borderRadius:10, border:`1px dashed ${border}`, background:"transparent", color:sub, fontFamily:sans, fontSize:"0.74rem", cursor:"pointer" }}>
                                <Plus size={13}/> Use a different card
                              </button>
                            </div>
                          )}
                          {!selectedCardId && (
                            <div style={{ padding:"16px 18px", borderRadius:14, border:`1px solid ${border}`, background:fBg, display:"flex", flexDirection:"column", gap:12 }}>
                              <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.12em" }}>NEW CARD</p>
                              <InpField label="Cardholder Name" value={newCard.name} onChange={v=>setNewCard(c=>({...c,name:v}))} placeholder="Name on card" icon={<User size={13}/>} dark={dark}/>
                              <div>
                                <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.shortbread:C.hazelnut, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>BRAND</label>
                                <select value={newCard.brand} onChange={e=>setNewCard(c=>({...c,brand:e.target.value as any}))}
                                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${border}`, background:dark?"rgba(255,255,255,0.06)":C.oats, color:text, fontFamily:sans, fontSize:"0.8rem" }}>
                                  {["Visa","Mastercard","RuPay","AmEx"].map(b=><option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                                <InpField label="Last 4 Digits" value={newCard.last4} onChange={v=>setNewCard(c=>({...c,last4:v.slice(0,4)}))} placeholder="1234" icon={<CreditCard size={13}/>} dark={dark}/>
                                <InpField label="Expiry (MM/YY)" value={newCard.expiry} onChange={v=>setNewCard(c=>({...c,expiry:v}))} placeholder="MM/YY" icon={<CreditCard size={13}/>} dark={dark}/>
                              </div>
                              {user && (
                                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:sans, fontSize:"0.74rem", color:sub }}>
                                  <input type="checkbox" checked={saveNewCard} onChange={e=>setSaveNewCard(e.target.checked)} style={{ accentColor:C.apricot }}/>
                                  Save card for future orders
                                </label>
                              )}
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* UPI input */}
                    {payMethod === "upi" && (
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ marginBottom:16 }}>
                        <InpField label="UPI ID" value={upiId} onChange={setUpiId} placeholder="name@upi" icon={<Phone size={13}/>} dark={dark}/>
                      </motion.div>
                    )}

                    {/* Order summary */}
                    <div style={{ padding:"14px 16px", borderRadius:14, background:fBg, border:`1px solid ${border}` }}>
                      {[
                        ["Subtotal", `₹${subtotal.toFixed(0)}`],
                        ...(discount>0?[[`Coupon (${couponCode})`,`-₹${discount.toFixed(0)}`]]:[]),
                        ["Delivery", `₹${deliveryFee.toFixed(0)}`],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                          <span style={{ fontFamily:sans, fontSize:"0.76rem", color:sub }}>{k}</span>
                          <span style={{ fontFamily:sans, fontSize:"0.76rem", fontWeight:600, color:k.startsWith("Coupon")?C.mint:text }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ height:1, background:border, margin:"8px 0" }}/>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontFamily:serif, fontSize:"1rem", fontWeight:700, color:text }}>Total</span>
                        <span style={{ fontFamily:serif, fontSize:"1.05rem", fontWeight:700, color:C.peach }}>₹{grandTotal.toFixed(0)}</span>
                      </div>
                    </div>
                    <p style={{ fontFamily:sans, fontSize:"0.62rem", color:sub, marginTop:10, opacity:0.5, lineHeight:1.6 }}>
                      Demo store. No real charges will be made. Your payment details are not stored.
                    </p>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {step === "success" && (
                  <motion.div key="success" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.4}}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 28px", textAlign:"center", minHeight:380 }}>
                    <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.15,type:"spring",stiffness:200,damping:18}}
                      style={{ width:76, height:76, borderRadius:"50%", background:`${C.mint}22`, border:`1.5px solid ${C.mint}55`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:22 }}>
                      <Check size={34} color={C.mint}/>
                    </motion.div>
                    <h2 style={{ fontFamily:serif, fontSize:"1.7rem", fontWeight:700, color:text, marginBottom:8 }}>Order Confirmed! 🥐</h2>
                    <p style={{ fontFamily:sans, fontSize:"0.85rem", color:sub, marginBottom:8, lineHeight:1.7 }}>
                      Thank you{contact.name?`, ${contact.name.split(" ")[0]}`:""}! We're already preheating the ovens.
                    </p>
                    {/* Items preview */}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:18 }}>
                      {items.slice(0,4).map(item => (
                        <img key={item.id} src={imgUrl(item.imgId)} alt={item.name} title={item.name} style={{ width:40, height:40, borderRadius:10, objectFit:"cover", border:`1px solid ${border}` }}/>
                      ))}
                    </div>
                    <div style={{ padding:"10px 20px", borderRadius:100, background:fBg, border:`1px solid ${border}`, marginBottom:18 }}>
                      <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub }}>
                        Estimated Delivery: <strong style={{ color:text }}>{deliveryOpt.desc}</strong>
                      </p>
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
                      {createdOrderId && onOrderTrack && (
                        <button onClick={()=>{ onOrderTrack(createdOrderId); handleClose(); }}
                          style={{ padding:"13px 28px", borderRadius:100, background:`linear-gradient(135deg,${C.hazelnut},${C.cocoa})`, color:C.crema, border:"none", cursor:"pointer", fontFamily:sans, fontWeight:700, fontSize:"0.84rem", letterSpacing:"0.06em" }}>
                          Track Order 📦
                        </button>
                      )}
                      <button onClick={handleClose}
                        style={{ padding:"13px 28px", borderRadius:100, background:"transparent", color:sub, border:`1px solid ${border}`, cursor:"pointer", fontFamily:sans, fontWeight:600, fontSize:"0.84rem" }}>
                        Continue Shopping
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer actions */}
            {!isSuccess && (
              <div style={{ padding:"14px 28px 24px", borderTop:`1px solid ${border}`, flexShrink:0, display:"flex", gap:10 }}>
                {stepIdx > 0 && (
                  <button onClick={goBack} style={{ padding:"12px 20px", borderRadius:100, background:"transparent", border:`1px solid ${border}`, color:sub, fontFamily:sans, fontWeight:600, fontSize:"0.8rem", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    <ChevronLeft size={15}/> Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (step==="review") {
                      if (items.length===0) { toast("Your cart is empty","error"); return; }
                      goNext("contact");
                    } else if (step==="contact") {
                      if (!contact.name || !contact.email) { toast("Please fill name and email","error"); return; }
                      goNext("address");
                    } else if (step==="address") {
                      const sa = getDeliveryAddress();
                      if (!sa && (!newAddr.line1 || !newAddr.city)) { toast("Please provide your delivery address","error"); return; }
                      goNext("delivery");
                    } else if (step==="delivery") {
                      goNext("coupon");
                    } else if (step==="coupon") {
                      goNext("payment");
                    } else if (step==="payment") {
                      handlePlaceOrder();
                    }
                  }}
                  disabled={submitting}
                  style={{ flex:1, padding:"13px", borderRadius:100, background:`linear-gradient(135deg,${C.hazelnut},${C.cocoa})`, color:C.crema, border:"none", cursor:"pointer", fontFamily:sans, fontWeight:700, fontSize:"0.86rem", letterSpacing:"0.05em", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:submitting?0.7:1, transition:"opacity 0.2s", boxShadow:"0 6px 24px rgba(122,92,58,0.32)" }}>
                  {submitting ? "Processing…" : step==="payment" ? "Place Order 🥐" : <>Continue <ChevronRight size={15}/></>}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
