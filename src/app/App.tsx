import React, { useState, useEffect, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import BakeryEntrance from "./BakeryEntrance";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  Heart, ShoppingCart, Star, Search, Moon, Sun,
  ChevronLeft, ChevronRight, Mail, MapPin,
  Coffee, Menu, X, Check, Gift, ShoppingBag,
  Layers, Sparkles, User, LogOut, MessageSquare, Phone,
  ThumbsUp, Volume2, VolumeX, BarChart3, Bell, Settings,
  Clock, Zap, Package, CheckCircle, Leaf, Users, Award, Truck,
} from "lucide-react";

// ── Contexts ──────────────────────────────────────────────────────────────────
import { CartProvider, useCart } from "./contexts/CartContext";
import { WishlistProvider, useWishlist } from "./contexts/WishlistContext";
import { AuthProvider, useAuth, type User as AuthUser } from "./contexts/AuthContext";
import { ToastProvider, useToast } from "./contexts/ToastContext";
import { SoundProvider, useSound } from "./contexts/SoundContext";
import { ProductStoreProvider, useProductStore } from "./contexts/ProductStoreContext";
import { OrderProvider } from "./contexts/OrderContext";
import { ReviewsProvider } from "./contexts/ReviewsContext";
import { NotificationsProvider, useNotifications } from "./contexts/NotificationsContext";
import { CouponsProvider } from "./contexts/CouponsContext";

// ── Components ────────────────────────────────────────────────────────────────
import { ToastContainer }     from "./components/Toast";
import { CartDrawer }         from "./components/CartDrawer";
import { AuthModal }          from "./components/AuthModal";
import { SearchModal }        from "./components/SearchModal";
import { ProductModal }       from "./components/ProductModal";
import { CheckoutFlow }       from "./components/CheckoutFlow";
import { AdminDashboard }     from "./components/AdminDashboard";
import { UserProfileModal }   from "./components/UserProfileModal";
import { OrderTrackingModal } from "./components/OrderTrackingModal";

// ── Data ──────────────────────────────────────────────────────────────────────
import type { Product } from "./data/products";
import { resolveImage } from "../lib/image";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A",
  lilac:"#C9B4E8", lavender:"#B8A6D8", cocoa:"#4A3728", hazelnut:"#7A5C3A",
  mint:"#9DD4B8", shortbread:"#E0CEB4",
};
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'Poppins', system-ui, sans-serif";
const img = resolveImage;

type Stage = "loading" | "entrance" | "main";

