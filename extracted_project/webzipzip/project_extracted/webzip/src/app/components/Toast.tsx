import { AnimatePresence, motion } from "motion/react";
import { Check, X, AlertCircle, Info, Loader } from "lucide-react";
import { useToast, type Toast as ToastItem } from "../contexts/ToastContext";

const C = { crema: "#FAF6F0", cocoa: "#4A3728", mint: "#9DD4B8", peach: "#F4956A", apricot: "#FFBC8A", lavender: "#B8A6D8" };
const sans = "'Poppins', system-ui, sans-serif";

const icons = {
  success: <Check size={15} />,
  error:   <AlertCircle size={15} />,
  info:    <Info size={15} />,
  loading: <Loader size={15} />,
};

const styles: Record<ToastItem["type"], { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "rgba(20,50,35,0.97)", border: "rgba(157,212,184,0.35)", icon: "#9DD4B8", text: C.crema },
  error:   { bg: "rgba(55,18,14,0.97)", border: "rgba(244,149,106,0.35)", icon: C.peach,  text: C.crema },
  info:    { bg: "rgba(18,24,50,0.97)", border: "rgba(184,166,216,0.35)", icon: C.lavender,text: C.crema },
  loading: { bg: "rgba(20,12,6,0.97)",  border: "rgba(255,188,138,0.35)", icon: C.apricot, text: C.crema },
};

function ToastItem({ t }: { t: ToastItem }) {
  const { dismiss } = useToast();
  const s = styles[t.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "13px 18px",
        borderRadius:   14,
        background:     s.bg,
        border:         `1px solid ${s.border}`,
        boxShadow:      "0 12px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        minWidth:       260,
        maxWidth:       360,
        pointerEvents:  "all",
      }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: `${s.icon}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: s.icon,
      }}>
        <motion.span
          animate={t.type === "loading" ? { rotate: 360 } : {}}
          transition={t.type === "loading" ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
          style={{ display: "flex" }}
        >
          {icons[t.type]}
        </motion.span>
      </span>

      <p style={{
        fontFamily: sans,
        fontSize:   "0.81rem",
        fontWeight: 500,
        color:      s.text,
        flex:       1,
        lineHeight: 1.45,
      }}>
        {t.message}
      </p>

      <button
        onClick={() => dismiss(t.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.38)", display: "flex", padding: 2, flexShrink: 0 }}
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div style={{
      position:      "fixed",
      top:           24,
      right:         24,
      zIndex:        9999,
      display:       "flex",
      flexDirection: "column",
      gap:           10,
      pointerEvents: "none",
    }}>
      <AnimatePresence mode="popLayout">
        {toasts.map(t => <ToastItem key={t.id} t={t} />)}
      </AnimatePresence>
    </div>
  );
}
