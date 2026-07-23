import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Package, ChefHat, Clock, Truck, CheckCircle2, Sparkles, BoxIcon } from "lucide-react";
import { useOrders } from "../contexts/OrderContext";
import type { OrderStatus } from "../contexts/OrderContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const imgUrl = (id: string) => `https://images.unsplash.com/photo-${id}?w=56&h=56&fit=crop&auto=format&q=80`;

interface Props { orderId: string | null; onClose: () => void; dark: boolean; }

const ALL_STATUSES: OrderStatus[] = ["Order Confirmed","Preparing","Baking","Decorating","Packaging","Out For Delivery","Delivered"];

const STATUS_META: Record<OrderStatus, { icon: React.ReactNode; emoji: string; desc: string }> = {
  "Order Confirmed": { icon: <CheckCircle2 size={16}/>, emoji: "✅", desc: "Your order has been received and confirmed." },
  "Preparing":       { icon: <ChefHat size={16}/>,     emoji: "👨‍🍳", desc: "Our bakers are gathering ingredients." },
  "Baking":          { icon: <Clock size={16}/>,        emoji: "🔥", desc: "In the oven — magic is happening!" },
  "Decorating":      { icon: <Sparkles size={16}/>,     emoji: "🎨", desc: "Being lovingly decorated with care." },
  "Packaging":       { icon: <BoxIcon size={16}/>,      emoji: "📦", desc: "Packed securely for your delivery." },
  "Out For Delivery":{ icon: <Truck size={16}/>,        emoji: "🛵", desc: "Your order is on its way to you!" },
  "Delivered":       { icon: <Package size={16}/>,      emoji: "🎉", desc: "Delivered! Enjoy your treats 🥐" },
};