// ─── Logo Mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = 26, color = C.hazelnut }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 0.84} viewBox="0 0 26 22" fill="none" aria-hidden="true">
      <path d="M1 3 L6.5 19 L13 9 L19.5 19 L25 3"
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children, dark, pClassName }: { children: React.ReactNode; dark: boolean; pClassName?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
      <div style={{ width:22, height:1, background:dark?C.apricot:C.peach, opacity:0.55 }} />
      <p className={pClassName} style={{ fontFamily:sans, fontSize:"0.63rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.3em" }}>
        {String(children).toUpperCase()}
      </p>
      <div style={{ width:22, height:1, background:dark?C.apricot:C.peach, opacity:0.55 }} />
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ children, variant="primary", dark, onClick, size="md" }: {
  children: React.ReactNode; variant?: "primary"|"ghost"; dark: boolean;
  onClick?: ()=>void; size?: "sm"|"md"|"lg";
}) {
  const isPrimary = variant === "primary";
  const pad = size==="lg"?"16px 48px":size==="sm"?"9px 22px":"13px 36px";
  const fs  = size==="lg"?"0.94rem":size==="sm"?"0.74rem":"0.85rem";
  return (
    <motion.button onClick={onClick} whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }}
      style={{
        padding:pad, background:isPrimary?(dark?C.apricot:C.hazelnut):"transparent",
        color:isPrimary?(dark?C.cocoa:C.crema):(dark?C.apricot:C.hazelnut),
        border:isPrimary?"none":`1.5px solid ${dark?C.apricot:C.hazelnut}`,
        borderRadius:100, fontFamily:sans, fontWeight:600, fontSize:fs, letterSpacing:"0.04em",
        cursor:"pointer", boxShadow:isPrimary?"0 8px 32px rgba(122,92,58,0.26)":"none",
        display:"inline-flex", alignItems:"center", gap:8, position:"relative", overflow:"hidden",
      }}
    >
      {isPrimary && (
        <motion.div className="absolute inset-0 pointer-events-none"
          style={{ background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.18) 50%,transparent 65%)" }}
          animate={{ x:["-150%","150%"] }} transition={{ duration:3, repeat:Infinity, repeatDelay:1.5 }} />
      )}
      {children}
    </motion.button>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ onDone }: { onDone: ()=>void }) {
  const [pct, setPct] = useState(0);
  const [bloom, setBloom] = useState(false);
  const belled = useRef(false);
  const { playSfx, musicOn, toggleMusic } = useSound();

  useEffect(() => {
    const t = setInterval(() => {
      setPct(p => {
        const n = p + Math.random() * 1.9 + 0.55;
        if (n >= 100) { clearInterval(t); return 100; }
        return n;
      });
    }, 55);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (pct >= 100 && !belled.current) {
      belled.current = true;
      setBloom(true);
      playSfx("doorbell");
      const done = setTimeout(onDone, 950);
      return () => clearTimeout(done);
    }
  }, [pct, onDone, playSfx]);

  const n = Math.min(Math.round(pct), 100);

  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden"
      style={{ background:`radial-gradient(ellipse at 50% 40%, ${C.oats} 0%, ${C.crema} 68%)` }}
      exit={{ opacity:0, scale:1.04 }} transition={{ duration:0.85 }}>

      {/* light bloom flash near completion */}
      <AnimatePresence>
        {bloom && (
          <motion.div className="absolute inset-0 pointer-events-none" style={{ background:`radial-gradient(circle at 50% 44%, rgba(255,214,168,0.85) 0%, rgba(255,214,168,0) 62%)` }}
            initial={{ opacity:0 }} animate={{ opacity:[0,1,0] }} transition={{ duration:0.95, times:[0,0.35,1] }} />
        )}
      </AnimatePresence>

      {/* floating flour dust particles */}
      {Array.from({length:22}).map((_,i) => (
        <motion.div key={`flour-${i}`} className="absolute rounded-full pointer-events-none"
          style={{ width:1.5+(i%4)*1.5, height:1.5+(i%4)*1.5, background:C.crema, boxShadow:`0 0 4px ${C.crema}`, left:`${(i*9.2+3)%97}%`, bottom:-8, opacity:0.6 }}
          animate={{ y:[0,-360-i*14], x:[0, (i%2===0?1:-1)*24], opacity:[0,0.65,0] }}
          transition={{ duration:5+i*0.22, delay:i*0.16, repeat:Infinity }} />
      ))}
      {/* sparkles */}
      {Array.from({length:9}).map((_,i) => (
        <motion.div key={`spark-${i}`} className="absolute pointer-events-none" style={{ left:`${18+i*8}%`, top:`${22+(i%3)*20}%` }}
          animate={{ opacity:[0,1,0], scale:[0.4,1,0.4], rotate:[0,90] }}
          transition={{ duration:2.2, delay:i*0.35, repeat:Infinity, repeatDelay:1.6 }}>
          <Sparkles size={10+(i%3)*3} color={i%2===0?C.apricot:C.lilac} />
        </motion.div>
      ))}

      {/* sound toggle */}
      <motion.button onClick={toggleMusic} whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
        className="absolute" style={{ top:24, right:28, width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.5)", border:`1px solid ${C.shortbread}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(6px)" }}
        aria-label={musicOn ? "Mute ambience" : "Play ambience"}>
        {musicOn ? <Volume2 size={15} color={C.hazelnut}/> : <VolumeX size={15} color={C.hazelnut}/>}
      </motion.button>

      <motion.div initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ duration:0.7, ease:"easeOut" }}
        style={{ marginBottom:26, position:"relative", width:72, height:72, borderRadius:"50%", border:`1px solid ${C.shortbread}`, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.4)" }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ position:"absolute" }}>
          <circle cx="36" cy="36" r="34" stroke={C.shortbread} strokeWidth="1" />
          <motion.circle cx="36" cy="36" r="34" stroke={C.peach} strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray="213" animate={{ strokeDashoffset:[213,0] }} transition={{ duration:3.6, ease:"easeInOut" }} />
        </svg>
        <motion.div animate={{ rotate:[0,-14,14,-8,0] }} transition={{ duration:1.6, repeat:Infinity, repeatDelay:0.4 }}>
          <LogoMark size={30} color={C.hazelnut} />
        </motion.div>
      </motion.div>

      <div style={{ overflow:"hidden", marginBottom:10 }}>
        <motion.h1 style={{ fontFamily:serif, color:C.hazelnut, fontSize:"2.5rem", fontWeight:700, lineHeight:1, display:"flex" }}>
          {"Whisk & Wonder".split("").map((ch,i)=>(
            <motion.span key={i} initial={{ y:40, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.04*i, duration:0.5 }}>
              {ch===" "?"\u00A0":ch}
            </motion.span>
          ))}
        </motion.h1>
      </div>
      <motion.p initial={{ opacity:0 }} animate={{ opacity:[0,0.7,0.5,0.7] }} transition={{ delay:0.8, duration:2.8, repeat:Infinity }}
        style={{ color:C.hazelnut, fontFamily:sans, fontSize:"0.72rem", letterSpacing:"0.02em", marginBottom:"2.6rem", fontStyle:"italic" }}>
        Preparing your bakery experience…
      </motion.p>
      <div style={{ width:220, height:1.5, background:C.shortbread, borderRadius:2, overflow:"hidden" }}>
        <motion.div style={{ height:"100%", background:`linear-gradient(90deg,${C.apricot},${C.peach},${C.apricot})`, backgroundSize:"200% 100%", borderRadius:2 }}
          animate={{ width:`${n}%`, backgroundPosition:["0% 0%","100% 0%","0% 0%"] }}
          transition={{ width:{ ease:"easeOut", duration:0.22 }, backgroundPosition:{ duration:2.2, repeat:Infinity } }} />
      </div>
      <p style={{ marginTop:12, color:C.lavender, fontFamily:sans, fontSize:"0.66rem", letterSpacing:"0.1em" }}>{n}%</p>
    </motion.div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
const navLinks = ["Home","Menu","Custom Cakes","Best Sellers","Gallery","Our Story"];

interface NavProps {
  dark: boolean; setDark: (v:boolean)=>void;
  cartCount: number; wishCount: number; user: AuthUser|null; notifCount?: number;
  onSearch: ()=>void; onCart: ()=>void; onWishlist: ()=>void; onAuth: ()=>void; onLogout: ()=>void; onAdmin: ()=>void; onProfile: ()=>void;
}

function Navbar({ dark, setDark, cartCount, wishCount, user, notifCount=0, onSearch, onCart, onWishlist, onAuth, onLogout, onAdmin, onProfile }: NavProps) {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior:"smooth" }); setMobileOpen(false); };
  const border   = dark ? "rgba(255,255,255,0.06)" : "rgba(224,206,180,0.55)";
  const sub      = dark ? `${C.oats}BB` : `${C.cocoa}AA`;

  return (
    <header className="fixed top-0 left-0 right-0 z-30"
      style={{
        background: scrolled?(dark?"rgba(20,12,6,0.88)":"rgba(250,246,240,0.9)"):"transparent",
        backdropFilter: scrolled?"blur(28px) saturate(180%)":"none",
        WebkitBackdropFilter: scrolled?"blur(28px) saturate(180%)":"none",
        borderBottom: scrolled?`1px solid ${border}`:"none",
        transition: "background 0.45s ease, border-color 0.45s ease",
        padding: "0 max(24px,calc((100vw - 1440px) / 2 + 24px))",
      }}
    >
      <nav className="flex items-center justify-between max-w-[1440px] mx-auto" style={{ height:68 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>scrollTo("home")}>
          <LogoMark size={24} color={dark?C.apricot:C.hazelnut} />
          <span style={{ fontFamily:serif, fontWeight:700, fontSize:"1.18rem", color:dark?C.apricot:C.hazelnut, letterSpacing:"0.01em" }}>Whisk & Wonder</span>
        </div>

        <div className="hidden md:flex items-center" style={{ gap:34 }}>
          {navLinks.map(link => (
            <button key={link} onClick={()=>scrollTo(link.toLowerCase().replace(/\s+/g,"-"))}
              style={{ fontFamily:sans, fontSize:"0.77rem", fontWeight:500, background:"none", border:"none", cursor:"pointer", letterSpacing:"0.02em", padding:"4px 0" }}>
              <span style={{ color:dark?C.oats:C.cocoa, opacity:0.68, transition:"opacity 0.2s" }}
                onMouseEnter={e=>(e.currentTarget.style.opacity="1")}
                onMouseLeave={e=>(e.currentTarget.style.opacity="0.68")}>
                {link}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Search */}
          <motion.button onClick={onSearch} whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }} aria-label="Search"
            style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:"8px" }}>
            <Search size={16} />
          </motion.button>

          {/* Wishlist */}
          <div style={{ position:"relative" }}>
            <motion.button onClick={onWishlist} whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }} aria-label="Wishlist"
              style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:"8px" }}>
              <Heart size={16} />
            </motion.button>
            <AnimatePresence>
              {wishCount > 0 && (
                <motion.span initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                  style={{ position:"absolute", top:-1, right:-1, width:14, height:14, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"bold", background:C.peach, color:"#fff", fontFamily:sans }}>
                  {wishCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Cart */}
          <div style={{ position:"relative" }}>
            <motion.button onClick={onCart} whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }} aria-label="Cart"
              style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:"8px" }}>
              <ShoppingCart size={16} />
            </motion.button>
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
                  style={{ position:"absolute", top:-1, right:-1, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"bold", background:C.peach, color:"#fff", fontFamily:sans }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Dark mode */}
          <motion.button onClick={()=>setDark(!dark)} whileHover={{ scale:1.1 }} whileTap={{ scale:0.92 }}
            style={{ background:dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)"}`, borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:dark?C.apricot:C.hazelnut, marginLeft:4 }}>
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
          </motion.button>

          {/* User / Auth */}
          <div style={{ position:"relative", marginLeft:4 }}>
            {user ? (
              <>
                <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}
                  onClick={()=>setProfileOpen(v=>!v)}
                  style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.hazelnut},${C.cocoa})`, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:700, color:C.crema }}>{user.initials}</span>
                </motion.button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity:0, scale:0.9, y:-8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9, y:-8 }}
                      transition={{ duration:0.18 }}
                      style={{ position:"absolute", top:"calc(100% + 10px)", right:0, width:220, background:dark?"#1A1008":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.07)":C.shortbread}`, borderRadius:18, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", overflow:"hidden", zIndex:50 }}>
                      <div style={{ padding:"18px 18px 14px", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.06)":C.shortbread}` }}>
                        <p style={{ fontFamily:serif, fontSize:"0.96rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:2 }}>{user.name}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.66rem", color:dark?C.shortbread:C.hazelnut, opacity:0.6 }}>{user.email}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, color:C.peach, marginTop:6 }}>{user.points.toLocaleString()} Dessert Points</p>
                      </div>
                      <button onClick={()=>{ setProfileOpen(false); onProfile(); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 18px", background:"none", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.78rem", color:dark?C.shortbread:C.hazelnut }}
                        onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.04)":C.oats}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <User size={13}/> My Profile
                      </button>
                      <button onClick={()=>{ setProfileOpen(false); onProfile(); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 18px", background:"none", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.78rem", color:dark?C.shortbread:C.hazelnut }}
                        onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.04)":C.oats}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <ShoppingBag size={13}/> My Orders
                      </button>
                      {user.isOwner && (
                        <button onClick={()=>{ setProfileOpen(false); onAdmin(); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 18px", background:"none", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.78rem", fontWeight:700, color:C.apricot }}
                          onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.04)":C.oats}
                          onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <BarChart3 size={13} /> Owner Console
                        </button>
                      )}
                      <button onClick={()=>{ setProfileOpen(false); onLogout(); }}
                        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 18px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.78rem", color:C.peach, borderTop:`1px solid ${dark?"rgba(255,255,255,0.06)":C.shortbread}` }}
                        onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.04)":C.oats}
                        onMouseLeave={e=>e.currentTarget.style.background="none"}>
                        <LogOut size={13} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <motion.button onClick={onAuth} whileHover={{ scale:1.06 }} whileTap={{ scale:0.94 }}
                style={{ width:34, height:34, borderRadius:"50%", background:dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)", border:`1px solid ${dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:sub }}>
                <User size={15} />
              </motion.button>
            )}
          </div>

          <button className="md:hidden flex p-2 ml-1"
            style={{ background:"none", border:"none", cursor:"pointer", color:dark?C.crema:C.cocoa }}
            onClick={()=>setMobileOpen(v=>!v)}>
            {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
            className="md:hidden overflow-hidden"
            style={{ background:dark?"rgba(20,12,6,0.97)":"rgba(250,246,240,0.97)", borderTop:`1px solid ${border}` }}>
            {navLinks.map(l=>(
              <button key={l} onClick={()=>scrollTo(l.toLowerCase().replace(/\s+/g,"-"))}
                className="block w-full text-left px-6 py-4"
                style={{ fontFamily:sans, fontSize:"0.88rem", fontWeight:500, color:dark?C.oats:C.cocoa, background:"none", border:"none", cursor:"pointer", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"}` }}>
                {l}
              </button>
            ))}
            <div style={{ display:"flex", gap:10, padding:"14px 24px" }}>
              <button onClick={()=>{setMobileOpen(false);onSearch();}} style={{ display:"flex",gap:6,alignItems:"center",fontFamily:sans,fontSize:"0.8rem",color:dark?C.oats:C.cocoa,background:"none",border:"none",cursor:"pointer" }}><Search size={14}/>Search</button>
              <button onClick={()=>{setMobileOpen(false);onCart();}} style={{ display:"flex",gap:6,alignItems:"center",fontFamily:sans,fontSize:"0.8rem",color:dark?C.oats:C.cocoa,background:"none",border:"none",cursor:"pointer" }}><ShoppingCart size={14}/>Cart {cartCount>0&&`(${cartCount})`}</button>
              {!user && <button onClick={()=>{setMobileOpen(false);onAuth();}} style={{ display:"flex",gap:6,alignItems:"center",fontFamily:sans,fontSize:"0.8rem",color:dark?C.oats:C.cocoa,background:"none",border:"none",cursor:"pointer" }}><User size={14}/>Sign In</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
const colorOrbs = [
  { color:C.apricot, size:160, x:"11%", y:"20%", blur:80, op:0.22 },
  { color:C.lilac,   size:100, x:"80%", y:"12%", blur:55, op:0.18 },
  { color:C.peach,   size:130, x:"90%", y:"64%", blur:70, op:0.18 },
  { color:C.mint,    size:80,  x:"5%",  y:"74%", blur:45, op:0.15 },
  { color:C.lavender,size:90,  x:"50%", y:"86%", blur:50, op:0.13 },
  { color:C.apricot, size:60,  x:"62%", y:"7%",  blur:35, op:0.12 },
];

function HeroSection({ dark, onExplore, onDesign }: { dark:boolean; onExplore:()=>void; onDesign:()=>void }) {
  const mouseX = useMotionValue(0); const mouseY = useMotionValue(0);
  const sx = useSpring(mouseX, { stiffness:26, damping:18 });
  const sy = useSpring(mouseY, { stiffness:26, damping:18 });
  const orbX = useTransform(sx,[-0.5,0.5],[-30,30]);
  const orbY = useTransform(sy,[-0.5,0.5],[-22,22]);
  const bgX  = useTransform(sx,[-0.5,0.5],[12,-12]);
  const bgY  = useTransform(sy,[-0.5,0.5],[8,-8]);
  const txtX = useTransform(sx,[-0.5,0.5],[-6,6]);
  const txtY = useTransform(sy,[-0.5,0.5],[-4,4]);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX-r.left)/r.width-0.5);
    mouseY.set((e.clientY-r.top)/r.height-0.5);
  },[mouseX,mouseY]);

  return (
    <section id="home"
      style={{ position:"relative", height:"100vh", width:"100%", display:"flex", alignItems:"center", overflow:"hidden", background:"#1A0F08" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={()=>{mouseX.set(0);mouseY.set(0);}}>

      {/* ── Full-cover background image with subtle parallax ── */}
      <motion.div style={{ position:"absolute", inset:0, x:bgX, y:bgY, scale:1.08 }}>
        <img
          src="/assets/bakery-entrance.png"
          alt="Whisk & Wonder Bakery"
          style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center center", display:"block" }}
          loading="eager"
        />
      </motion.div>

      {/* ── Cinematic overlay — dark enough for text, warm for brand feel ── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:[
          "linear-gradient(180deg, rgba(0,0,0,0.54) 0%, rgba(0,0,0,0.18) 24%, transparent 46%)",
          "linear-gradient(0deg,  rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.30) 26%, transparent 55%)",
          dark
            ? "radial-gradient(ellipse 90% 90% at 50% 50%, rgba(12,5,2,0.26) 0%, transparent 72%)"
            : "radial-gradient(ellipse 90% 90% at 50% 50%, rgba(74,40,14,0.14) 0%, transparent 72%)",
        ].join(", "),
      }}/>

      {/* ── Warm colour orbs ── */}
      <motion.div style={{ position:"absolute", inset:0, pointerEvents:"none", x:orbX, y:orbY }}>
        {colorOrbs.map((o,i)=>(
          <motion.div key={i} style={{ position:"absolute", borderRadius:"50%", left:o.x, top:o.y, width:o.size, height:o.size, background:o.color, opacity:o.op*0.6, filter:`blur(${o.blur}px)`, transform:"translate(-50%,-50%)" }}
            animate={{ scale:[1,1.18,1], opacity:[o.op*0.5,o.op*0.9,o.op*0.5] }}
            transition={{ duration:4+i*0.9, repeat:Infinity, ease:"easeInOut", delay:i*0.55 }} />
        ))}
      </motion.div>

      {/* ── Text content ── */}
      <motion.div
        className="relative z-10 max-w-[1440px] mx-auto px-6 w-full flex flex-col items-center text-center"
        style={{ x:txtX, y:txtY, paddingTop:"7rem", paddingBottom:"5rem" }}>

        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15, duration:0.7 }}
          style={{ display:"flex", alignItems:"center", gap:14, marginBottom:32 }}>
          <div style={{ width:36, height:1, background:C.apricot, opacity:0.6 }} />
          <span style={{ fontFamily:sans, fontSize:"0.63rem", fontWeight:600, color:C.apricot, letterSpacing:"0.36em" }}>FRESHLY BAKED DAILY · PUNE</span>
          <div style={{ width:36, height:1, background:C.apricot, opacity:0.6 }} />
        </motion.div>

        {/* No overflow:hidden — prevents text clipping */}
        <motion.h1
          initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.28, duration:0.9, ease:[0.16,1,0.3,1] }}
          style={{ fontFamily:serif, fontWeight:700, fontSize:"clamp(2.6rem,5.8vw,5rem)", color:C.crema, lineHeight:1.18, maxWidth:860, marginBottom:"1.4rem", textShadow:"0 2px 24px rgba(0,0,0,0.32)" }}>
          Freshly Baked{" "}<em style={{ fontStyle:"italic", color:C.apricot }}>Happiness</em><br/>Every Day
        </motion.h1>

        <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.7 }}
          style={{ fontFamily:sans, fontSize:"1rem", color:C.shortbread, maxWidth:520, lineHeight:1.84, marginBottom:"3rem", fontWeight:300, opacity:0.88 }}>
          Handcrafted desserts made with premium ingredients, baked fresh every morning with love and a little magic.
        </motion.p>

        <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.64, duration:0.65 }}
          style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:"4rem" }}>
          <Btn variant="primary" dark={true} size="lg" onClick={onExplore}>Explore Menu</Btn>
          <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }} onClick={onDesign}
            style={{ padding:"16px 48px", background:"rgba(255,255,255,0.1)", color:C.crema, border:"1.5px solid rgba(255,255,255,0.32)", borderRadius:100, fontFamily:sans, fontWeight:600, fontSize:"0.94rem", letterSpacing:"0.04em", cursor:"pointer", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", display:"inline-flex", alignItems:"center", gap:8 }}>
            Design Your Cake
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.82, duration:0.6 }}
          style={{ display:"flex", gap:56, flexWrap:"wrap", justifyContent:"center" }}>
          {[["12k+","Happy Customers"],["48+","Signature Recipes"],["100%","Fresh Daily"]].map(([num,label])=>(
            <div key={num} style={{ textAlign:"center" }}>
              <div style={{ width:1, height:20, background:"rgba(255,255,255,0.14)", margin:"0 auto 12px" }} />
              <p style={{ fontFamily:serif, fontSize:"2rem", fontWeight:700, color:C.apricot, lineHeight:1 }}>{num}</p>
              <p style={{ fontFamily:sans, fontSize:"0.65rem", color:C.shortbread, marginTop:5, letterSpacing:"0.1em", opacity:0.68 }}>{label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div style={{ position:"absolute", bottom:32, left:"50%", translateX:"-50%" }} animate={{ y:[0,10,0] }} transition={{ duration:2.4, repeat:Infinity }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <div style={{ width:1, height:44, background:"linear-gradient(180deg,transparent,rgba(255,255,255,0.32))" }} />
          <div style={{ width:4, height:4, borderRadius:"50%", background:C.apricot, opacity:0.65 }} />
        </div>
      </motion.div>
    </section>
  );
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const categoryIcons: Record<string, any> = {
  "Birthday Cakes": Gift, "Wedding Cakes": Sparkles, "Chocolate Cakes": Layers,
  "Strawberry Cakes": Heart, "Cheesecakes": Layers, "Cupcakes": Sparkles,
  "Donuts": ShoppingBag, "Cookies": Star, "Croissants": Coffee,
  "Macarons": Heart, "Coffee": Coffee, "Tea": Coffee,
  "Bread": ShoppingBag, "Pastries": Coffee, "Seasonal Specials": Sparkles,
  "Gift Boxes": Gift,
};
const CATEGORY_PAGE_SIZE = 8;

function CategoriesSection({ dark, onProduct }: { dark:boolean; onProduct:(p:Product)=>void }) {
  const [active, setActive] = useState("All");
  const [sort, setSort]     = useState<"featured"|"price-asc"|"price-desc"|"rating">("featured");
  const [visible, setVisible] = useState(CATEGORY_PAGE_SIZE);
  const { toast } = useToast();
  const { products: allProducts, categories: storeCategories } = useProductStore();
  const categoryList = ["All", ...storeCategories];

  const filtered = (active==="All" ? allProducts : allProducts.filter(p=>p.category===active));
  const sorted = [...filtered].sort((a,b)=>{
    if (sort==="price-asc") return a.price-b.price;
    if (sort==="price-desc") return b.price-a.price;
    if (sort==="rating") return b.rating-a.rating;
    return (b.isBestSeller?1:0)-(a.isBestSeller?1:0);
  });
  const shown = sorted.slice(0, visible);

  const handleCategory = (label:string) => { setActive(label); setVisible(CATEGORY_PAGE_SIZE); };

  return (
    <section id="menu" style={{ background:dark?"#1C1008":C.oats, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Our Menu</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, marginBottom:"2.2rem", fontWeight:700 }}>
          What are you <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>craving</em> today?
        </h2>
        <div className="flex flex-wrap gap-3 justify-center" style={{ marginBottom:28 }}>
          {categoryList.map((label,i)=>{
            const isActive = active===label;
            const Icon = categoryIcons[label] ?? Sparkles;
            return (
              <motion.button key={label} onClick={()=>handleCategory(label)}
                initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
                transition={{ delay:i*0.025 }} whileHover={{ y:-3, scale:1.03 }} whileTap={{ scale:0.97 }}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:100, background:isActive?(dark?C.apricot:C.hazelnut):(dark?"rgba(255,255,255,0.05)":C.crema), border:`1px solid ${isActive?"transparent":dark?"rgba(255,255,255,0.08)":C.shortbread}`, cursor:"pointer", boxShadow:isActive?"0 8px 28px rgba(122,92,58,0.28)":"0 2px 10px rgba(0,0,0,0.04)", transition:"all 0.22s ease" }}>
                <Icon size={13} color={isActive?(dark?C.cocoa:C.crema):(dark?`${C.oats}AA`:C.hazelnut)} />
                <span style={{ fontFamily:sans, fontSize:"0.76rem", fontWeight:600, color:isActive?(dark?C.cocoa:C.crema):(dark?`${C.oats}BB`:C.hazelnut) }}>{label}</span>
              </motion.button>
            );
          })}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:36 }}>
          <p style={{ fontFamily:sans, fontSize:"0.78rem", color:dark?C.shortbread:C.hazelnut, opacity:0.7 }}>{filtered.length} {filtered.length===1?"item":"items"}</p>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontFamily:sans, fontSize:"0.7rem", color:dark?C.shortbread:C.hazelnut, opacity:0.6, letterSpacing:"0.08em" }}>SORT</span>
            <select value={sort} onChange={e=>setSort(e.target.value as any)}
              style={{ fontFamily:sans, fontSize:"0.78rem", fontWeight:600, color:dark?C.crema:C.cocoa, background:dark?"rgba(255,255,255,0.06)":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, borderRadius:100, padding:"8px 14px", cursor:"pointer", outline:"none" }}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {shown.length===0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", opacity:0.6 }}>
            <p style={{ fontFamily:serif, fontSize:"1.2rem", color:dark?C.crema:C.cocoa }}>No treats found in this category yet.</p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(300px, 100%), 300px))", gap:24, justifyContent:"center" }}>
            {shown.map(p=><ProductCard key={p.id} p={p} dark={dark} onOpen={()=>onProduct(p)}/>)}
          </div>
        )}

        {visible < sorted.length && (
          <div style={{ textAlign:"center", marginTop:44 }}>
            <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }}
              onClick={()=>{ setVisible(v=>v+CATEGORY_PAGE_SIZE); toast("More treats loaded 🍰","info"); }}
              style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:600, color:dark?C.cocoa:C.crema, background:dark?C.apricot:C.hazelnut, border:"none", borderRadius:100, padding:"13px 34px", cursor:"pointer", boxShadow:"0 8px 28px rgba(122,92,58,0.28)" }}>
              Show More
            </motion.button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, dark, onOpen }: { p: Product; dark:boolean; onOpen:()=>void }) {
  const { add }         = useCart();
  const { toggle, has } = useWishlist();
  const { toast }       = useToast();
  const { playSfx }     = useSound();
  const [added, setAdded] = useState(false);
  const liked = has(p.id);

  const rotateX  = useMotionValue(0); const rotateY  = useMotionValue(0);
  const springRX = useSpring(rotateX,{ stiffness:220, damping:32 });
  const springRY = useSpring(rotateY,{ stiffness:220, damping:32 });

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rotateX.set(-((e.clientY-r.top)/r.height-0.5)*10);
    rotateY.set(((e.clientX-r.left)/r.width-0.5)*10);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const s = p.sizes[1]??p.sizes[0];
    add({ productId:p.id, name:p.name, price:s?.price??p.price, qty:1, imgId:p.imgId, size:s?.label??"Standard", category:p.category });
    toast(`${p.name} added to cart! 🛒`, "success");
    playSfx("cart");
    setAdded(true); setTimeout(()=>setAdded(false),1600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(p.id);
    toast(liked?`Removed from wishlist`:`${p.name} saved ♡`,"success");
    playSfx("wishlist");
  };

  return (
    <div style={{ width:"min(300px, 100%)", perspective:1200 }} onClick={onOpen}>
      <motion.div initial={{ opacity:0, y:32 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
        whileHover={{ boxShadow:`0 36px 80px rgba(0,0,0,${dark?0.48:0.16})`, y:-8 }}
        style={{ rotateX:springRX, rotateY:springRY, background:dark?"#3A2A1E":C.crema, borderRadius:28, overflow:"hidden", border:`1px solid ${dark?"rgba(255,255,255,0.07)":C.shortbread}`, boxShadow:`0 8px 32px rgba(0,0,0,${dark?0.28:0.07})`, cursor:"pointer", transformStyle:"preserve-3d", display:"flex", flexDirection:"column" }}
        transition={{ duration:0.32 }} onMouseMove={handleTilt} onMouseLeave={()=>{rotateX.set(0);rotateY.set(0);}}>
        {/* Image */}
        <div style={{ position:"relative", overflow:"hidden", height:220, flexShrink:0, borderRadius:"28px 28px 0 0" }}>
          <motion.img src={img(p.imgId,480,360)} alt={p.name}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
            whileHover={{ scale:1.07 }} transition={{ duration:0.55 }} loading="lazy" />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.04) 40%,transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:14, left:14 }}>
            <span style={{ background:C.hazelnut, color:C.crema, fontFamily:sans, fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.14em", padding:"4px 12px", borderRadius:100 }}>{p.tag}</span>
          </div>
          <motion.button onClick={handleWishlist} whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}
            style={{ position:"absolute", top:14, right:14, width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.92)", border:"none", cursor:"pointer", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Heart size={15} fill={liked?C.peach:"none"} color={liked?C.peach:C.hazelnut} />
          </motion.button>
        </div>
        {/* Content */}
        <div style={{ padding:"20px 22px 24px", display:"flex", flexDirection:"column", flex:1 }}>
          <div style={{ display:"flex", gap:2, marginBottom:8 }}>
            {Array.from({length:5}).map((_,i)=><Star key={i} size={11} fill={i<p.rating?C.apricot:"none"} color={i<p.rating?C.apricot:C.shortbread}/>)}
          </div>
          <h3 style={{ fontFamily:serif, fontSize:"1.08rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:8, lineHeight:1.35 }}>{p.name}</h3>
          <p style={{ fontFamily:sans, fontSize:"0.76rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.72, opacity:0.78, marginBottom:20, flex:1 }}>{p.desc}</p>
          {/* Price + button always at bottom */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontFamily:serif, fontSize:"1.38rem", fontWeight:700, color:dark?C.apricot:C.peach, flexShrink:0 }}>₹{p.price}</span>
            <motion.button onClick={handleAddToCart} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              style={{ padding:"9px 18px", borderRadius:100, background:added?C.mint:(dark?C.apricot:C.hazelnut), color:added?"#1A4A34":(dark?C.cocoa:C.crema), border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.72rem", fontWeight:600, letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:6, transition:"background 0.35s,color 0.35s", boxShadow:added?"none":"0 4px 16px rgba(122,92,58,0.2)", flexShrink:0 }}>
              {added?<><Check size={13}/>Added</>:<><ShoppingCart size={13}/>Add to Cart</>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeaturedProducts({ dark, onProduct }: { dark:boolean; onProduct:(p:Product)=>void }) {
  const { products: allProducts } = useProductStore();
  const featured = (() => {
    const flagged = allProducts.filter(p => p.isFeatured);
    return (flagged.length ? flagged : allProducts).slice(0, 4);
  })();
  return (
    <section style={{ background:dark?"#221408":C.crema, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Featured</SectionLabel>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"3.5rem", flexWrap:"wrap", gap:16 }}>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, maxWidth:500 }}>
            Our most <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>loved</em> creations
          </h2>
          <motion.button whileHover={{ x:4 }}
            style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:600, color:dark?C.apricot:C.hazelnut, background:"none", border:`1px solid ${dark?"rgba(255,188,138,0.38)":"rgba(122,92,58,0.28)"}`, borderRadius:100, padding:"10px 24px", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}
            onClick={()=>document.getElementById("menu")?.scrollIntoView({behavior:"smooth"})}>
            View All <ChevronRight size={14}/>
          </motion.button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(300px, 100%), 300px))", gap:24, justifyContent:"center" }}>
          {featured.map(p=><ProductCard key={p.id} p={p} dark={dark} onOpen={()=>onProduct(p)}/>)}
        </div>
      </div>
    </section>
  );
}

// ─── CHIP BUTTON ──────────────────────────────────────────────────────────────
function ChipBtn({ children, active, dark, onClick }: { children:React.ReactNode; active:boolean; dark:boolean; onClick:()=>void }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
      style={{ padding:"8px 16px", borderRadius:100, background:active?(dark?C.apricot:C.hazelnut):(dark?"rgba(255,255,255,0.06)":C.crema), color:active?(dark?C.cocoa:C.crema):(dark?`${C.oats}BB`:C.hazelnut), border:`1px solid ${active?"transparent":dark?"rgba(255,255,255,0.1)":C.shortbread}`, fontFamily:sans, fontSize:"0.76rem", fontWeight:500, cursor:"pointer", transition:"all 0.2s ease" }}>
      {children}
    </motion.button>
  );
}

// ─── CAKE STUDIO ──────────────────────────────────────────────────────────────
const WEIGHT_OPTIONS = ["0.5 KG","1 KG","1.5 KG","2 KG","3 KG","4 KG","5 KG","Custom"];
const SHAPE_OPTIONS  = ["Round","Square","Heart","Rectangle","Hexagon"];
const LAYER_OPTIONS  = ["1 Layer","2 Layers","3 Layers","4 Layers","5 Layers"];
const FLAVOR_OPTIONS = ["Chocolate","Vanilla","Strawberry","Black Forest","Red Velvet","Blueberry","Butterscotch","Mango","Pineapple","Coffee","Hazelnut","Custom Flavor"];
const CREAM_OPTIONS  = ["Buttercream","Whipped Cream","Ganache","Fondant"];
const DECO_OPTIONS   = ["Fresh Flowers","Chocolates","Macarons","Berries","Candles","Gold Leaf","Sprinkles","Fruits","Cookies","Ferrero","KitKat","Oreo","Name Topper","Acrylic Topper"];
const TIME_OPTIONS   = ["Morning (9–12am)","Afternoon (12–4pm)","Evening (4–8pm)"];
const STUDIO_COLORS  = [
  "#FAF6F0","#F4B8C8","#C9B4E8","#9DD4B8","#F5E6C8","#F4956A",
  "#A8D4F0","#B8D4B0","#D4A8B8","#8B6348","#8B2252","#4A5C8A",
  "#D4A843","#E8E0F0","#E8B4A0","#6B8E5A","#C8A870","#E0D4F0",
];

const flavorColors: Record<string,string> = {
  Chocolate:"#5C3D2E", Vanilla:"#FFF5DC", Strawberry:"#F4A8C0",
  "Black Forest":"#2D1B10", "Red Velvet":"#C0392B", Blueberry:"#5870C8",
  Butterscotch:"#D4A843", Mango:"#FFB347", Pineapple:"#F5E642",
  Coffee:"#6F4E37", Hazelnut:"#8B6914", "Custom Flavor":"#D4A8B8",
};
const creamColors: Record<string,string> = {
  Buttercream:"#FFFDE7", "Whipped Cream":"#F5F5F5", Ganache:"#3E2012", Fondant:"#E8E0E0",
};
const decoColors: Record<string,string> = {
  "Fresh Flowers":"#E8A0C0","Chocolates":"#5C3D2E","Macarons":"#F4B8C8",
  "Berries":"#C0392B","Candles":"#FFD060","Gold Leaf":"#D4A843",
  "Sprinkles":"#FFBC8A","Fruits":"#E8606A","Cookies":"#D4A843",
  "Ferrero":"#C8960C","KitKat":"#C0392B","Oreo":"#2D2D2D",
  "Name Topper":"#C9B4E8","Acrylic Topper":"#A8D4F0",
};

// Pricing (INR)
const WEIGHT_PRICES: Record<string,number> = {
  "0.5 KG":549,"1 KG":999,"1.5 KG":1449,"2 KG":1849,"3 KG":2649,"4 KG":3449,"5 KG":4199,"Custom":999,
};
const LAYER_ADD: Record<string,number>  = { "1 Layer":0,"2 Layers":180,"3 Layers":360,"4 Layers":540,"5 Layers":720 };
const FLAVOR_ADD: Record<string,number> = { "Black Forest":150,"Red Velvet":100,"Blueberry":100,"Coffee":150,"Hazelnut":150,"Mango":100 };
const CREAM_ADD: Record<string,number>  = { Buttercream:0,"Whipped Cream":0,Ganache:200,Fondant:300 };
const SHAPE_ADD: Record<string,number>  = { Round:0,Square:0,Heart:150,Rectangle:100,Hexagon:200 };
const DECO_PRICES: Record<string,number> = {
  "Fresh Flowers":350,"Chocolates":200,"Macarons":300,"Berries":200,"Candles":100,
  "Gold Leaf":450,"Sprinkles":50,"Fruits":150,"Cookies":180,"Ferrero":350,
  "KitKat":200,"Oreo":150,"Name Topper":300,"Acrylic Topper":400,
};
const GST_RATE = 0.05;
const DESIGNS_KEY = "ww_cake_designs";

interface CakeSel {
  weight:string; shape:string; layers:string; flavor:string; cream:string;
  color:string; decorations:string[]; message:string;
  deliveryDate:string; deliveryTime:string; specialInstructions:string;
  customWeight:string; customFlavor:string;
}
const DEFAULT_SEL: CakeSel = {
  weight:"1 KG", shape:"Round", layers:"2 Layers", flavor:"Strawberry",
  cream:"Buttercream", color:"#F4B8C8", decorations:["Fresh Flowers","Candles"],
  message:"Happy Birthday!", deliveryDate:"", deliveryTime:"Morning (9–12am)",
  specialInstructions:"", customWeight:"", customFlavor:"",
};

const DND_TYPES = { TOPPING:"topping", COLOR:"color", FLAVOR:"flavor" } as const;

function DraggableTopping({ value, active, dark, onClick }: { value:string; active:boolean; dark:boolean; onClick:()=>void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPES.TOPPING, item: { value }, collect: (m)=>({ isDragging: m.isDragging() }),
  }), [value]);
  return (
    <motion.button ref={drag as any} onClick={onClick} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
      style={{ padding:"7px 15px", borderRadius:100, background:active?(dark?C.apricot:C.hazelnut):(dark?"rgba(255,255,255,0.06)":C.crema), color:active?(dark?C.cocoa:C.crema):(dark?`${C.oats}BB`:C.hazelnut), border:`1px solid ${active?"transparent":dark?"rgba(255,255,255,0.1)":C.shortbread}`, fontFamily:sans, fontSize:"0.74rem", fontWeight:500, cursor:"grab", opacity:isDragging?0.35:1, transition:"all 0.18s ease" }}
      title="Click to toggle · drag onto cake">
      {value}
    </motion.button>
  );
}

function DraggableColorSwatch({ value, active, dark, onClick }: { value:string; active:boolean; dark:boolean; onClick:()=>void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPES.COLOR, item: { value }, collect: (m)=>({ isDragging: m.isDragging() }),
  }), [value]);
  return (
    <motion.button ref={drag as any} whileHover={{ scale:1.18 }} whileTap={{ scale:0.9 }} onClick={onClick}
      style={{ width:28, height:28, borderRadius:"50%", background:value, border:active?`2.5px solid ${dark?C.apricot:C.hazelnut}`:"2.5px solid transparent", cursor:"grab", boxShadow:active?`0 0 0 3px ${dark?"rgba(255,188,138,0.3)":"rgba(122,92,58,0.22)"}`:"0 2px 6px rgba(0,0,0,0.14)", outline:"none", opacity:isDragging?0.35:1, transition:"all 0.18s" }}
      title="Click or drag onto cake" />
  );
}

