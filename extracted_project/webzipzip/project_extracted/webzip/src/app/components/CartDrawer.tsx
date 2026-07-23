import { motion, AnimatePresence } from "motion/react";
import { X, ShoppingCart, Trash2, Plus, Minus, ChevronRight } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=120&h=120&fit=crop&auto=format&q=80`;

interface Props { open: boolean; onClose: () => void; dark: boolean; onCheckout: () => void; }

export function CartDrawer({ open, onClose, dark, onCheckout }: Props) {
  const { items, remove, updateQty, clear, total, count } = useCart();
  const { toast } = useToast();

  const bg     = dark ? "#1A1008" : C.crema;
  const border = dark ? "rgba(255,255,255,0.06)" : C.shortbread;
  const text   = dark ? C.crema    : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(4px)", zIndex:200 }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 38 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(420px, 100vw)",
              background: bg,
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              borderLeft: `1px solid ${border}`,
              boxShadow: "-20px 0 80px rgba(0,0,0,0.22)",
              /* height is implicitly 100% via top:0 bottom:0 */
            }}
          >
            {/* Header — fixed at top */}
            <div style={{
              padding:"22px 24px 18px",
              borderBottom:`1px solid ${border}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              flexShrink:0,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <ShoppingCart size={18} color={C.hazelnut} />
                <h2 style={{ fontFamily:serif, fontSize:"1.18rem", fontWeight:700, color:text, margin:0 }}>Your Cart</h2>
                {count > 0 && (
                  <span style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, background:C.peach, color:"#fff", borderRadius:100, padding:"2px 8px" }}>{count}</span>
                )}
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Items — scrollable middle section */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px", minHeight:0 }}>
              {items.length === 0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:16, opacity:0.55 }}>
                  <ShoppingCart size={48} color={C.hazelnut} strokeWidth={1} />
                  <p style={{ fontFamily:serif, fontSize:"1.1rem", color:text, textAlign:"center" }}>Your cart is empty</p>
                  <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub, textAlign:"center", lineHeight:1.7 }}>Discover our handcrafted pastries and add your favourites.</p>
                  <button onClick={onClose} style={{ fontFamily:sans, fontSize:"0.8rem", fontWeight:600, color:C.hazelnut, background:"none", border:`1px solid ${C.hazelnut}55`, borderRadius:100, padding:"10px 24px", cursor:"pointer" }}>
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <AnimatePresence>
                    {items.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity:0, x:20 }}
                        animate={{ opacity:1, x:0 }}
                        exit={{ opacity:0, x:-20, height:0, marginBottom:0 }}
                        transition={{ duration:0.25 }}
                        style={{
                          display:"flex", gap:14, padding:"14px 16px", borderRadius:18,
                          background: dark ? "rgba(255,255,255,0.04)" : C.oats,
                          border:`1px solid ${border}`,
                        }}
                      >
                        <img
                          src={img(item.imgId)} alt={item.name}
                          style={{ width:62, height:62, borderRadius:12, objectFit:"cover", flexShrink:0 }}
                        />
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontFamily:serif, fontSize:"0.88rem", fontWeight:700, color:text, marginBottom:2, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {item.name}
                          </p>
                          <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub, marginBottom:8 }}>{item.size}</p>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <button
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                style={{ width:24, height:24, borderRadius:"50%", background:dark?"rgba(255,255,255,0.08)":C.crema, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:text }}
                              ><Minus size={11} /></button>
                              <span style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:600, color:text, minWidth:14, textAlign:"center" }}>{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                style={{ width:24, height:24, borderRadius:"50%", background:dark?"rgba(255,255,255,0.08)":C.crema, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:text }}
                              ><Plus size={11} /></button>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ fontFamily:serif, fontSize:"0.95rem", fontWeight:700, color:C.peach }}>₹{(item.price * item.qty).toFixed(0)}</span>
                              <button onClick={() => { remove(item.id); toast(`${item.name} removed`, "info"); }}
                                style={{ background:"none", border:"none", cursor:"pointer", color:sub, opacity:0.6, display:"flex" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Clear cart */}
                  <button
                    onClick={() => { clear(); toast("Cart cleared", "info"); }}
                    style={{ fontFamily:sans, fontSize:"0.72rem", fontWeight:500, color:sub, background:"none", border:"none", cursor:"pointer", alignSelf:"center", opacity:0.55, textDecoration:"underline", padding:4 }}
                  >
                    Clear all items
                  </button>
                </div>
              )}
            </div>

            {/* Footer — sticky at bottom, always visible */}
            {items.length > 0 && (
              <div style={{
                padding:"20px 24px 28px",
                borderTop:`1px solid ${border}`,
                flexShrink:0,
                background:bg,
              }}>
                {/* Subtotal */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontFamily:sans, fontSize:"0.82rem", color:sub }}>Subtotal ({count} item{count !== 1 ? "s" : ""})</span>
                  <span style={{ fontFamily:serif, fontSize:"1.22rem", fontWeight:700, color:C.peach }}>₹{total.toFixed(2)}</span>
                </div>
                <p style={{ fontFamily:sans, fontSize:"0.66rem", color:sub, opacity:0.55, marginBottom:14, textAlign:"center" }}>
                  Taxes & delivery calculated at checkout
                </p>
                <button
                  onClick={() => { onClose(); onCheckout(); }}
                  style={{
                    width:"100%", padding:"15px", borderRadius:100,
                    background:`linear-gradient(135deg, ${C.hazelnut}, ${C.cocoa})`,
                    color:C.crema, border:"none", cursor:"pointer",
                    fontFamily:sans, fontWeight:700, fontSize:"0.88rem", letterSpacing:"0.06em",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    boxShadow:"0 8px 32px rgba(122,92,58,0.38)",
                  }}
                >
                  Proceed to Checkout <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