export function OrderTrackingModal({ orderId, onClose, dark }: Props) {
  const { orders } = useOrders();
  const order = orderId ? orders.find(o => o.id === orderId) : null;

  const bg     = dark ? "#1A1008" : C.crema;
  const panel  = dark ? "#221609" : "#fff";
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const border = dark ? "rgba(255,255,255,0.09)" : C.shortbread;

  const currentIdx = order ? ALL_STATUSES.indexOf(order.status) : -1;
  const progressPct = order ? ((currentIdx) / (ALL_STATUSES.length - 1)) * 100 : 0;

  return (
    <AnimatePresence>
      {orderId !== null && (
        <>
          <motion.div key="otm-bg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)", zIndex:500 }}/>
          <motion.div key="otm-modal"
            initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
            transition={{duration:0.34,ease:[0.16,1,0.3,1]}}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(680px,96vw)", maxHeight:"90vh", background:bg, borderRadius:24, border:`1px solid ${border}`, boxShadow:"0 30px 80px rgba(0,0,0,0.38)", zIndex:501, display:"flex", flexDirection:"column", overflow:"hidden" }}>

            {/* Header */}
            <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h2 style={{ fontFamily:serif, fontSize:"1.3rem", fontWeight:700, color:text, margin:0 }}>Order Tracking</h2>
                  {order && <p style={{ fontFamily:sans, fontSize:"0.72rem", color:sub, marginTop:3 }}>Order #{order.orderNum ?? order.id.slice(-6)}</p>}
                </div>
                <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:6 }}>
                  <X size={20}/>
                </button>
              </div>
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 28px" }}>
              {!order ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
                  <p style={{ fontSize:"3rem", marginBottom:16 }}>📦</p>
                  <p style={{ fontFamily:serif, fontSize:"1.2rem", color:text, marginBottom:8 }}>No order found</p>
                  <p style={{ fontFamily:sans, fontSize:"0.8rem", color:sub }}>We couldn't find this order. Please try again.</p>
                </div>
              ) : (
                <>
                  {/* Current status */}
                  <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:0.1}}
                    style={{ background:`linear-gradient(135deg,${C.hazelnut},${C.cocoa})`, borderRadius:18, padding:"20px 22px", marginBottom:22, textAlign:"center" }}>
                    <p style={{ fontSize:"2.4rem", marginBottom:8 }}>{STATUS_META[order.status].emoji}</p>
                    <p style={{ fontFamily:serif, fontSize:"1.5rem", fontWeight:700, color:"#fff", marginBottom:4 }}>{order.status}</p>
                    <p style={{ fontFamily:sans, fontSize:"0.78rem", color:"rgba(255,255,255,0.75)" }}>{STATUS_META[order.status].desc}</p>
                    {order.estimatedDelivery && (
                      <div style={{ marginTop:14, padding:"8px 16px", background:"rgba(255,255,255,0.12)", borderRadius:100, display:"inline-block" }}>
                        <p style={{ fontFamily:sans, fontSize:"0.7rem", color:"rgba(255,255,255,0.9)" }}>
                          🕐 Est. Delivery: <strong>{order.estimatedDelivery}</strong>
                        </p>
                      </div>
                    )}
                  </motion.div>

                  {/* Progress bar */}
                  <div style={{ marginBottom:24 }}>
                    <div style={{ height:6, borderRadius:100, background: dark?"rgba(255,255,255,0.08)":C.oats, overflow:"hidden" }}>
                      <motion.div initial={{width:0}} animate={{width:`${progressPct}%`}} transition={{duration:1,ease:"easeOut"}}
                        style={{ height:"100%", background:`linear-gradient(90deg,${C.hazelnut},${C.apricot})`, borderRadius:100 }}/>
                    </div>
                    <p style={{ fontFamily:sans, fontSize:"0.66rem", color:sub, textAlign:"right", marginTop:6 }}>{Math.round(progressPct)}% complete</p>
                  </div>

                  {/* Timeline */}
                  <div style={{ position:"relative", marginBottom:26 }}>
                    {/* Vertical line */}
                    <div style={{ position:"absolute", left:16, top:0, bottom:0, width:2, background: dark?"rgba(255,255,255,0.08)":C.oats }}/>
                    {ALL_STATUSES.map((s, i) => {
                      const done = i <= currentIdx;
                      const active = i === currentIdx;
                      const meta = STATUS_META[s];
                      const step = order.trackingSteps?.[i];
                      return (
                        <motion.div key={s} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
                          style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:18, position:"relative" }}>
                          {/* Node */}
                          <motion.div
                            animate={active ? { scale:[1,1.15,1], boxShadow:[`0 0 0 0 ${C.apricot}66`,`0 0 0 8px transparent`] } : {}}
                            transition={active ? { repeat:Infinity, duration:2 } : {}}
                            style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, zIndex:1,
                              background: done ? (active?`linear-gradient(135deg,${C.apricot},${C.peach})`:C.mint) : dark?"rgba(255,255,255,0.06)":C.oats,
                              border:`2px solid ${done?(active?C.apricot:C.mint):border}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              color: done?"#fff":sub, transition:"all 0.3s" }}>
                            <span style={{ fontSize:"0.9rem" }}>{meta.emoji}</span>
                          </motion.div>

                          {/* Content */}
                          <div style={{ flex:1, paddingTop:6 }}>
                            <p style={{ fontFamily:sans, fontWeight:active?700:600, fontSize:"0.84rem", color:done?text:sub }}>{s}</p>
                            <p style={{ fontFamily:sans, fontSize:"0.7rem", color:sub, lineHeight:1.5 }}>{meta.desc}</p>
                            {step?.timestamp && done && (
                              <p style={{ fontFamily:sans, fontSize:"0.62rem", color: active?C.apricot:sub, marginTop:3 }}>
                                {new Date(step.timestamp).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Order details */}
                  <div style={{ background: dark?"rgba(255,255,255,0.04)":C.oats, borderRadius:16, border:`1px solid ${border}`, padding:"18px 20px", marginBottom:16 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:14 }}>ORDER SUMMARY</p>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
                        <img src={imgUrl(item.imgId)} alt={item.name} style={{ width:44, height:44, borderRadius:10, objectFit:"cover", flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <p style={{ fontFamily:sans, fontWeight:600, fontSize:"0.8rem", color:text }}>{item.name}</p>
                          <p style={{ fontFamily:sans, fontSize:"0.67rem", color:sub }}>{item.size} × {item.qty}</p>
                        </div>
                        <span style={{ fontFamily:serif, fontWeight:700, color:C.peach, fontSize:"0.88rem" }}>₹{(item.price*item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                    <div style={{ height:1, background:border, margin:"12px 0" }}/>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontFamily:sans, fontSize:"0.74rem", color:sub }}>Subtotal</span>
                      <span style={{ fontFamily:sans, fontSize:"0.74rem", color:text }}>₹{order.subtotal.toFixed(0)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontFamily:sans, fontSize:"0.74rem", color:sub }}>Discount</span>
                        <span style={{ fontFamily:sans, fontSize:"0.74rem", color:C.mint }}>-₹{order.discount.toFixed(0)}</span>
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontFamily:sans, fontSize:"0.74rem", color:sub }}>Delivery</span>
                      <span style={{ fontFamily:sans, fontSize:"0.74rem", color:text }}>₹{order.deliveryFee.toFixed(0)}</span>
                    </div>
                    <div style={{ height:1, background:border, margin:"8px 0" }}/>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:serif, fontSize:"1rem", fontWeight:700, color:text }}>Total</span>
                      <span style={{ fontFamily:serif, fontSize:"1.05rem", fontWeight:700, color:C.peach }}>₹{order.total.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Delivery & payment */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":C.oats, borderRadius:14, border:`1px solid ${border}`, padding:"14px 16px" }}>
                      <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:8 }}>DELIVERY ADDRESS</p>
                      {order.address ? (
                        <p style={{ fontFamily:sans, fontSize:"0.76rem", color:text, lineHeight:1.6 }}>
                          {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br/>
                          {order.address.city}{order.address.state ? `, ${order.address.state}` : ""} {order.address.pincode ?? ""}
                        </p>
                      ) : <p style={{ fontFamily:sans, fontSize:"0.76rem", color:sub }}>Not specified</p>}
                    </div>
                    <div style={{ background: dark?"rgba(255,255,255,0.04)":C.oats, borderRadius:14, border:`1px solid ${border}`, padding:"14px 16px" }}>
                      <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.1em", marginBottom:8 }}>PAYMENT</p>
                      <p style={{ fontFamily:sans, fontSize:"0.76rem", color:text }}>{order.paymentMethod || "Not specified"}</p>
                    </div>
                  </div>

                  {/* Track on map placeholder */}
                  <button style={{ width:"100%", padding:"13px", borderRadius:14, background: dark?"rgba(255,255,255,0.06)":C.oats, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", gap:10, cursor:"pointer", fontFamily:sans, fontWeight:600, fontSize:"0.82rem", color:sub }}>
                    <MapPin size={16} color={C.apricot}/> Track on Map (coming soon)
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