function DraggableFlavorChip({ value, active, dark, onClick }: { value:string; active:boolean; dark:boolean; onClick:()=>void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_TYPES.FLAVOR, item: { value }, collect: (m)=>({ isDragging: m.isDragging() }),
  }), [value]);
  return (
    <motion.button ref={drag as any} onClick={onClick} whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
      style={{ padding:"7px 15px", borderRadius:100, background:active?(dark?C.apricot:C.hazelnut):(dark?"rgba(255,255,255,0.06)":C.crema), color:active?(dark?C.cocoa:C.crema):(dark?`${C.oats}BB`:C.hazelnut), border:`1px solid ${active?"transparent":dark?"rgba(255,255,255,0.1)":C.shortbread}`, fontFamily:sans, fontSize:"0.74rem", fontWeight:500, cursor:"grab", opacity:isDragging?0.35:1, transition:"all 0.18s ease" }}
      title="Click or drag onto cake">
      {value}
    </motion.button>
  );
}

function CakeStudioSection({ dark, onOrder }: { dark:boolean; onOrder:()=>void }) {
  const [sel, setSel] = useState<CakeSel>(DEFAULT_SEL);
  const [savedDesigns, setSavedDesigns] = useState<{name:string;sel:CakeSel}[]>(() => {
    try { return JSON.parse(localStorage.getItem(DESIGNS_KEY) || "[]"); } catch { return []; }
  });
  const [savePrompt, setSavePrompt] = useState(false);
  const [designName, setDesignName] = useState("");
  const { add } = useCart();
  const { toast } = useToast();
  const { playSfx } = useSound();

  const toggleDeco = (v:string) => setSel(s=>({ ...s, decorations:s.decorations.includes(v)?s.decorations.filter(x=>x!==v):[...s.decorations,v] }));

  // Live price calculation
  const basePrice     = WEIGHT_PRICES[sel.weight] || 999;
  const layerAdd      = LAYER_ADD[sel.layers] || 0;
  const flavorAdd     = FLAVOR_ADD[sel.flavor] || 0;
  const creamAdd      = CREAM_ADD[sel.cream] || 0;
  const shapeAdd      = SHAPE_ADD[sel.shape] || 0;
  const decoAdd       = sel.decorations.reduce((a,d)=>a+(DECO_PRICES[d]||0),0);
  const premiumCharge = layerAdd + flavorAdd + creamAdd + shapeAdd;
  const subtotal      = basePrice + premiumCharge + decoAdd;
  const tax           = Math.round(subtotal * GST_RATE);
  const grandTotal    = subtotal + tax;
  const fmtINR        = (n:number) => `₹${n.toLocaleString("en-IN")}`;

  // DnD
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [DND_TYPES.TOPPING, DND_TYPES.COLOR, DND_TYPES.FLAVOR],
    drop: (item: { value:string }, monitor) => {
      const type = monitor.getItemType();
      if (type === DND_TYPES.TOPPING) {
        setSel(s => s.decorations.includes(item.value) ? s : { ...s, decorations:[...s.decorations, item.value] });
        toast(`${item.value} added ✨`, "success");
      } else if (type === DND_TYPES.COLOR) {
        setSel(s => ({ ...s, color:item.value }));
        toast("Frosting colour updated 🎨", "success");
      } else if (type === DND_TYPES.FLAVOR) {
        setSel(s => ({ ...s, flavor:item.value }));
        toast(`Sponge is now ${item.value} 🍰`, "success");
      }
      playSfx("click");
    },
    collect: (m)=>({ isOver:m.isOver(), canDrop:m.canDrop() }),
  }), [playSfx]);

  // Cake visual dimensions
  const layerCount = parseInt(sel.layers) || 2;
  const shapeWidthMod: Record<string,number> = { Round:1, Square:0.93, Heart:0.96, Rectangle:1.2, Hexagon:0.92 };
  const cakeW = Math.round(182 * (shapeWidthMod[sel.shape] || 1));
  const layerH = Math.max(32, Math.round(108 / layerCount));

  // Build layered cake elements (top layer = index 0, bottom = layerCount-1)
  const layerElements: React.ReactNode[] = [];
  for (let li = 0; li < layerCount; li++) {
    const widthFraction = 0.55 + (li / Math.max(layerCount - 1, 1)) * 0.45;
    const w = Math.round(cakeW * widthFraction);
    const isTop    = li === 0;
    const isBottom = li === layerCount - 1;
    const creamClr = creamColors[sel.cream] || "#FFFDE7";
    const flvClr   = flavorColors[sel.flavor] || "#F4A8C0";
    layerElements.push(
      // cream ring above each layer
      <div key={`cr-${li}`} style={{ width:w+8, height:6, background:creamClr, borderRadius:isTop?"4px 4px 0 0":"0", flexShrink:0 }} />,
      // layer body
      <div key={`ly-${li}`} style={{ width:w, height:layerH, background:`linear-gradient(148deg,${flvClr}60,${sel.color}CC)`, borderRadius:isBottom?"0 0 13px 13px":"0", display:"flex", alignItems:"center", justifyContent:"center", gap:5, position:"relative", overflow:"hidden", flexShrink:0, boxShadow:isBottom?"0 16px 40px rgba(0,0,0,0.13)":"none" }}>
        {isTop && sel.decorations.includes("Fresh Flowers") && (
          <div style={{ display:"flex", gap:4 }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:"50%",background:decoColors["Fresh Flowers"],opacity:0.9 }}/>)}</div>
        )}
        {isTop && sel.decorations.includes("Macarons") && (
          <div style={{ display:"flex", gap:4 }}>{[C.peach,C.lilac,C.mint].map((c,i)=><div key={i} style={{ width:10,height:8,borderRadius:"50%",background:c,opacity:0.9 }}/>)}</div>
        )}
        {!isTop && ["Berries","Chocolates","Fruits","Ferrero"].filter(d=>sel.decorations.includes(d)).slice(0,3).map(d=>(
          <div key={d} style={{ width:9,height:9,borderRadius:"50%",background:decoColors[d]||"#E8606A" }} />
        ))}
        {sel.decorations.includes("Sprinkles") && (
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:4,pointerEvents:"none" }}>
            {[C.lilac,C.mint,C.apricot,C.peach,"#A8D4F0"].map((c,i)=><div key={i} style={{ width:5,height:5,borderRadius:2,background:c,transform:`rotate(${i*40}deg)` }}/>)}
          </div>
        )}
        {sel.decorations.includes("Gold Leaf") && (
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 38%,rgba(212,168,67,0.24) 55%,transparent 72%)",pointerEvents:"none" }} />
        )}
        {sel.decorations.includes("KitKat") && isBottom && (
          <div style={{ position:"absolute",left:0,top:0,bottom:0,width:10,background:"#C0392B",opacity:0.7 }} />
        )}
        {sel.decorations.includes("Oreo") && isBottom && (
          <div style={{ position:"absolute",right:8,display:"flex",flexDirection:"column",gap:2 }}>
            {[0,1].map(i=><div key={i} style={{ width:14,height:14,borderRadius:"50%",background:"#2D2D2D",border:"2px solid #FAF6F0" }}/>)}
          </div>
        )}
      </div>
    );
  }

  const handleOrder = () => {
    const flavorLabel = sel.flavor === "Custom Flavor" && sel.customFlavor ? sel.customFlavor : sel.flavor;
    const weightLabel = sel.weight === "Custom" && sel.customWeight ? sel.customWeight : sel.weight;
    add({
      productId:"custom",
      name:`Custom ${flavorLabel} Cake · ${weightLabel}`,
      price: grandTotal,
      qty:1,
      imgId:"1602663491496-73f07481dbea",
      size:`${weightLabel} · ${sel.shape} · ${sel.layers} · ${sel.cream}`,
      category:"Cakes",
    });
    toast("Custom cake added to cart! 🎂", "success");
    playSfx("cakeComplete");
    onOrder();
  };

  const handleSaveDesign = () => {
    if (!designName.trim()) return;
    const entry = { name: designName.trim(), sel:{ ...sel } };
    const next  = [entry, ...savedDesigns.filter(d=>d.name!==designName.trim())].slice(0, 8);
    setSavedDesigns(next);
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(next));
    toast(`Design "${entry.name}" saved 💾`, "success");
    setSavePrompt(false);
    setDesignName("");
  };

  const fieldBase: React.CSSProperties = { width:"100%", padding:"11px 18px", borderRadius:100, background:dark?"rgba(255,255,255,0.06)":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, fontFamily:sans, fontSize:"0.84rem", color:dark?C.crema:C.cocoa, outline:"none", boxSizing:"border-box", transition:"border 0.2s", colorScheme:dark?"dark":"light" as any };
  const onFocusBorder = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = dark?C.apricot:C.hazelnut; };
  const onBlurBorder  = (e: React.FocusEvent<HTMLInputElement|HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = dark?"rgba(255,255,255,0.1)":C.shortbread; };
  const rowLabel = (t:string, sub?:string) => (
    <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:dark?C.shortbread:C.hazelnut, letterSpacing:"0.2em", marginBottom:10 }}>
      {t}{sub && <span style={{ opacity:0.5, fontWeight:400, textTransform:"none", letterSpacing:0 }}> · {sub}</span>}
    </p>
  );

  return (
    <section id="custom-cakes" style={{ background:dark?"#1C1008":C.oats, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Cake Studio</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"0.5rem" }}>
          Design your <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>dream</em> cake
        </h2>
        <p style={{ fontFamily:sans, fontSize:"0.87rem", color:dark?C.shortbread:C.hazelnut, marginBottom:"3rem", opacity:0.68 }}>Every detail is yours to choose. Watch it come alive as you design.</p>

        {/* Saved designs */}
        {savedDesigns.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:32 }}>
            <span style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.22em" }}>SAVED</span>
            {savedDesigns.map(d=>(
              <div key={d.name} style={{ display:"flex", alignItems:"center", borderRadius:100, overflow:"hidden", border:`1px solid ${dark?"rgba(255,255,255,0.12)":C.shortbread}` }}>
                <button onClick={()=>{ setSel(d.sel); toast(`Loaded "${d.name}" ✨`,"success"); }} style={{ padding:"7px 14px", background:"none", border:"none", fontFamily:sans, fontSize:"0.73rem", fontWeight:500, color:dark?C.crema:C.cocoa, cursor:"pointer" }}>{d.name}</button>
                <button onClick={()=>{ const n=savedDesigns.filter(x=>x.name!==d.name); setSavedDesigns(n); localStorage.setItem(DESIGNS_KEY,JSON.stringify(n)); }} style={{ padding:"7px 10px 7px 4px", background:"none", border:"none", cursor:"pointer", color:dark?C.shortbread:C.hazelnut, opacity:0.4, fontSize:"0.8rem", lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:36, alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* ── LEFT: Ingredient Cabinet ── */}
          <div style={{ flex:1, minWidth:300 }}>
            <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.26em", marginBottom:28 }}>INGREDIENT CABINET</p>
            <div style={{ display:"grid", gap:28 }}>

              {/* Weight */}
              <div>
                {rowLabel("CAKE WEIGHT")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {WEIGHT_OPTIONS.map(v=><ChipBtn key={v} active={sel.weight===v} dark={dark} onClick={()=>setSel(s=>({...s,weight:v}))}>{v}</ChipBtn>)}
                </div>
                {sel.weight==="Custom" && (
                  <input value={sel.customWeight} onChange={e=>setSel(s=>({...s,customWeight:e.target.value}))} placeholder="e.g. 2.5 KG" style={{ ...fieldBase, marginTop:10 }} onFocus={onFocusBorder as any} onBlur={onBlurBorder as any} />
                )}
              </div>

              {/* Shape */}
              <div>
                {rowLabel("CAKE SHAPE")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {SHAPE_OPTIONS.map(v=><ChipBtn key={v} active={sel.shape===v} dark={dark} onClick={()=>setSel(s=>({...s,shape:v}))}>{v}</ChipBtn>)}
                </div>
              </div>

              {/* Layers */}
              <div>
                {rowLabel("CAKE LAYERS")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {LAYER_OPTIONS.map(v=><ChipBtn key={v} active={sel.layers===v} dark={dark} onClick={()=>setSel(s=>({...s,layers:v}))}>{v}</ChipBtn>)}
                </div>
              </div>

              {/* Flavour */}
              <div>
                {rowLabel("SPONGE FLAVOUR","click or drag onto cake")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {FLAVOR_OPTIONS.map(v=><DraggableFlavorChip key={v} value={v} active={sel.flavor===v} dark={dark} onClick={()=>setSel(s=>({...s,flavor:v}))}/>)}
                </div>
                {sel.flavor==="Custom Flavor" && (
                  <input value={sel.customFlavor} onChange={e=>setSel(s=>({...s,customFlavor:e.target.value}))} placeholder="Describe your custom flavour…" style={{ ...fieldBase, marginTop:10 }} onFocus={onFocusBorder as any} onBlur={onBlurBorder as any} />
                )}
              </div>

              {/* Cream */}
              <div>
                {rowLabel("CREAM TYPE")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {CREAM_OPTIONS.map(v=><ChipBtn key={v} active={sel.cream===v} dark={dark} onClick={()=>setSel(s=>({...s,cream:v}))}>{v}</ChipBtn>)}
                </div>
              </div>

              {/* Colour */}
              <div>
                {rowLabel("FROSTING COLOUR","click or drag")}
                <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
                  {STUDIO_COLORS.map(v=><DraggableColorSwatch key={v} value={v} active={sel.color===v} dark={dark} onClick={()=>setSel(s=>({...s,color:v}))}/>)}
                </div>
              </div>

              {/* Decorations */}
              <div>
                {rowLabel("DECORATIONS","click to toggle · drag onto cake")}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {DECO_OPTIONS.map(v=><DraggableTopping key={v} value={v} active={sel.decorations.includes(v)} dark={dark} onClick={()=>toggleDeco(v)}/>)}
                </div>
              </div>

              {/* Message */}
              <div>
                {rowLabel("GREETING MESSAGE")}
                <input value={sel.message} onChange={e=>setSel(s=>({...s,message:e.target.value}))} maxLength={50} placeholder="Happy Birthday!"
                  style={fieldBase} onFocus={onFocusBorder as any} onBlur={onBlurBorder as any} />
              </div>

              {/* Delivery */}
              <div style={{ display:"grid", gap:12 }}>
                {rowLabel("DELIVERY DATE & TIME")}
                <input type="date" value={sel.deliveryDate} onChange={e=>setSel(s=>({...s,deliveryDate:e.target.value}))}
                  style={fieldBase} onFocus={onFocusBorder as any} onBlur={onBlurBorder as any} />
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {TIME_OPTIONS.map(v=><ChipBtn key={v} active={sel.deliveryTime===v} dark={dark} onClick={()=>setSel(s=>({...s,deliveryTime:v}))}>{v}</ChipBtn>)}
                </div>
              </div>

              {/* Special instructions */}
              <div>
                {rowLabel("SPECIAL INSTRUCTIONS")}
                <textarea value={sel.specialInstructions} onChange={e=>setSel(s=>({...s,specialInstructions:e.target.value}))}
                  placeholder="Allergies, special requests, notes for our bakers…" rows={3}
                  style={{ ...fieldBase, borderRadius:16, resize:"none", lineHeight:1.6 }}
                  onFocus={onFocusBorder as any} onBlur={onBlurBorder as any} />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Stage + Summary ── */}
          <div style={{ width:408, flexShrink:0, display:"flex", flexDirection:"column", gap:18, position:"sticky", top:92 }}>
            <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.26em" }}>STUDIO STAGE</p>

            {/* Live preview drop zone */}
            <div ref={drop as any} style={{ borderRadius:24, background:isOver&&canDrop?(dark?"rgba(255,188,138,0.1)":`${C.apricot}18`):(dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.74)"), backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:`${isOver&&canDrop?2:1}px ${isOver&&canDrop?"dashed":"solid"} ${isOver&&canDrop?C.apricot:dark?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.88)"}`, boxShadow:dark?"0 28px 72px rgba(0,0,0,0.44)":"0 24px 72px rgba(0,0,0,0.07)", padding:"40px 24px 32px", position:"relative", overflow:"hidden", minHeight:380, display:"flex", flexDirection:"column", alignItems:"center", transition:"background 0.18s, border 0.18s" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width:"200%", height:200, background:"radial-gradient(ellipse at 50% 0%,rgba(255,180,80,0.12) 0%,transparent 68%)" }} />
              <p style={{ fontFamily:sans, fontSize:"0.58rem", color:dark?C.shortbread:C.hazelnut, letterSpacing:"0.22em", opacity:0.55, marginBottom:28 }}>{isOver&&canDrop?"DROP TO APPLY":"LIVE PREVIEW"}</p>

              <motion.div layout style={{ display:"flex", flexDirection:"column", alignItems:"center" }} animate={{ scale:[1,1.012,1] }} transition={{ duration:4.2, repeat:Infinity }}>
                {/* Candles */}
                {sel.decorations.includes("Candles") && (
                  <div style={{ display:"flex", gap:9, marginBottom:5 }}>
                    {["#FFD060",C.peach,C.lilac,"#A8D4F0",C.mint].slice(0, layerCount+1).map((cc,i)=>(
                      <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                        <div style={{ width:3, height:7, borderRadius:2, background:"rgba(255,222,60,0.95)", boxShadow:"0 0 8px 3px rgba(255,200,40,0.5)" }} />
                        <div style={{ width:5, height:12, borderRadius:3, background:cc }} />
                      </div>
                    ))}
                  </div>
                )}
                {/* Cake layers */}
                {layerElements}
                {/* Plate */}
                <div style={{ width:cakeW+30, height:10, background:"linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.18))", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.44)", borderRadius:"0 0 60px 60px", boxShadow:"0 6px 20px rgba(0,0,0,0.09)" }} />
              </motion.div>

              {/* Message ribbon */}
              {sel.message && (
                <motion.div layout style={{ marginTop:22, padding:"10px 22px", borderRadius:100, background:`${C.lilac}1E`, border:`1px solid ${C.lilac}55` }}>
                  <p style={{ fontFamily:serif, fontStyle:"italic", fontSize:"0.84rem", color:dark?C.lilac:C.lavender, textAlign:"center" }}>"{sel.message}"</p>
                </motion.div>
              )}

              {/* Tags */}
              <div style={{ display:"flex", gap:7, marginTop:16, flexWrap:"wrap", justifyContent:"center" }}>
                {[sel.shape, sel.weight==="Custom"?(sel.customWeight||"Custom"):sel.weight, sel.layers].map(l=>(
                  <span key={l} style={{ fontFamily:sans, fontSize:"0.59rem", fontWeight:600, color:dark?C.apricot:C.peach, background:`${C.peach}12`, padding:"3px 10px", borderRadius:100, letterSpacing:"0.08em" }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Order Summary + Price Breakdown */}
            <div style={{ borderRadius:20, background:dark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.78)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:`1px solid ${dark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.88)"}`, padding:"22px 24px", boxShadow:dark?"":"0 8px 32px rgba(0,0,0,0.05)" }}>
              <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.26em", marginBottom:16 }}>ORDER SUMMARY</p>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {([
                  ["Weight",   sel.weight==="Custom"?(sel.customWeight||"Custom"):sel.weight],
                  ["Shape",    sel.shape],
                  ["Layers",   sel.layers],
                  ["Flavour",  sel.flavor==="Custom Flavor"?(sel.customFlavor||"Custom"):sel.flavor],
                  ["Cream",    sel.cream],
                  ...(sel.message ? [["Message", `"${sel.message.slice(0,20)}${sel.message.length>20?"…":""}"`]] : []),
                  ...(sel.deliveryDate ? [["Delivery", `${sel.deliveryDate}`]] : []),
                ] as [string,string][]).map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:sans, fontSize:"0.71rem", color:dark?C.shortbread:C.hazelnut, opacity:0.68, flexShrink:0 }}>{k}</span>
                    <span style={{ fontFamily:sans, fontSize:"0.71rem", fontWeight:600, color:dark?C.crema:C.cocoa, textAlign:"right", marginLeft:8 }}>{v}</span>
                  </div>
                ))}
                {sel.decorations.length > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <span style={{ fontFamily:sans, fontSize:"0.71rem", color:dark?C.shortbread:C.hazelnut, opacity:0.68, flexShrink:0 }}>Decorations</span>
                    <span style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:600, color:dark?C.crema:C.cocoa, textAlign:"right", marginLeft:8, lineHeight:1.5 }}>{sel.decorations.join(", ")}</span>
                  </div>
                )}

                <div style={{ height:1, background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)", margin:"6px 0" }} />

                {/* Price breakdown */}
                {[
                  ["Base Price", fmtINR(basePrice)],
                  ...(premiumCharge > 0 ? [["Premium Charge", `+${fmtINR(premiumCharge)}`]] : []),
                  ...(decoAdd > 0      ? [["Decoration Cost", `+${fmtINR(decoAdd)}`]]       : []),
                  ["GST (5%)",          `+${fmtINR(tax)}`],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontFamily:sans, fontSize:"0.69rem", color:dark?C.shortbread:C.hazelnut, opacity:0.58 }}>{k}</span>
                    <span style={{ fontFamily:sans, fontSize:"0.69rem", color:dark?C.shortbread:C.hazelnut, opacity:0.72 }}>{v}</span>
                  </div>
                ))}

                <div style={{ height:1, background:dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)", margin:"6px 0" }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:700, color:dark?C.crema:C.cocoa }}>Grand Total</span>
                  <motion.span key={grandTotal} initial={{ scale:1.14 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:400, damping:20 }}
                    style={{ fontFamily:serif, fontSize:"1.36rem", fontWeight:700, color:dark?C.apricot:C.peach }}>{fmtINR(grandTotal)}</motion.span>
                </div>
              </div>

              {/* Save design */}
              <div style={{ marginTop:18 }}>
                {!savePrompt ? (
                  <button onClick={()=>setSavePrompt(true)}
                    style={{ width:"100%", padding:"10px 18px", borderRadius:100, background:"none", border:`1.5px solid ${dark?"rgba(255,255,255,0.12)":C.shortbread}`, fontFamily:sans, fontSize:"0.75rem", fontWeight:600, color:dark?C.shortbread:C.hazelnut, cursor:"pointer", transition:"border 0.2s" }}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor=dark?C.apricot:C.hazelnut)}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor=dark?"rgba(255,255,255,0.12)":C.shortbread)}>
                    Save Design
                  </button>
                ) : (
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={designName} onChange={e=>setDesignName(e.target.value)} placeholder="Design name…"
                      onKeyDown={e=>e.key==="Enter"&&handleSaveDesign()} autoFocus
                      style={{ flex:1, padding:"10px 14px", borderRadius:100, background:dark?"rgba(255,255,255,0.06)":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.12)":C.shortbread}`, fontFamily:sans, fontSize:"0.76rem", color:dark?C.crema:C.cocoa, outline:"none" }} />
                    <button onClick={handleSaveDesign} style={{ padding:"10px 16px", borderRadius:100, background:dark?C.apricot:C.hazelnut, color:dark?C.cocoa:C.crema, border:"none", fontFamily:sans, fontSize:"0.74rem", fontWeight:700, cursor:"pointer" }}>Save</button>
                    <button onClick={()=>setSavePrompt(false)} style={{ padding:"10px 14px", borderRadius:100, background:"none", border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, color:dark?C.shortbread:C.hazelnut, fontFamily:sans, fontSize:"0.74rem", cursor:"pointer" }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            <Btn variant="primary" dark={dark} onClick={handleOrder}><ShoppingCart size={15}/>Add to Cart — {fmtINR(grandTotal)}</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BEST SELLERS ─────────────────────────────────────────────────────────────
const sellerIds = ["p1","p11","p7","p9","p10","p6"];

function BestSellers({ dark, onProduct }: { dark:boolean; onProduct:(p:Product)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir:number) => ref.current?.scrollBy({ left:dir*300, behavior:"smooth" });
  const { products: allProducts } = useProductStore();
  const bySellerIds = sellerIds.map(id=>allProducts.find(p=>p.id===id)).filter(Boolean) as Product[];
  const sellers = bySellerIds.length ? bySellerIds : allProducts.filter(p=>p.isBestSeller);

  return (
    <section id="best-sellers" style={{ background:dark?"#221408":C.crema, padding:"112px 0" }}>
      <div className="max-w-[1440px] mx-auto px-6 mb-10">
        <SectionLabel dark={dark}>Best Sellers</SectionLabel>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700 }}>
            Everyone&apos;s <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>favorites</em>
          </h2>
          <div style={{ display:"flex", gap:8 }}>
            {[ChevronLeft,ChevronRight].map((Icon,i)=>(
              <motion.button key={i} whileHover={{ scale:1.1 }} whileTap={{ scale:0.92 }} onClick={()=>scroll(i===0?-1:1)}
                style={{ width:42, height:42, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:dark?"rgba(255,255,255,0.07)":C.oats, border:`1px solid ${dark?"rgba(255,255,255,0.1)":C.shortbread}`, cursor:"pointer", color:dark?C.crema:C.cocoa }}>
                <Icon size={17}/>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      <div ref={ref} className="scrollbar-hide"
        style={{ display:"flex", gap:18, overflowX:"auto", paddingLeft:"max(24px,calc((100vw - 1440px) / 2 + 24px))", paddingRight:24, paddingBottom:6 }}>
        {sellers.map((s,i)=>(
          <motion.div key={s.id}
            initial={{ opacity:0, x:30 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}
            transition={{ delay:i*0.07 }} whileHover={{ y:-8, boxShadow:`0 30px 64px rgba(0,0,0,${dark?0.42:0.14})` }}
            onClick={()=>onProduct(s)} style={{ flexShrink:0, width:252, borderRadius:24, overflow:"hidden", background:dark?"#3A2A1E":C.oats, border:`1px solid ${dark?"rgba(255,255,255,0.07)":C.shortbread}`, boxShadow:`0 4px 24px rgba(0,0,0,${dark?0.22:0.05})`, cursor:"pointer" }}>
            <div style={{ height:188, overflow:"hidden", position:"relative" }}>
              <motion.img src={img(s.imgId,320,240)} alt={s.name} className="w-full h-full object-cover" whileHover={{ scale:1.07 }} transition={{ duration:0.48 }} loading="lazy" />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(0,0,0,0.2) 0%,transparent 50%)" }} />
            </div>
            <div style={{ padding:"18px 20px 22px" }}>
              <div style={{ display:"flex", gap:2, marginBottom:8 }}>
                {Array.from({length:5}).map((_,j)=><Star key={j} size={10} fill={j<s.rating?C.apricot:"none"} color={j<s.rating?C.apricot:C.shortbread}/>)}
              </div>
              <h3 style={{ fontFamily:serif, fontSize:"0.95rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:10, lineHeight:1.32 }}>{s.name}</h3>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontFamily:serif, fontSize:"1.14rem", fontWeight:700, color:dark?C.apricot:C.peach }}>₹{s.price}</span>
                <motion.button whileHover={{ x:3 }} style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:600, color:dark?C.apricot:C.hazelnut, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                  View <ChevronRight size={12}/>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
        <div style={{ width:24, flexShrink:0 }} />
      </div>
    </section>
  );
}

// ─── BAKERY STORY ─────────────────────────────────────────────────────────────
const story = [
  { year:"2008", title:"A family kitchen",       desc:"It all began in a tiny kitchen with one KitchenAid mixer, a handful of cherished recipes, and an abundance of love." },
  { year:"2012", title:"Our first bakery",        desc:"The first Whisk & Wonder opened its wooden door on Rue des Fleurs — a cozy 400 sq ft of warm light and fresh pastry." },
  { year:"2016", title:"1,000 happy customers",   desc:"Word spread faster than frosting on a warm cake. Our regulars became family; our recipes became legend." },
  { year:"2019", title:"Award-winning recipes",   desc:"Three consecutive gold medals at the National Patisserie Championships confirmed what our customers already knew." },
  { year:"2024", title:"Luxury dessert boutique", desc:"Today, Whisk & Wonder is a destination — a place where every visit feels like stepping into a sweet, magical story." },
];

function BakeryStory({ dark }: { dark:boolean }) {
  return (
    <section id="our-story" style={{ background:dark?"#1C1008":C.oats, padding:"112px 24px" }}>
      <div style={{ maxWidth:880, margin:"0 auto" }}>
        <SectionLabel dark={dark}>Our Story</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"4rem" }}>
          Baked with <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>love</em> since 2008
        </h2>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:18, top:0, bottom:0, width:1.5, background:`linear-gradient(180deg,${C.peach},${C.lilac},${C.apricot})` }} />
          <div style={{ display:"flex", flexDirection:"column", gap:48 }}>
            {story.map((s,i)=>(
              <motion.div key={s.year}
                initial={{ opacity:0, x:i%2===0?-34:34 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true, margin:"-40px" }}
                transition={{ duration:0.65, ease:[0.16,1,0.3,1] }}
                style={{ position:"relative", display:"flex", justifyContent:i%2===0?"flex-start":"flex-end", paddingLeft:48 }}>
                <div style={{ position:"absolute", left:0, top:8, width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${i%2===0?C.peach:C.lilac},${i%2===0?C.apricot:C.lavender})`, border:`3px solid ${dark?"#1C1008":C.oats}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 0 4px ${i%2===0?`${C.peach}22`:`${C.lilac}22`}`, zIndex:1 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(255,255,255,0.7)" }} />
                </div>
                <div style={{ maxWidth:"calc(50% - 36px)", width:"100%", background:dark?"rgba(58,42,30,0.82)":"rgba(250,246,240,0.92)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", borderRadius:20, padding:"26px 30px", border:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(224,206,180,0.55)"}`, boxShadow:`0 8px 32px rgba(0,0,0,${dark?0.22:0.06})` }}>
                  <span style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.18em" }}>{s.year}</span>
                  <h3 style={{ fontFamily:serif, fontSize:"1.2rem", fontWeight:700, color:dark?C.crema:C.cocoa, margin:"8px 0 12px", lineHeight:1.32 }}>{s.title}</h3>
                  <p style={{ fontFamily:sans, fontSize:"0.81rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.82, opacity:0.84 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
const reviews = [
  { name:"Sophie Laurent",  handle:"@sophi_l",   text:"I ordered a custom birthday cake and it was beyond anything I imagined. The flavors were incredible — like eating a cloud of happiness.", initials:"SL", bg:C.lilac,      helpful:142 },
  { name:"Marcus Chen",     handle:"@m_chen",     text:"The croissants changed my life. I drive 40 minutes every Saturday morning just for a bag of them. Worth every mile.", initials:"MC", bg:C.mint,       helpful:89  },
  { name:"Isabella Rossi",  handle:"@bella.r",    text:"Whisk & Wonder is pure magic. The macaron box I gifted my mum made her cry happy tears. That says everything.", initials:"IR", bg:C.apricot,    helpful:214 },
  { name:"James Park",      handle:"@jpark_eats", text:"Never knew a bakery could feel like a sanctuary. The ambiance, the smell, the service — it all feels like a warm hug.", initials:"JP", bg:C.shortbread, helpful:67  },
];

function ReviewsSection({ dark }: { dark:boolean }) {
  const [helpfuls, setHelpfuls] = useState<Record<number,boolean>>({});
  const [counts,   setCounts]   = useState<Record<number,number>>({});
  const toggle = (i:number, base:number) => {
    const isOn = helpfuls[i]??false;
    setHelpfuls(h=>({...h,[i]:!isOn}));
    setCounts(c=>({...c,[i]:(c[i]??base)+(isOn?-1:1)}));
  };
  return (
    <section style={{ background:dark?"#221408":C.crema, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Reviews</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"3.5rem" }}>
          Stories from our <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>community</em>
        </h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:24 }}>
          {reviews.map((r,i)=>(
            <motion.div key={r.name}
              initial={{ opacity:0, y:32 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.1, duration:0.58 }} whileHover={{ y:-8 }}
              style={{ background:dark?"rgba(58,42,30,0.72)":"rgba(250,246,240,0.95)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:24, padding:"32px 28px", border:`1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(224,206,180,0.5)"}`, boxShadow:`0 8px 32px rgba(0,0,0,${dark?0.22:0.06})`, position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${r.bg},${r.bg}88)`, borderRadius:"24px 24px 0 0" }} />
              <div style={{ fontFamily:serif, fontSize:"5rem", color:r.bg, opacity:0.22, lineHeight:1, marginBottom:-14, marginTop:-8, userSelect:"none" }}>"</div>
              <div style={{ display:"flex", gap:2, marginBottom:14 }}>
                {Array.from({length:5}).map((_,j)=><Star key={j} size={11} fill={C.apricot} color={C.apricot}/>)}
              </div>
              <p style={{ fontFamily:sans, fontSize:"0.84rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.88, marginBottom:20, fontStyle:"italic" }}>{r.text}</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${r.bg},${r.bg}99)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:sans, fontSize:"0.68rem", fontWeight:700, color:r.bg===C.shortbread?C.cocoa:"#fff", letterSpacing:"0.05em" }}>{r.initials}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily:sans, fontSize:"0.82rem", fontWeight:600, color:dark?C.crema:C.cocoa }}>{r.name}</p>
                    <p style={{ fontFamily:sans, fontSize:"0.68rem", color:dark?C.shortbread:C.hazelnut, opacity:0.58 }}>{r.handle}</p>
                  </div>
                </div>
                <motion.button onClick={()=>toggle(i,r.helpful)} whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:100, background:helpfuls[i]?`${C.mint}22`:"transparent", border:`1px solid ${helpfuls[i]?C.mint:dark?"rgba(255,255,255,0.1)":C.shortbread}`, cursor:"pointer", transition:"all 0.22s" }}>
                  <ThumbsUp size={12} color={helpfuls[i]?C.mint:dark?C.shortbread:C.hazelnut}/>
                  <span style={{ fontFamily:sans, fontSize:"0.64rem", fontWeight:600, color:helpfuls[i]?C.mint:dark?C.shortbread:C.hazelnut }}>{counts[i]??r.helpful}</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── GALLERY ──────────────────────────────────────────────────────────────────
const galleryItems = [
  { imgId:"1602663491496-73f07481dbea", caption:"Strawberry Dream Cake",     h:280 },
  { imgId:"1634118520179-0c78b72df69a", caption:"Pastel Macaron Collection", h:218 },
  { imgId:"1555507036-ab1f4038808a",   caption:"Butter Croissants",          h:258 },
  { imgId:"1514517521153-1be72277b32f", caption:"Glazed Donut Tower",        h:218 },
  { imgId:"1519665541-b13188b28be9",   caption:"Macaron Stacks",             h:298 },
  { imgId:"1599785209796-786432b228bc", caption:"Rose Cupcake",              h:240 },
  { imgId:"1527904324834-3bda86da6771", caption:"Donut Selection",           h:258 },
  { imgId:"1535141192574-5d4897c12636", caption:"Celebration Cake",          h:218 },
  { imgId:"1623334044303-241021148842", caption:"Morning Pastries",          h:258 },
];

function GallerySection({ dark }: { dark:boolean }) {
  return (
    <section id="gallery" style={{ background:dark?"#1C1008":C.oats, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Gallery</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"3.5rem" }}>
          Beauty in every <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>bite</em>
        </h2>
        <div className="columns-2 md:columns-3" style={{ columnGap:16 }}>
          {galleryItems.map((g,i)=>(
            <motion.div key={i} className="break-inside-avoid group relative overflow-hidden cursor-pointer"
              initial={{ opacity:0, scale:0.96 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }}
              transition={{ delay:i*0.05, duration:0.52 }}
              style={{ borderRadius:20, marginBottom:16, height:g.h, overflow:"hidden" }}>
              <motion.img src={img(g.imgId,420,g.h)} alt={g.caption} className="w-full h-full object-cover" whileHover={{ scale:1.08 }} transition={{ duration:0.5 }} loading="lazy" />
              <motion.div initial={{ opacity:0 }} whileHover={{ opacity:1 }} transition={{ duration:0.26 }}
                style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(74,55,40,0.72) 0%,rgba(74,55,40,0.18) 50%,transparent 100%)", display:"flex", alignItems:"flex-end", padding:"18px 20px", backdropFilter:"blur(2px)" }}>
                <p style={{ fontFamily:sans, fontSize:"0.77rem", fontWeight:600, color:C.crema, letterSpacing:"0.04em" }}>{g.caption}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LOYALTY ──────────────────────────────────────────────────────────────────
function LoyaltySection({ dark, onAuth }: { dark:boolean; onAuth:()=>void }) {
  const rotateY = useMotionValue(0); const rotateX = useMotionValue(0);
  const springRY = useSpring(rotateY,{ stiffness:180, damping:28 });
  const springRX = useSpring(rotateX,{ stiffness:180, damping:28 });
  const { user } = useAuth();
  return (
    <section style={{ background:dark?"#221408":C.crema, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-16 items-center">
        <div style={{ perspective:1000, flexShrink:0 }}>
          <motion.div
            style={{ rotateY:springRY, rotateX:springRX, width:360, height:220, borderRadius:24, background:`linear-gradient(135deg,${C.hazelnut} 0%,${C.cocoa} 55%,#2A1008 100%)`, padding:"28px 30px", color:C.crema, boxShadow:"0 30px 80px rgba(0,0,0,0.48)", position:"relative", overflow:"hidden" }}
            onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();rotateY.set(((e.clientX-r.left)/r.width-0.5)*18);rotateX.set(-((e.clientY-r.top)/r.height-0.5)*12);}}
            onMouseLeave={()=>{rotateY.set(0);rotateX.set(0);}}>
            <div style={{ position:"absolute", top:-55, right:-55, width:190, height:190, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
            <div style={{ position:"absolute", bottom:-40, left:-40, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
            <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
              <div>
                <p style={{ fontFamily:sans, fontSize:"0.53rem", letterSpacing:"0.3em", opacity:0.52, fontWeight:600 }}>WHISK & WONDER</p>
                <p style={{ fontFamily:serif, fontSize:"1.06rem", fontWeight:700, marginTop:6 }}>Sweet Rewards Card</p>
              </div>
              <LogoMark size={26} color={C.apricot} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
              <div>
                <p style={{ fontFamily:sans, fontSize:"0.53rem", letterSpacing:"0.14em", opacity:0.48, fontWeight:500 }}>MEMBER SINCE</p>
                <p style={{ fontFamily:serif, fontSize:"0.86rem", marginTop:5 }}>{user?.memberSince??"March 2024"}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontFamily:sans, fontSize:"0.53rem", letterSpacing:"0.14em", opacity:0.48, fontWeight:500 }}>DESSERT POINTS</p>
                <p style={{ fontFamily:serif, fontSize:"1.55rem", fontWeight:700, color:C.apricot, marginTop:3 }}>{(user?.points??2480).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>
        <div>
          <SectionLabel dark={dark}>Loyalty Program</SectionLabel>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(1.8rem,3.5vw,2.8rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"1rem" }}>
            Earn <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>sweet</em> rewards
          </h2>
          <p style={{ fontFamily:sans, fontSize:"0.9rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.88, maxWidth:480, marginBottom:"2.5rem", opacity:0.82 }}>
            Join our loyalty program and earn Dessert Points on every purchase. Redeem them for free treats, exclusive discounts, and early access to seasonal specials.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:32 }}>
            {([["Earn Points",<ShoppingBag size={18}/>,"₹1 spent = 1 point"],["Redeem Gifts",<Gift size={18}/>,"100 pts = ₹50 off"],["Exclusive Perks",<Star size={18}/>,"Birthday bonus cake"]] as const).map(([title,icon,desc])=>(
              <div key={String(title)} style={{ padding:"20px 14px", borderRadius:18, background:dark?"rgba(255,255,255,0.05)":C.oats, border:`1px solid ${dark?"rgba(255,255,255,0.08)":C.shortbread}`, textAlign:"center" }}>
                <div style={{ color:dark?C.apricot:C.peach, display:"flex", justifyContent:"center", marginBottom:10 }}>{icon}</div>
                <p style={{ fontFamily:sans, fontSize:"0.74rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:5 }}>{String(title)}</p>
                <p style={{ fontFamily:sans, fontSize:"0.64rem", color:dark?C.shortbread:C.hazelnut, opacity:0.68, lineHeight:1.55 }}>{String(desc)}</p>
              </div>
            ))}
          </div>
          <Btn variant="primary" dark={dark} onClick={onAuth}><Gift size={15}/>Join Sweet Rewards</Btn>
        </div>
      </div>
    </section>
  );
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────
function ContactSection({ dark }: { dark:boolean }) {
  const [form, setForm]       = useState({ name:"", email:"", subject:"", message:"" });
  const [sent, setSent]       = useState(false);
  const [submitting, setSub]  = useState(false);
  const { toast }             = useToast();
  const border                = dark?"rgba(255,255,255,0.09)":C.shortbread;
  const fieldBg               = dark?"rgba(255,255,255,0.06)":C.crema;
  const textColor             = dark?C.crema:C.cocoa;
  const sub                   = dark?C.shortbread:C.hazelnut;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.message) { toast("Please fill in all required fields","error"); return; }
    if (!form.email.includes("@")) { toast("Please enter a valid email address","error"); return; }
    setSub(true);
    try {
      await fetch("/api/contact", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });
      setSent(true);
      toast("Message sent! We'll be in touch within 24 hours 🥐","success");
    } catch {
      toast("Something went wrong. Please try again.","error");
    } finally {
      setSub(false);
    }
  };

  const inputStyle = (active=false) => ({
    width:"100%", padding:"12px 14px 12px 42px", borderRadius:12, background:fieldBg,
    border:`1px solid ${active?C.hazelnut:border}`, fontFamily:sans, fontSize:"0.86rem",
    color:textColor, outline:"none", boxSizing:"border-box" as const, transition:"border 0.2s",
  });

  return (
    <section id="contact" style={{ background:dark?"#1C1008":C.oats, padding:"112px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <div style={{ display:"flex", gap:80, alignItems:"flex-start", flexWrap:"wrap" }}>
          {/* Info */}
          <div style={{ flex:"1 1 300px" }}>
            <SectionLabel dark={dark}>Contact</SectionLabel>
            <h2 style={{ fontFamily:serif, fontSize:"clamp(2rem,4vw,3rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"1rem" }}>
              Say <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>hello</em>
            </h2>
            <p style={{ fontFamily:sans, fontSize:"0.9rem", color:sub, lineHeight:1.88, marginBottom:"3rem", opacity:0.82, maxWidth:360 }}>
              Have a question about our pastries, a custom cake order, or just want to share some love? We'd be delighted to hear from you.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
              {[
                [<MapPin size={18}/>, "Visit us", "12 MG Road, Bibwewadi, Pune – 411037"],
                [<Coffee size={18}/>, "Opening hours", "Tue–Sun: 8am – 8pm"],
                [<Mail size={18}/>, "Email us", "hello@whiskandwonder.com"],
                [<Phone size={18}/>, "Call us", "+91 98765 43210"],
              ].map(([icon,label,value])=>(
                <div key={String(label)} style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:dark?"rgba(255,188,138,0.12)":C.crema, border:`1px solid ${dark?"rgba(255,188,138,0.22)":C.shortbread}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.peach, flexShrink:0 }}>{icon}</div>
                  <div>
                    <p style={{ fontFamily:sans, fontSize:"0.63rem", fontWeight:700, color:C.peach, letterSpacing:"0.22em", marginBottom:3 }}>{String(label).toUpperCase()}</p>
                    <p style={{ fontFamily:sans, fontSize:"0.84rem", color:sub, lineHeight:1.6 }}>{String(value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ flex:"1 1 360px" }}>
            {sent ? (
              <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
                style={{ padding:"48px 40px", borderRadius:28, background:dark?"rgba(255,255,255,0.04)":C.crema, border:`1px solid ${border}`, textAlign:"center" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:`${C.mint}18`, border:`1px solid ${C.mint}44`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                  <Check size={28} color={C.mint}/>
                </div>
                <h3 style={{ fontFamily:serif, fontSize:"1.4rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:10 }}>Message Sent!</h3>
                <p style={{ fontFamily:sans, fontSize:"0.84rem", color:sub, lineHeight:1.7, marginBottom:28 }}>Thank you for reaching out, {form.name}. We'll get back to you within 24 hours.</p>
                <button onClick={()=>{setSent(false);setForm({name:"",email:"",subject:"",message:""});}} style={{ fontFamily:sans, fontSize:"0.78rem", fontWeight:600, color:C.hazelnut, background:"none", border:`1px solid ${C.hazelnut}44`, borderRadius:100, padding:"10px 28px", cursor:"pointer" }}>
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}
                style={{ padding:"40px", borderRadius:28, background:dark?"rgba(255,255,255,0.04)":C.crema, border:`1px solid ${border}`, boxShadow:`0 8px 32px rgba(0,0,0,${dark?0.22:0.06})` }}>
                <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:C.peach, letterSpacing:"0.26em", marginBottom:24 }}>SEND A MESSAGE</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                  {[["Name","name","Your name",<User size={13}/>],["Email","email","your@email.com",<Mail size={13}/>]].map(([label,field,placeholder,icon])=>(
                    <div key={String(field)}>
                      <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>{String(label).toUpperCase()}</label>
                      <div style={{ position:"relative" }}>
                        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:sub, opacity:0.45, display:"flex" }}>{icon}</span>
                        <input type={String(field)==="email"?"email":"text"} value={form[String(field) as keyof typeof form]}
                          onChange={e=>setForm(f=>({...f,[String(field)]:e.target.value}))}
                          placeholder={String(placeholder)} style={inputStyle()}
                          onFocus={e=>e.currentTarget.style.borderColor=C.hazelnut}
                          onBlur={e=>e.currentTarget.style.borderColor=border} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>SUBJECT</label>
                  <div style={{ position:"relative" }}>
                    <MessageSquare size={13} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:sub, opacity:0.45 }} />
                    <input type="text" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}
                      placeholder="Custom cake order, event catering…" style={inputStyle()}
                      onFocus={e=>e.currentTarget.style.borderColor=C.hazelnut}
                      onBlur={e=>e.currentTarget.style.borderColor=border} />
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>MESSAGE *</label>
                  <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                    placeholder="Tell us how we can help…" rows={5}
                    style={{ width:"100%", padding:"12px 14px", borderRadius:12, background:fieldBg, border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.86rem", color:textColor, outline:"none", resize:"vertical", boxSizing:"border-box", transition:"border 0.2s", lineHeight:1.7 }}
                    onFocus={e=>e.currentTarget.style.borderColor=C.hazelnut}
                    onBlur={e=>e.currentTarget.style.borderColor=border} />
                </div>
                <motion.button type="submit" disabled={submitting}
                  whileHover={{ scale:1.02, y:-2 }} whileTap={{ scale:0.98 }}
                  style={{ width:"100%", padding:"14px", borderRadius:100, background:`linear-gradient(135deg,${C.hazelnut},${C.cocoa})`, color:C.crema, border:"none", cursor:"pointer", fontFamily:sans, fontWeight:700, fontSize:"0.86rem", letterSpacing:"0.06em", boxShadow:"0 8px 28px rgba(122,92,58,0.32)", opacity:submitting?0.7:1, transition:"opacity 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {submitting?"Sending…":"Send Message"}
                </motion.button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
function NewsletterSection({ dark }: { dark:boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const { toast }         = useToast();
  return (
    <section style={{ background:dark?"#221408":C.crema, padding:"112px 24px", position:"relative", overflow:"hidden" }}>
      <div className="absolute pointer-events-none" style={{ left:"-6%", top:"18%", width:320, height:320, borderRadius:"50%", background:C.lilac, opacity:0.055, filter:"blur(88px)" }} />
      <div className="absolute pointer-events-none" style={{ right:"-6%", bottom:"16%", width:270, height:270, borderRadius:"50%", background:C.apricot, opacity:0.065, filter:"blur(76px)" }} />
      <div style={{ maxWidth:640, margin:"0 auto", textAlign:"center", position:"relative" }}>
        <SectionLabel dark={dark}>Newsletter</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2rem,4vw,3rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"1rem" }}>
          Fresh news, delivered <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>daily</em>
        </h2>
        <p style={{ fontFamily:sans, fontSize:"0.9rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.82, marginBottom:"2.8rem", opacity:0.78 }}>
          Subscribe for seasonal menus, exclusive recipes, and first access to our limited edition collections.
        </p>
        {sent ? (
          <motion.div initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }}
            style={{ padding:"20px 32px", borderRadius:100, background:`${C.mint}22`, border:`1px solid ${C.mint}55`, display:"inline-flex", alignItems:"center", gap:10 }}>
            <Check size={16} color={C.mint}/>
            <span style={{ fontFamily:sans, fontWeight:600, color:dark?C.mint:"#1A4A34", fontSize:"0.88rem" }}>You're on the list — welcome!</span>
          </motion.div>
        ) : (
          <form onSubmit={async e=>{e.preventDefault();if(!email)return;try{await fetch("/api/newsletter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});setSent(true);toast("Subscribed! Welcome to the family 🥐","success");}catch{setSent(true);toast("Subscribed! Welcome to the family 🥐","success");}}}
            style={{ display:"flex", gap:12, maxWidth:460, margin:"0 auto" }}>
            <div style={{ flex:1, position:"relative" }}>
              <Mail size={15} style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-50%)", color:dark?C.shortbread:C.hazelnut, opacity:0.42 }} />
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ width:"100%", padding:"14px 18px 14px 44px", borderRadius:100, background:dark?"rgba(255,255,255,0.07)":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.12)":C.shortbread}`, fontFamily:sans, fontSize:"0.86rem", color:dark?C.crema:C.cocoa, outline:"none", boxSizing:"border-box" }} />
            </div>
            <Btn variant="primary" dark={dark}>Subscribe</Btn>
          </form>
        )}
        <p style={{ fontFamily:sans, fontSize:"0.66rem", color:dark?C.shortbread:C.hazelnut, marginTop:16, opacity:0.52, letterSpacing:"0.04em" }}>No spam, ever. Unsubscribe in one click.</p>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ dark }: { dark:boolean }) {
  return (
    <footer style={{ background:dark?"linear-gradient(180deg,#1A1008 0%,#100804 100%)":"linear-gradient(180deg,#281A0E 0%,#180C04 100%)", padding:"84px 24px 44px", color:C.crema, position:"relative", overflow:"hidden" }}>
      <div className="pointer-events-none" style={{ position:"absolute", top:0, left:"21%", width:1, height:"58%", background:"linear-gradient(180deg,rgba(255,175,75,0.14) 0%,transparent 100%)", transform:"rotate(7deg)" }} />
      <div className="pointer-events-none" style={{ position:"absolute", top:0, left:"29%", width:1, height:"44%", background:"linear-gradient(180deg,rgba(255,175,75,0.09) 0%,transparent 100%)", transform:"rotate(3deg)" }} />
      <div className="pointer-events-none" style={{ position:"absolute", top:0, right:"24%", width:1, height:"50%", background:"linear-gradient(180deg,rgba(255,160,55,0.11) 0%,transparent 100%)", transform:"rotate(-5deg)" }} />
      <div style={{ maxWidth:1440, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:48, marginBottom:64 }}>
          <div style={{ gridColumn:"span 2" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <LogoMark size={24} color={C.apricot}/>
              <h3 style={{ fontFamily:serif, fontSize:"1.35rem", fontWeight:700, color:C.apricot }}>Whisk & Wonder</h3>
            </div>
            <p style={{ fontFamily:sans, fontSize:"0.82rem", color:C.shortbread, lineHeight:1.88, opacity:0.62, maxWidth:300 }}>
              A magical place where every pastry is a love letter, every cake a celebration, and every visit an unforgettable memory.
            </p>
          </div>
          <div>
            <h4 style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.apricot, letterSpacing:"0.3em", marginBottom:26 }}>QUICK LINKS</h4>
            {["Menu","Custom Cakes","Best Sellers","Our Story","Gallery","Contact"].map(l=>(
              <div key={l} style={{ marginBottom:14 }}>
                <a href="#" style={{ fontFamily:sans, fontSize:"0.82rem", color:C.shortbread, opacity:0.6, textDecoration:"none", transition:"opacity 0.2s,color 0.2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color=C.apricot;}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="0.6";e.currentTarget.style.color=C.shortbread;}}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.apricot, letterSpacing:"0.3em", marginBottom:26 }}>FIND US</h4>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <MapPin size={13} style={{ color:C.peach, marginTop:3, flexShrink:0 }}/>
                <p style={{ fontFamily:sans, fontSize:"0.8rem", color:C.shortbread, opacity:0.66, lineHeight:1.68 }}>12 MG Road, Bibwewadi<br/>Pune – 411037</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Coffee size={13} style={{ color:C.peach, flexShrink:0 }}/>
                <p style={{ fontFamily:sans, fontSize:"0.8rem", color:C.shortbread, opacity:0.66 }}>Tue–Sun: 8am – 8pm</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <Mail size={13} style={{ color:C.peach, flexShrink:0 }}/>
                <p style={{ fontFamily:sans, fontSize:"0.8rem", color:C.shortbread, opacity:0.66 }}>hello@whiskandwonder.com</p>
              </div>
            </div>
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:28, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <p style={{ fontFamily:sans, fontSize:"0.7rem", color:C.shortbread, opacity:0.36, letterSpacing:"0.04em" }}>© 2026 Whisk & Wonder, Pune. Made with love and a little magic.</p>
          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
            {[0,1,2].map(i=><motion.div key={i} style={{ width:4, height:4, borderRadius:"50%", background:C.lavender }} animate={{ opacity:[0.18,0.72,0.18] }} transition={{ duration:2.2, repeat:Infinity, delay:i*0.42 }}/>)}
          </div>
          <p style={{ fontFamily:sans, fontSize:"0.7rem", color:C.shortbread, opacity:0.36 }}>Privacy · Terms · Sitemap</p>
        </div>
      </div>
    </footer>
  );
}

// ─── TODAY'S SPECIAL ──────────────────────────────────────────────────────────
function TodaysSpecialSection({ dark, onProduct }: { dark:boolean; onProduct:(p:Product)=>void }) {
  const { products } = useProductStore();
  const special = products.find(p => p.isFeatured && p.availability !== "Out of Stock") ?? products[0];
  if (!special) return null;
  return (
    <section style={{ position:"relative", background:"#1A0F08", overflow:"hidden", minHeight:"68vh", display:"flex", alignItems:"center" }}>
      <div style={{ position:"absolute", inset:0 }}>
        <img src={`https://images.unsplash.com/photo-${special.imgId}?w=1800&h=900&fit=crop&auto=format&q=88`}
          alt={special.name} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 40%" }} loading="lazy" />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg, rgba(14,6,2,0.88) 0%, rgba(14,6,2,0.55) 46%, rgba(14,6,2,0.22) 80%, rgba(14,6,2,0.1) 100%)" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(0deg, rgba(14,6,2,0.46) 0%, transparent 40%)" }} />
      </div>
      <div style={{ position:"relative", zIndex:1, maxWidth:1440, margin:"0 auto", padding:"80px 48px", width:"100%" }}>
        <motion.div initial={{ opacity:0, x:-36 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.7, ease:[0.16,1,0.3,1] }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 18px", borderRadius:100, background:`${C.peach}22`, border:`1px solid ${C.peach}44`, marginBottom:28 }}>
            <motion.div animate={{ opacity:[1,0.4,1] }} transition={{ duration:1.8, repeat:Infinity }}
              style={{ width:7, height:7, borderRadius:"50%", background:C.peach, boxShadow:`0 0 12px ${C.peach}` }} />
            <span style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:C.peach, letterSpacing:"0.3em" }}>TODAY'S SPECIAL</span>
          </div>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(2.4rem,5.2vw,4.4rem)", color:C.crema, fontWeight:700, lineHeight:1.14, maxWidth:620, marginBottom:18, textShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
            {special.name}
          </h2>
          <p style={{ fontFamily:sans, fontSize:"0.97rem", color:C.shortbread, lineHeight:1.8, maxWidth:480, opacity:0.85, marginBottom:36 }}>
            {special.desc}
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:40, flexWrap:"wrap" }}>
            <span style={{ fontFamily:serif, fontSize:"2.6rem", fontWeight:700, color:C.apricot }}>₹{special.price.toLocaleString("en-IN")}</span>
            {special.originalPrice && <span style={{ fontFamily:sans, fontSize:"0.9rem", color:C.shortbread, opacity:0.45, textDecoration:"line-through" }}>₹{special.originalPrice.toLocaleString("en-IN")}</span>}
            {special.discount && (
              <span style={{ fontFamily:sans, fontSize:"0.72rem", fontWeight:700, background:`${C.mint}20`, color:C.mint, border:`1px solid ${C.mint}44`, borderRadius:100, padding:"5px 14px" }}>
                {special.discount}% OFF TODAY
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
            <motion.button whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }} onClick={() => onProduct(special)}
              style={{ padding:"15px 44px", background:`linear-gradient(135deg,${C.apricot},${C.peach})`, color:C.cocoa, border:"none", borderRadius:100, fontFamily:sans, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", boxShadow:`0 14px 40px rgba(244,149,106,0.38)`, letterSpacing:"0.04em", display:"flex", alignItems:"center", gap:10 }}>
              <ShoppingBag size={17}/>Order Now
            </motion.button>
            <motion.button whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:0.97 }} onClick={()=>document.getElementById("menu")?.scrollIntoView({behavior:"smooth"})}
              style={{ padding:"15px 38px", background:"rgba(255,255,255,0.08)", color:C.crema, border:"1.5px solid rgba(255,255,255,0.26)", borderRadius:100, fontFamily:sans, fontWeight:600, fontSize:"0.9rem", cursor:"pointer", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", letterSpacing:"0.04em" }}>
              View Full Menu
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FRESHLY BAKED TODAY TICKER ────────────────────────────────────────────────
function FreshlyBakedTodaySection({ dark }: { dark:boolean }) {
  const items = ["Butter Croissants","Chocolate Ganache Cake","Blueberry Cheesecake","Assorted Macarons","Cinnamon Rolls","Almond Tart","Red Velvet Cupcakes","Sourdough Bread","Mango Mousse Cake","Oreo Cheesecake","Hazelnut Praline Cake","Vegan Banana Bread"];
  const doubled = [...items, ...items];
  const bg = dark ? "#1E0E06" : "#2A1A0E";
  return (
    <section style={{ background:bg, padding:"18px 0", overflow:"hidden", position:"relative", borderTop:"1px solid rgba(255,188,138,0.1)", borderBottom:"1px solid rgba(255,188,138,0.1)" }}>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(42,26,14,1) 0%,transparent 10%,transparent 90%,rgba(42,26,14,1) 100%)", zIndex:1, pointerEvents:"none" }} />
      <motion.div
        animate={{ x:["0%","-50%"] }}
        transition={{ duration:38, repeat:Infinity, ease:"linear" }}
        style={{ display:"flex", whiteSpace:"nowrap", willChange:"transform" }}>
        {doubled.map((item,i) => (
          <span key={i} style={{ padding:"0 32px", fontFamily:sans, fontSize:"0.76rem", fontWeight:600, color:C.apricot, letterSpacing:"0.06em", opacity:0.88, flexShrink:0 }}>
            {item}
            <span style={{ margin:"0 0 0 32px", color:C.peach, opacity:0.35 }}>·</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}

// ─── WHY CHOOSE US ────────────────────────────────────────────────────────────
function WhyChooseUsSection({ dark }: { dark:boolean }) {
  const features: { Icon: React.ElementType; title:string; desc:string }[] = [
    { Icon: Sparkles, title:"100% Fresh Daily",        desc:"Every item is baked fresh each morning. Nothing from yesterday, ever." },
    { Icon: Award,    title:"Premium Ingredients",      desc:"Belgian chocolate, farm-fresh dairy, real butter. Zero artificial preservatives." },
    { Icon: Truck,    title:"Fast Pune Delivery",       desc:"Doorstep delivery across all of Pune — most orders in under 60 minutes." },
    { Icon: Gift,     title:"Custom Dream Cakes",       desc:"Fully personalised cakes crafted exactly the way you picture them." },
    { Icon: Users,    title:"12,000+ Happy Customers",  desc:"Trusted by families across Pune since we first opened our doors in 2008." },
    { Icon: Leaf,     title:"Eggless & Vegan Options",  desc:"Our full menu includes beautiful eggless and vegan creations — same quality, same love." },
  ];
  return (
    <section style={{ background:dark?"#1A1008":C.oats, padding:"100px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <div style={{ textAlign:"center", marginBottom:68 }}>
          <SectionLabel dark={dark}>Why Choose Us</SectionLabel>
          <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700 }}>
            Baked with <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>love</em>, delivered with care
          </h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(290px,100%),1fr))", gap:22 }}>
          {features.map((f,i) => (
            <motion.div key={f.title}
              initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.08, duration:0.55 }}
              whileHover={{ y:-7, boxShadow:`0 28px 64px rgba(0,0,0,${dark?0.38:0.10})` }}
              style={{ padding:"34px 28px", borderRadius:24, background:dark?"rgba(255,255,255,0.04)":C.crema, border:`1px solid ${dark?"rgba(255,255,255,0.07)":C.shortbread}`, cursor:"default", transition:"box-shadow 0.28s ease, transform 0.28s ease" }}>
              <div style={{ marginBottom:18, display:"flex" }}><f.Icon size={28} color={dark?C.apricot:C.peach}/></div>
              <h3 style={{ fontFamily:serif, fontSize:"1.06rem", fontWeight:700, color:dark?C.crema:C.cocoa, marginBottom:10 }}>{f.title}</h3>
              <p style={{ fontFamily:sans, fontSize:"0.82rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.82, opacity:0.8 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── DELIVERY INFO ────────────────────────────────────────────────────────────
function DeliveryInfoSection({ dark }: { dark:boolean }) {
  const infos: { Icon: React.ElementType; title:string; value:string }[] = [
    { Icon: Clock,       title:"Delivery Hours",  value:"8:00 AM – 10:00 PM, Tue – Sun" },
    { Icon: CheckCircle, title:"Free Delivery",   value:"On all orders above ₹500" },
    { Icon: Zap,         title:"Same-Day",        value:"Order before 6 PM for same-day delivery" },
    { Icon: Package,     title:"Custom Cakes",    value:"48 hrs advance notice required" },
  ];
  const zones = [
    { name:"Bibwewadi & Sinhagad Road", fee:"Free",  time:"30–45 min" },
    { name:"Kothrud & Warje",           fee:"₹30",   time:"40–55 min" },
    { name:"Shivajinagar & FC Road",    fee:"₹40",   time:"45–60 min" },
    { name:"Baner, Balewadi & Wakad",   fee:"₹60",   time:"50–70 min" },
    { name:"Hadapsar & Koregaon Park",  fee:"₹50",   time:"45–65 min" },
    { name:"Viman Nagar & Kalyani Nagar",fee:"₹50",  time:"50–70 min" },
  ];
  return (
    <section id="delivery" style={{ background:dark?"#221408":C.crema, padding:"100px 24px" }}>
      <div className="max-w-[1440px] mx-auto">
        <SectionLabel dark={dark}>Delivery</SectionLabel>
        <h2 style={{ fontFamily:serif, fontSize:"clamp(2.2rem,4vw,3.2rem)", color:dark?C.crema:C.cocoa, fontWeight:700, marginBottom:"0.9rem" }}>
          We deliver across <em style={{ fontStyle:"italic", color:dark?C.apricot:C.peach }}>Pune</em>
        </h2>
        <p style={{ fontFamily:sans, fontSize:"0.9rem", color:dark?C.shortbread:C.hazelnut, lineHeight:1.82, marginBottom:56, opacity:0.78, maxWidth:520 }}>
          Fresh from our kitchen in Bibwewadi to your doorstep — fast, reliable, and handled with care.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(240px,100%),1fr))", gap:16, marginBottom:52 }}>
          {infos.map((info,i) => (
            <motion.div key={info.title}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.07 }}
              style={{ padding:"26px 26px", borderRadius:20, background:dark?"rgba(255,255,255,0.05)":C.oats, border:`1px solid ${dark?"rgba(255,255,255,0.08)":C.shortbread}` }}>
              <div style={{ marginBottom:12, display:"flex" }}><info.Icon size={22} color={dark?C.apricot:C.peach}/></div>
              <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.22em", marginBottom:7 }}>{info.title.toUpperCase()}</p>
              <p style={{ fontFamily:sans, fontSize:"0.86rem", color:dark?C.crema:C.cocoa, fontWeight:600, lineHeight:1.55 }}>{info.value}</p>
            </motion.div>
          ))}
        </div>
        <h3 style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:dark?C.apricot:C.peach, letterSpacing:"0.26em", marginBottom:22 }}>DELIVERY ZONES</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))", gap:11 }}>
          {zones.map((z,i) => (
            <motion.div key={z.name}
              initial={{ opacity:0, x:-16 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }}
              transition={{ delay:i*0.06 }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderRadius:14, background:dark?"rgba(255,255,255,0.04)":C.oats, border:`1px solid ${dark?"rgba(255,255,255,0.07)":C.shortbread}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <MapPin size={13} color={C.peach} />
                <span style={{ fontFamily:sans, fontSize:"0.82rem", color:dark?C.crema:C.cocoa }}>{z.name}</span>
              </div>
              <div style={{ display:"flex", gap:14, alignItems:"center", flexShrink:0 }}>
                <span style={{ fontFamily:sans, fontSize:"0.74rem", fontWeight:700, color:z.fee==="Free"?C.mint:dark?C.apricot:C.peach }}>{z.fee}</span>
                <span style={{ fontFamily:sans, fontSize:"0.7rem", color:dark?C.shortbread:C.hazelnut, opacity:0.58 }}>{z.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── WISHLIST DRAWER ──────────────────────────────────────────────────────────
function WishlistDrawer({ open, onClose, dark, onProduct }: { open:boolean; onClose:()=>void; dark:boolean; onProduct:(p:Product)=>void }) {
  const { ids, toggle }  = useWishlist();
  const { add }          = useCart();
  const { toast }        = useToast();
  const { products: allProducts } = useProductStore();
  const wishItems        = allProducts.filter(p=>ids.has(p.id));
  const border           = dark?"rgba(255,255,255,0.06)":C.shortbread;
  const bg               = dark?"#1A1008":C.crema;
  const text             = dark?C.crema:C.cocoa;
  const sub              = dark?C.shortbread:C.hazelnut;

  const handleAddToCart = (p: Product) => {
    const s = p.sizes[1]??p.sizes[0];
    add({ productId:p.id, name:p.name, price:s?.price??p.price, qty:1, imgId:p.imgId, size:s?.label??"Standard", category:p.category });
    toast(`${p.name} added to cart! 🛒`, "success");
  };

  return (
    <>
      <AnimatePresence>
        {open && <motion.div key="wl-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(4px)", zIndex:200 }} />}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div key="wl-drawer"
            initial={{ x:"100%" }} animate={{ x:0 }} exit={{ x:"100%" }}
            transition={{ type:"spring", stiffness:320, damping:38 }}
            style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(420px,100vw)", background:bg, zIndex:201, display:"flex", flexDirection:"column", borderLeft:`1px solid ${border}`, boxShadow:"-20px 0 80px rgba(0,0,0,0.22)" }}>
            <div style={{ padding:"22px 24px 18px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Heart size={18} color={C.peach}/>
                <h2 style={{ fontFamily:serif, fontSize:"1.18rem", fontWeight:700, color:text, margin:0 }}>Wishlist</h2>
                {ids.size>0 && <span style={{ fontFamily:sans, fontSize:"0.7rem", fontWeight:700, background:C.peach, color:"#fff", borderRadius:100, padding:"2px 8px" }}>{ids.size}</span>}
              </div>
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", padding:4 }}><X size={20}/></button>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
              {wishItems.length===0 ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:16, opacity:0.55 }}>
                  <Heart size={48} color={C.hazelnut} strokeWidth={1}/>
                  <p style={{ fontFamily:serif, fontSize:"1.1rem", color:text, textAlign:"center" }}>Your wishlist is empty</p>
                  <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub, textAlign:"center", lineHeight:1.7 }}>Browse our menu and save your favourites.</p>
                  <button onClick={onClose} style={{ fontFamily:sans, fontSize:"0.8rem", fontWeight:600, color:C.hazelnut, background:"none", border:`1px solid ${C.hazelnut}55`, borderRadius:100, padding:"10px 24px", cursor:"pointer" }}>Browse Menu</button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {wishItems.map(p=>(
                    <motion.div key={p.id} layout initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      style={{ display:"flex", gap:12, padding:"14px 16px", borderRadius:18, background:dark?"rgba(255,255,255,0.04)":C.oats, border:`1px solid ${border}` }}>
                      <img src={`https://images.unsplash.com/photo-${p.imgId}?w=80&h=80&fit=crop&auto=format&q=80`} alt={p.name} style={{ width:60, height:60, borderRadius:12, objectFit:"cover", flexShrink:0 }} onClick={()=>{onClose();onProduct(p);}} className="cursor-pointer"/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:serif, fontSize:"0.86rem", fontWeight:700, color:text, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }} onClick={()=>{onClose();onProduct(p);}}>{p.name}</p>
                        <p style={{ fontFamily:sans, fontSize:"0.68rem", color:sub, marginBottom:8 }}>{p.category}</p>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button onClick={()=>handleAddToCart(p)} style={{ padding:"6px 14px", borderRadius:100, background:C.hazelnut, color:C.crema, border:"none", cursor:"pointer", fontFamily:sans, fontSize:"0.7rem", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}><ShoppingCart size={11}/>Add to Cart</button>
                          <button onClick={()=>{toggle(p.id);toast(`${p.name} removed from wishlist`,"info");}} style={{ background:"none", border:"none", cursor:"pointer", color:sub, opacity:0.55, display:"flex", fontSize:"0.68rem", fontFamily:sans }}><X size={12}/> Remove</button>
                        </div>
                      </div>
                      <span style={{ fontFamily:serif, fontSize:"0.95rem", fontWeight:700, color:C.peach, flexShrink:0 }}>₹{p.price}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── APP ROOT (uses all context hooks) ───────────────────────────────────────
// ─── SOUND WIDGET ─────────────────────────────────────────────────────────────
function SoundWidget({ dark }: { dark:boolean }) {
  const { musicOn, toggleMusic, volume, setVolume, sfxOn, toggleSfx } = useSound();
  const [open, setOpen] = useState(false);
  const bg = dark ? "#2A1C10" : C.crema;
  const border = dark ? "rgba(255,255,255,0.1)" : C.shortbread;
  const text = dark ? C.crema : C.cocoa;

  return (
    <div style={{ position:"fixed", bottom:28, left:28, zIndex:150 }}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:12, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:12, scale:0.95 }}
            style={{ position:"absolute", bottom:56, left:0, width:220, padding:"18px 18px", borderRadius:20, background:bg, border:`1px solid ${border}`, boxShadow:"0 16px 48px rgba(0,0,0,0.22)" }}>
            <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:text, letterSpacing:"0.18em", marginBottom:14, opacity:0.7 }}>AMBIENCE & SOUND</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontFamily:sans, fontSize:"0.78rem", color:text }}>Background music</span>
              <button onClick={toggleMusic} style={{ width:38, height:22, borderRadius:100, background:musicOn?C.hazelnut:border, border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                <motion.div layout style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3 }} animate={{ left:musicOn?19:3 }} />
              </button>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={e=>setVolume(parseFloat(e.target.value))}
              style={{ width:"100%", marginBottom:14, accentColor:C.hazelnut }} disabled={!musicOn} />
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:sans, fontSize:"0.78rem", color:text }}>Interaction sounds</span>
              <button onClick={toggleSfx} style={{ width:38, height:22, borderRadius:100, background:sfxOn?C.hazelnut:border, border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }}>
                <motion.div layout style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:3 }} animate={{ left:sfxOn?19:3 }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button onClick={()=>setOpen(v=>!v)} whileHover={{ scale:1.08 }} whileTap={{ scale:0.92 }}
        style={{ width:46, height:46, borderRadius:"50%", background:bg, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 8px 24px rgba(0,0,0,0.14)" }}
        aria-label="Sound settings">
        {musicOn ? <Volume2 size={17} color={dark?C.apricot:C.hazelnut}/> : <VolumeX size={17} color={dark?C.apricot:C.hazelnut}/>}
      </motion.button>
    </div>
  );
}

function AppRoot() {
  const [stage, setStage]        = useState<Stage>("loading");
  const [dark,  setDark]         = useState(()=>localStorage.getItem("ww_dark")==="true");
  const [cartOpen,     setCartOpen]     = useState(false);
  const [authOpen,     setAuthOpen]     = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wishOpen,     setWishOpen]     = useState(false);
  const [adminOpen,    setAdminOpen]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string|null>(null);
  const [activeProduct, setActiveProduct] = useState<Product|null>(null);

  const { count: cartCount }     = useCart();
  const { count: wishCount }     = useWishlist();
  const { user, logout }         = useAuth();
  const { toast }                = useToast();
  const { unreadCount }          = useNotifications();

  useEffect(()=>{
    localStorage.setItem("ww_dark",String(dark));
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  },[dark]);

  const handleLogout = () => {
    logout();
    toast("Signed out successfully. See you soon! 👋","info");
  };

  return (
    <div style={{ fontFamily:sans, minHeight:"100vh" }}>
      <AnimatePresence mode="wait">
        {stage==="loading"  && <LoadingScreen key="loading"  onDone={()=>setStage("entrance")}/>}
        {stage==="entrance" && <BakeryEntrance key="entrance" onEnter={()=>setStage("main")}/>}
      </AnimatePresence>

      {stage==="main" && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.72 }}>
          <Navbar
            dark={dark} setDark={setDark}
            cartCount={cartCount} wishCount={wishCount} user={user} notifCount={unreadCount}
            onSearch={()=>setSearchOpen(true)}
            onCart={()=>setCartOpen(true)}
            onWishlist={()=>setWishOpen(true)}
            onAuth={()=>setAuthOpen(true)}
            onLogout={handleLogout}
            onAdmin={()=>setAdminOpen(true)}
            onProfile={()=>setProfileOpen(true)}
          />
          <HeroSection dark={dark}
            onExplore={()=>document.getElementById("menu")?.scrollIntoView({behavior:"smooth"})}
            onDesign={()=>document.getElementById("custom-cakes")?.scrollIntoView({behavior:"smooth"})}
          />
          <TodaysSpecialSection dark={dark} onProduct={p=>{setActiveProduct(p);}}/>
          <FreshlyBakedTodaySection dark={dark}/>
          <CategoriesSection dark={dark} onProduct={p=>{setActiveProduct(p);}}/>
          <FeaturedProducts dark={dark} onProduct={p=>{setActiveProduct(p);}}/>
          <DndProvider backend={HTML5Backend}>
            <CakeStudioSection dark={dark} onOrder={()=>setCartOpen(true)}/>
          </DndProvider>
          <BestSellers dark={dark} onProduct={p=>{setActiveProduct(p);}}/>
          <BakeryStory dark={dark}/>
          <WhyChooseUsSection dark={dark}/>
          <ReviewsSection dark={dark}/>
          <GallerySection dark={dark}/>
          <LoyaltySection dark={dark} onAuth={()=>setAuthOpen(true)}/>
          <ContactSection dark={dark}/>
          <NewsletterSection dark={dark}/>
          <DeliveryInfoSection dark={dark}/>
          <Footer dark={dark}/>

          {/* ── Overlays ── */}
          <SoundWidget dark={dark}/>
          <ToastContainer/>
          <CartDrawer open={cartOpen} onClose={()=>setCartOpen(false)} dark={dark} onCheckout={()=>setCheckoutOpen(true)}/>
          <WishlistDrawer open={wishOpen} onClose={()=>setWishOpen(false)} dark={dark} onProduct={p=>{setActiveProduct(p);}}/>
          <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)} dark={dark}/>
          <SearchModal open={searchOpen} onClose={()=>setSearchOpen(false)} dark={dark} onProduct={p=>{setActiveProduct(p);setSearchOpen(false);}}/>
          <ProductModal product={activeProduct} onClose={()=>setActiveProduct(null)} dark={dark} onProduct={p=>setActiveProduct(p)}/>
          <CheckoutFlow open={checkoutOpen} onClose={()=>setCheckoutOpen(false)} dark={dark} onOrderTrack={(id)=>setTrackingOrderId(id)}/>
          <AdminDashboard open={adminOpen} onClose={()=>setAdminOpen(false)} dark={dark}/>
          <UserProfileModal open={profileOpen} onClose={()=>setProfileOpen(false)} dark={dark} onOrderTrack={(id)=>{ setProfileOpen(false); setTrackingOrderId(id); }} onProduct={p=>setActiveProduct(p)}/>
          <OrderTrackingModal orderId={trackingOrderId} onClose={()=>setTrackingOrderId(null)} dark={dark}/>
        </motion.div>
      )}
    </div>
  );
}

// ─── APP (providers wrapper) ──────────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <SoundProvider>
        <ProductStoreProvider>
          <ReviewsProvider>
            <CouponsProvider>
              <NotificationsProvider>
                <OrderProvider>
                  <AuthProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <AppRoot/>
                      </WishlistProvider>
                    </CartProvider>
                  </AuthProvider>
                </OrderProvider>
              </NotificationsProvider>
            </CouponsProvider>
          </ReviewsProvider>
        </ProductStoreProvider>
      </SoundProvider>
    </ToastProvider>
  );
}
