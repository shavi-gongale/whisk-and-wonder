import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";

type Tab = "login" | "signup" | "forgot";

interface Props { open: boolean; onClose: () => void; dark: boolean; }

function Field({ label, type, value, onChange, icon, placeholder, dark, showToggle }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  icon: React.ReactNode; placeholder: string; dark: boolean; showToggle?: boolean;
}) {
  const [show, setShow] = useState(false);
  const border = dark ? "rgba(255,255,255,0.1)" : C.shortbread;
  const bg     = dark ? "rgba(255,255,255,0.06)" : C.oats;
  const text   = dark ? C.crema : C.cocoa;
  return (
    <div>
      <label style={{ fontFamily:sans, fontSize:"0.65rem", fontWeight:700, color:dark?C.shortbread:C.hazelnut, letterSpacing:"0.2em", display:"block", marginBottom:6 }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:dark?C.shortbread:C.hazelnut, opacity:0.5, display:"flex" }}>
          {icon}
        </span>
        <input
          type={showToggle ? (show ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:"100%", padding:"12px 16px 12px 42px", borderRadius:12,
            background:bg, border:`1px solid ${border}`,
            fontFamily:sans, fontSize:"0.86rem", color:text, outline:"none", boxSizing:"border-box",
            transition:"border 0.2s",
          }}
          onFocus={e => e.currentTarget.style.borderColor = C.hazelnut}
          onBlur={e => e.currentTarget.style.borderColor = border}
        />
        {showToggle && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:dark?C.shortbread:C.hazelnut, opacity:0.5, display:"flex" }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthModal({ open, onClose, dark }: Props) {
  const [tab, setTab]             = useState<Tab>("login");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [name, setName]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const { login, signup, forgotPassword, isLoading } = useAuth();
  const { toast } = useToast();

  const reset = () => { setEmail(""); setPassword(""); setName(""); setConfirm(""); setError(""); setForgotSent(false); };
  const switchTab = (t: Tab) => { setTab(t); setError(""); };

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    try { await login(email, password); toast("Welcome back! 🎉", "success"); onClose(); }
    catch (e: any) { setError(e.message); }
  };

  const handleSignup = async () => {
    setError("");
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 10 characters with upper, lower, and numeric characters.");
      return;
    }
    try { await signup(name, email, password); toast("Account created! Welcome to Whisk & Wonder 🥐", "success"); onClose(); }
    catch (e: any) { setError(e.message); }
  };

  const handleForgot = async () => {
    setError("");
    if (!email) { setError("Please enter your email address."); return; }
    try { await forgotPassword(email); setForgotSent(true); toast("Reset link sent! Check your inbox.", "success"); }
    catch (e: any) { setError(e.message); }
  };

  const bg     = dark ? "#1A1008" : C.crema;
  const border = dark ? "rgba(255,255,255,0.06)" : C.shortbread;
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-outer"
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          exit={{ opacity:0 }}
          style={{
            position:"fixed", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:1000,
          }}
        >
          {/* Backdrop */}
          <motion.div
            key="auth-bg"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => { onClose(); reset(); }}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)" }}
          />

          {/* Modal */}
          <motion.div
            key="auth-modal"
            initial={{ opacity:0, scale:0.94, y:20 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.94, y:20 }}
            transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
            style={{
              position:"relative",
              width:"min(460px, 92vw)",
              maxHeight:"90vh",
              overflowY:"auto",
              background:bg,
              borderRadius:24,
              border:`1px solid ${border}`,
              boxShadow:"0 40px 100px rgba(0,0,0,0.45)",
              padding:0,
            }}
          >
            {/* Sticky close */}
            <button
              onClick={() => { onClose(); reset(); }}
              style={{
                position:"sticky", top:12, float:"right", marginRight:16,
                background:"none", border:"none", cursor:"pointer", color:sub,
                display:"flex", zIndex:10, padding:4,
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ padding:"28px 28px 0", clear:"right" }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <p style={{ fontFamily:sans, fontSize:"0.55rem", fontWeight:700, color:C.peach, letterSpacing:"0.3em", marginBottom:8 }}>WHISK & WONDER</p>
                <h2 style={{ fontFamily:serif, fontSize:"1.6rem", fontWeight:700, color:text, margin:0 }}>
                  {tab === "login" ? "Welcome back" : tab === "signup" ? "Create account" : "Reset password"}
                </h2>
              </div>

              {tab !== "forgot" && (
                <div style={{ display:"flex", background:dark?"rgba(255,255,255,0.05)":C.oats, borderRadius:100, padding:3, marginBottom:24 }}>
                  {(["login","signup"] as const).map(t => (
                    <button key={t} onClick={() => switchTab(t)} style={{
                      flex:1, padding:"9px 0", borderRadius:100, fontFamily:sans, fontSize:"0.78rem", fontWeight:600,
                      background: tab===t ? C.hazelnut : "transparent",
                      color: tab===t ? C.crema : sub,
                      border:"none", cursor:"pointer", transition:"all 0.2s",
                    }}>
                      {t === "login" ? "Sign In" : "Sign Up"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding:"0 28px 28px" }}>
              <AnimatePresence mode="wait">
                {tab === "login" && (
                  <motion.div key="login" initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:12 }} transition={{ duration:0.22 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      <Field label="Email" type="email" value={email} onChange={setEmail} icon={<Mail size={14}/>} placeholder="your@email.com" dark={dark} />
                      <Field label="Password" type="password" value={password} onChange={setPassword} icon={<Lock size={14}/>} placeholder="Your password" dark={dark} showToggle />
                      <button onClick={() => switchTab("forgot")} style={{ fontFamily:sans, fontSize:"0.72rem", color:C.hazelnut, background:"none", border:"none", cursor:"pointer", textAlign:"right", textDecoration:"underline", padding:0 }}>
                        Forgot password?
                      </button>
                    </div>
                    {error && <p style={{ fontFamily:sans, fontSize:"0.74rem", color:C.peach, marginTop:12, lineHeight:1.5 }}>{error}</p>}
                    <button onClick={handleLogin} disabled={isLoading} style={{
                      width:"100%", marginTop:20, padding:"14px", borderRadius:100,
                      background:C.hazelnut, color:C.crema, border:"none", cursor:"pointer",
                      fontFamily:sans, fontWeight:700, fontSize:"0.88rem", letterSpacing:"0.06em",
                      opacity:isLoading?0.7:1, transition:"opacity 0.2s",
                    }}>
                      {isLoading ? "Signing in…" : "Sign In"}
                    </button>
                  </motion.div>
                )}

                {tab === "signup" && (
                  <motion.div key="signup" initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-12 }} transition={{ duration:0.22 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      <Field label="Full Name" type="text" value={name} onChange={setName} icon={<User size={14}/>} placeholder="Your name" dark={dark} />
                      <Field label="Email" type="email" value={email} onChange={setEmail} icon={<Mail size={14}/>} placeholder="your@email.com" dark={dark} />
                      <Field label="Password" type="password" value={password} onChange={setPassword} icon={<Lock size={14}/>} placeholder="Min. 8 characters" dark={dark} showToggle />
                      <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} icon={<Lock size={14}/>} placeholder="Repeat password" dark={dark} showToggle />
                    </div>
                    {error && <p style={{ fontFamily:sans, fontSize:"0.74rem", color:C.peach, marginTop:12, lineHeight:1.5 }}>{error}</p>}
                    <button onClick={handleSignup} disabled={isLoading} style={{
                      width:"100%", marginTop:20, padding:"14px", borderRadius:100,
                      background:C.hazelnut, color:C.crema, border:"none", cursor:"pointer",
                      fontFamily:sans, fontWeight:700, fontSize:"0.88rem", letterSpacing:"0.06em",
                      opacity:isLoading?0.7:1, transition:"opacity 0.2s",
                    }}>
                      {isLoading ? "Creating account…" : "Create Account"}
                    </button>
                    <p style={{ fontFamily:sans, fontSize:"0.65rem", color:sub, marginTop:12, textAlign:"center", lineHeight:1.6, opacity:0.6 }}>
                      By signing up you agree to our Terms & Privacy Policy
                    </p>
                  </motion.div>
                )}

                {tab === "forgot" && (
                  <motion.div key="forgot" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.22 }}>
                    {forgotSent ? (
                      <div style={{ textAlign:"center", padding:"16px 0" }}>
                        <div style={{ width:56, height:56, borderRadius:"50%", background:`${C.mint}22`, border:`1px solid ${C.mint}55`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                          <Check size={24} color={C.mint} />
                        </div>
                        <p style={{ fontFamily:serif, fontSize:"1rem", color:text, marginBottom:8 }}>Check your inbox</p>
                        <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub, lineHeight:1.7 }}>We've sent a password reset link to <strong>{email}</strong>.</p>
                        <button onClick={() => { switchTab("login"); setForgotSent(false); }} style={{ marginTop:20, fontFamily:sans, fontSize:"0.78rem", color:C.hazelnut, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                          Back to Sign In
                        </button>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontFamily:sans, fontSize:"0.82rem", color:sub, lineHeight:1.7, marginBottom:18 }}>
                          Enter your email and we'll send you a link to reset your password.
                        </p>
                        <Field label="Email" type="email" value={email} onChange={setEmail} icon={<Mail size={14}/>} placeholder="your@email.com" dark={dark} />
                        {error && <p style={{ fontFamily:sans, fontSize:"0.74rem", color:C.peach, marginTop:10 }}>{error}</p>}
                        <button onClick={handleForgot} disabled={isLoading} style={{
                          width:"100%", marginTop:18, padding:"14px", borderRadius:100,
                          background:C.hazelnut, color:C.crema, border:"none", cursor:"pointer",
                          fontFamily:sans, fontWeight:700, fontSize:"0.88rem", letterSpacing:"0.06em",
                          opacity:isLoading?0.7:1, transition:"opacity 0.2s",
                        }}>
                          {isLoading ? "Sending…" : "Send Reset Link"}
                        </button>
                        <button onClick={() => switchTab("login")} style={{ display:"block", margin:"12px auto 0", fontFamily:sans, fontSize:"0.72rem", color:C.hazelnut, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                          Back to Sign In
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
