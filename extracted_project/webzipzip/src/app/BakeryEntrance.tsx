import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const bakerySrc = "/assets/bakery-entrance.png";

interface Props { onEnter: () => void; }

// ─── Seeded particles (stable, no Math.random in render) ─────────────────────
const DUST = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x:       10 + (i * 37 + 13) % 78,
  y:       15 + (i * 53 + 7)  % 70,
  size:    1.4 + (i * 17) % 3,
  dur:     5   + (i * 11) % 9,
  delay:   (i * 1.3) % 10,
  drift:   ((i % 7) - 3) * 20,
  opacity: 0.10 + (i * 7) % 20 / 100,
}));

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x:    5 + (i * 43 + 9) % 85,
  size: 7 + (i * 11) % 8,
  dur:  9 + (i * 7) % 7,
  delay:(i * 1.7) % 14,
  drift:((i % 9) - 4) * 22,
  rot:  (i * 47) % 360,
  r:    210 + (i * 13) % 35,
  g:    90  + (i * 17) % 55,
  b:    90  + (i * 11) % 45,
}));

// ─── Sub-components ──────────────────────────────────────────────────────────
function Particles() {
  return (
    <>
      {DUST.map(p => (
        <motion.div key={`d${p.id}`}
          style={{
            position:"absolute", width:p.size, height:p.size, borderRadius:"50%",
            background:"rgba(255,215,130,0.9)",
            left:`${p.x}%`, top:`${p.y}%`, pointerEvents:"none",
          }}
          animate={{ y:[0,-(80+(p.id*17)%55)], x:[0,p.drift], opacity:[0,p.opacity,p.opacity*0.5,0], scale:[0.4,1,0.6,0] }}
          transition={{ duration:p.dur, delay:p.delay, repeat:Infinity, repeatDelay:(p.id*0.9)%5, ease:"easeOut" }}
        />
      ))}
      {PETALS.map(p => (
        <motion.div key={`p${p.id}`}
          style={{
            position:"absolute", width:p.size, height:p.size*0.65,
            borderRadius:"50% 0 50% 0",
            background:`rgba(${p.r},${p.g},${p.b},0.55)`,
            left:`${p.x}%`, top:"-3%", rotate:p.rot, pointerEvents:"none",
          }}
          animate={{ y:["0vh","105vh"], x:[0,p.drift], rotate:[p.rot,p.rot+200], opacity:[0,0.7,0.5,0] }}
          transition={{ duration:p.dur, delay:p.delay, repeat:Infinity, repeatDelay:(p.id*1.1)%6, ease:"linear" }}
        />
      ))}
    </>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function BakeryEntrance({ onEnter }: Props) {
  const [btnVisible, setBtnVisible] = useState(false);
  const [clicking,   setClicking]   = useState(false);
  const [bloom,      setBloom]      = useState(false);
  const [fadeBlack,  setFadeBlack]  = useState(false);
  const [hovered,    setHovered]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBtnVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    if (clicking) return;
    setClicking(true);
    setBtnVisible(false);
    setTimeout(() => setBloom(true),    700);
    setTimeout(() => setFadeBlack(true),1300);
    setTimeout(() => onEnter(),         1900);
  };

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", zIndex:1000, background:"#1a0f08" }}>

      {/* ── BACKGROUND IMAGE — contain so full storefront is always visible ── */}
      <motion.div
        animate={clicking ? { scale:1.14, x:"-2%", y:"1.5%" } : { scale:1, x:0, y:0 }}
        transition={clicking ? { duration:1.7, ease:[0.25,0.1,0.1,1] } : { duration:0 }}
        style={{
          position:"absolute", inset:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          transformOrigin:"46% 54%",
        }}
      >
        <img
          src={bakerySrc}
          alt="Whisk & Wonder Bakery"
          style={{
            width:"100%",
            height:"100%",
            objectFit:"contain",
            objectPosition:"center center",
            display:"block",
            userSelect:"none",
            pointerEvents:"none",
          }}
        />
      </motion.div>

      {/* ── WARM CINEMATIC OVERLAY ── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:[
          // Warm glow over display window (right of center)
          "radial-gradient(ellipse 32% 42% at 60% 50%, rgba(255,175,55,0.10) 0%, transparent 70%)",
          // Warm ambient from door area
          "radial-gradient(ellipse 18% 30% at 46% 52%, rgba(255,200,100,0.08) 0%, transparent 65%)",
          // Cinematic top darkening
          "linear-gradient(to bottom, rgba(0,0,0,0.24) 0%, transparent 18%, transparent 74%, rgba(0,0,0,0.46) 100%)",
          // Edge vignette (subtle, preserve the sides)
          "radial-gradient(ellipse 92% 92% at 50% 50%, transparent 52%, rgba(0,0,0,0.52) 100%)",
        ].join(", "),
      }} />

      {/* ── WINDOW GLOW PULSE ── */}
      <motion.div
        animate={{ opacity:[0.5,1,0.65,1,0.5] }}
        transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }}
        style={{
          position:"absolute",
          left:"44%", top:"22%", width:"26%", height:"48%",
          background:"radial-gradient(ellipse at 50% 55%, rgba(255,185,65,0.13) 0%, rgba(255,145,30,0.04) 55%, transparent 80%)",
          pointerEvents:"none",
          mixBlendMode:"screen",
        }}
      />

      {/* ── PARTICLES ── */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <Particles />
      </div>

      {/* ── WARM BLOOM ON ENTER ── */}
      <AnimatePresence>
        {bloom && (
          <motion.div
            initial={{ opacity:0, scale:0.5 }}
            animate={{ opacity:[0, 0.6, 0.25], scale:[0.5, 1.9, 2.6] }}
            transition={{ duration:0.9, ease:"easeOut" }}
            style={{
              position:"absolute",
              left:"46%", top:"54%", transform:"translate(-50%,-50%)",
              width:400, height:400, borderRadius:"50%",
              background:"radial-gradient(circle, rgba(255,215,120,1) 0%, rgba(255,165,40,0.65) 35%, transparent 70%)",
              pointerEvents:"none",
              mixBlendMode:"screen",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── FADE TO BLACK ── */}
      <AnimatePresence>
        {fadeBlack && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            transition={{ duration:0.55, ease:"easeIn" }}
            style={{ position:"absolute", inset:0, background:"#000", pointerEvents:"none", zIndex:30 }}
          />
        )}
      </AnimatePresence>

      {/* ── ENTER BUTTON ── */}
      <AnimatePresence>
        {btnVisible && (
          <motion.div
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-18 }}
            transition={{ duration:0.9, ease:[0.16,1,0.3,1] }}
            style={{
              position:"absolute", bottom:"8%", left:"50%", transform:"translateX(-50%)",
              zIndex:20, display:"flex", flexDirection:"column", alignItems:"center", gap:14,
            }}
          >
            {/* Hint */}
            <motion.p
              animate={{ opacity:[0.45,0.8,0.45] }}
              transition={{ duration:2.8, repeat:Infinity }}
              style={{
                fontFamily:"'Playfair Display', Georgia, serif",
                fontSize:"0.74rem", color:"rgba(255,238,200,0.70)",
                letterSpacing:"0.32em", textTransform:"uppercase", margin:0,
              }}
            >
              Step Inside
            </motion.p>

            {/* Button */}
            <button
              onClick={handleEnter}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                display:"flex", alignItems:"center", gap:12, padding:"15px 46px",
                border:`1px solid ${hovered?"rgba(255,215,125,0.75)":"rgba(255,220,160,0.38)"}`,
                borderRadius:50,
                background:hovered ? "rgba(255,195,80,0.16)" : "rgba(10,5,2,0.50)",
                backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
                cursor:"pointer",
                transform:hovered ? "scale(1.046)" : "scale(1)",
                boxShadow:hovered
                  ? "0 0 36px rgba(255,185,60,0.24), inset 0 0 12px rgba(255,205,100,0.08)"
                  : "0 4px 28px rgba(0,0,0,0.38)",
                transition:"all 0.28s ease",
              }}
            >
              {/* Door icon */}
              <svg width="17" height="19" viewBox="0 0 18 20" fill="none" style={{ opacity:hovered?1:0.8 }}>
                <rect x="2.5" y="1" width="13" height="18" rx="1.5" stroke="rgba(255,225,150,0.9)" strokeWidth="1.3"/>
                <circle cx="14" cy="10" r="1.2" fill="rgba(255,225,150,0.9)"/>
              </svg>
              <span style={{
                fontFamily:"'Playfair Display', Georgia, serif",
                fontSize:"0.92rem", fontWeight:600, color:"rgba(255,238,198,0.95)",
                letterSpacing:"0.22em", textTransform:"uppercase",
              }}>
                Enter Bakery
              </span>
            </button>

            {/* Scroll chevron */}
            <motion.div
              animate={{ y:[0,6,0], opacity:[0.35,0.65,0.35] }}
              transition={{ duration:1.9, repeat:Infinity }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}
            >
              <div style={{ width:1, height:16, background:"rgba(255,215,140,0.38)", borderRadius:1 }}/>
              <div style={{ width:0, height:0, borderLeft:"4px solid transparent", borderRight:"4px solid transparent", borderTop:"5px solid rgba(255,215,140,0.38)" }}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
