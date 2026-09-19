import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Star, Minus, Plus, ShoppingCart, Share2, Check, ChevronDown, ChevronUp, Clock, Truck, Leaf, Egg, Crown, ThumbsUp, ZoomIn } from "lucide-react";
import { type Product } from "../data/products";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import { useToast } from "../contexts/ToastContext";
import { useProductStore } from "../contexts/ProductStoreContext";
import { useAuth } from "../contexts/AuthContext";
import { useReviews } from "../contexts/ReviewsContext";
import { resolveImage } from "../../lib/image";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const img = (id: string, w=680, h=520) => resolveImage(id, w, h, 88);

interface Props { product: Product | null; onClose: () => void; dark: boolean; onProduct: (p: Product) => void; }

type ReviewSort = "newest" | "highest" | "verified";

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:2 }}
        >
          <Star size={20} fill={(hover||value) >= n ? C.apricot : "none"} color={(hover||value) >= n ? C.apricot : C.shortbread} />
        </button>
      ))}
    </div>
  );
}

export function ProductModal({ product: p, onClose, dark, onProduct }: Props) {
  const [size,  setSize]  = useState("");
  const [qty,   setQty]   = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mainImgId, setMainImgId] = useState("");
  const [lightbox, setLightbox] = useState(false);
  const [ingredOpen, setIngredOpen] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("newest");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [fbtChecked, setFbtChecked] = useState<Record<string,boolean>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);

  const { add }          = useCart();
  const { toggle, has }  = useWishlist();
  const { toast }        = useToast();
  const { products }     = useProductStore();
  const { user }         = useAuth();
  const { getProductReviews, addReview, likeReview } = useReviews();
  const userId = user?.id ?? "";

  useEffect(() => {
    if (p) {
      const firstImg = (p as any).galleryImgIds?.[0] ?? p.imgId;
      setMainImgId(firstImg);
      setSize(p.sizes[1]?.label ?? p.sizes[0]?.label ?? "");
      setQty(1);
      setAdded(false);
      setIngredOpen(false);
      setReviewText("");
      setReviewRating(5);
    }
  }, [p?.id]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!p) return null;

  const liked    = has(p.id);
  const curSize  = p.sizes.find(s => s.label === size) ?? p.sizes[0];
  const curPrice = curSize?.price ?? p.price;
  const discount = (p as any).discount as number | undefined;
  const originalPrice = (p as any).originalPrice as number | undefined;
  const allergens = (p as any).allergens as string[] | undefined;
  const availability = (p as any).availability as string | undefined;
  const prepTime = (p as any).prepTime as string | undefined;
  const deliveryTime = (p as any).deliveryTime as string | undefined;
  const isEggless = (p as any).isEggless as boolean | undefined;
  const isVegetarian = (p as any).isVegetarian as boolean | undefined;
  const isPremium = (p as any).isPremium as boolean | undefined;
  const galleryImgIds: string[] = (p as any).galleryImgIds ?? [p.imgId];

  const total    = curPrice * qty;

  const border = dark ? "rgba(255,255,255,0.07)" : C.shortbread;
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const cardBg = dark ? "#1A1008" : C.crema;
  const sectionBg = dark ? "rgba(255,255,255,0.03)" : C.oats;

  const related = (p.relatedIds ?? []).slice(0, 6).map(id => products.find((x: Product) => x.id === id)).filter(Boolean) as Product[];
  const bestSellers = products.filter((x: Product) => x.isBestSeller && x.id !== p.id).slice(0, 5);
  const fbtProducts = related.slice(0, 2);

  const rawReviews = getProductReviews(p.id);
  const reviews = [...rawReviews].sort((a, b) => {
    if (reviewSort === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (reviewSort === "highest") return b.rating - a.rating;
    return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
  });

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : p.rating;

  const handleAddToCart = () => {
    if (!size && p.sizes.length > 0) { toast("Please select a size", "error"); return; }
    add({ productId:p.id, name:p.name, price:curPrice, qty, imgId:p.imgId, size:size||"Standard", category:p.category });
    // Also add FBT items
    fbtProducts.forEach(fp => {
      if (fbtChecked[fp.id]) {
        add({ productId:fp.id, name:fp.name, price:fp.price, qty:1, imgId:fp.imgId, size:"Standard", category:fp.category });
      }
    });
    setAdded(true);
    toast(`${p.name} added to cart! 🛒`, "success");
    setTimeout(() => setAdded(false), 1800);
  };

  const handleWishlist = () => {
    toggle(p.id);
    toast(liked ? `Removed from wishlist` : `${p.name} saved to wishlist ♡`, liked ? "info" : "success");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); toast("Link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast("Could not copy link", "error"));
  };

  const handleSubmitReview = () => {
    if (!user) { toast("Please sign in to leave a review", "error"); return; }
    if (!reviewText.trim()) { toast("Please write something in your review", "error"); return; }
    addReview(p.id, {
      userId: user.id,
      userName: user.name,
      userInitials: user.initials,
      rating: reviewRating,
      text: reviewText.trim(),
      isVerified: user.orders > 0,
    });
    setReviewText("");
    setReviewRating(5);
    toast("Review submitted! Thank you 🎉", "success");
  };

  const availColor = availability === "In Stock" ? C.mint : availability === "Limited" ? C.apricot : availability === "Made to Order" ? C.lilac : C.peach;

  return (
    <AnimatePresence>
      {p && (
        <>
          {/* Backdrop */}
          <motion.div key="pm-bg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={onClose}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",zIndex:350}}
          />

          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && (
              <motion.div key="lightbox"
                initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={() => setLightbox(false)}
                style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}
              >
                <img src={img(mainImgId, 1200, 900)} alt={p.name}
                  style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:16}}
                />
                <button onClick={() => setLightbox(false)}
                  style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}>
                  <X size={18}/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal — centering is done by the flex wrapper; Framer Motion only drives opacity/scale/y */}
          <div key="pm-wrapper" style={{
            position:"fixed", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:351, pointerEvents:"none",
            padding:"20px 16px",
          }}>
          <motion.div key="pm-modal"
            initial={{opacity:0,scale:0.94,y:24}}
            animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.94,y:24}}
            transition={{duration:0.32,ease:[0.16,1,0.3,1]}}
            style={{
              pointerEvents:"all",
              width:"min(860px, 95vw)",
              maxHeight:"90vh", overflowY:"auto",
              background:cardBg, borderRadius:28,
              border:`1px solid ${border}`,
              boxShadow:"0 40px 120px rgba(0,0,0,0.45)",
            }}
          >
            {/* Sticky close */}
            <button onClick={onClose}
              style={{
                position:"sticky",top:12,float:"right",marginRight:14,
                background:dark?"rgba(0,0,0,0.5)":"rgba(255,255,255,0.8)",
                backdropFilter:"blur(8px)",border:`1px solid ${border}`,
                borderRadius:"50%",width:36,height:36,
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer",color:text,zIndex:10,
              }}>
              <X size={16}/>
            </button>

            {/* Two-column layout */}
            <div style={{display:"flex", flexDirection: isMobile ? "column" : "row"}}>

              {/* ── LEFT: Image Gallery ── */}
              <div style={{
                position:"relative",
                flex: isMobile ? "none" : "0 0 420px",
                width: isMobile ? "100%" : 420,
                minHeight: isMobile ? 260 : 480,
              }}>
                {/* Main image */}
                <div style={{position:"relative", overflow:"hidden", borderRadius: isMobile ? "28px 28px 0 0" : "28px 0 0 0"}}>
                  <img src={img(mainImgId, 680, 520)} alt={p.name}
                    style={{width:"100%", height: isMobile ? 260 : 380, objectFit:"cover", display:"block", transition:"opacity 0.2s"}}
                  />
                  {/* Zoom button */}
                  <button onClick={() => setLightbox(true)}
                    style={{position:"absolute",bottom:12,right:12,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(6px)",border:"none",borderRadius:"50%",width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"}}>
                    <ZoomIn size={15}/>
                  </button>
                  {/* Tag */}
                  {p.tag && (
                    <div style={{position:"absolute",top:16,left:16,padding:"5px 14px",borderRadius:100,background:C.hazelnut,color:C.crema,fontFamily:sans,fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.14em"}}>
                      {p.tag}
                    </div>
                  )}
                  {/* Discount badge */}
                  {discount && (
                    <div style={{position:"absolute",top:16,right:16,padding:"5px 12px",borderRadius:100,background:C.peach,color:"#fff",fontFamily:sans,fontSize:"0.62rem",fontWeight:700}}>
                      -{discount}% OFF
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {galleryImgIds.length > 1 && (
                  <div style={{display:"flex",gap:8,padding:"10px 14px",overflowX:"auto"}}>
                    {galleryImgIds.map((gid, i) => (
                      <button key={i} onClick={() => setMainImgId(gid)}
                        style={{
                          flexShrink:0, width:60, height:44, borderRadius:10, overflow:"hidden", padding:0,
                          border:`2px solid ${mainImgId === gid ? C.hazelnut : "transparent"}`,
                          cursor:"pointer", transition:"border 0.15s",
                        }}>
                        <img src={img(gid, 120, 90)} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      </button>
                    ))}
                  </div>
                )}

                {/* Badges row */}
                <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"0 14px 14px"}}>
                  {isEggless && (
                    <span style={{display:"flex",alignItems:"center",gap:4,fontFamily:sans,fontSize:"0.6rem",fontWeight:600,color:"#1A4A34",background:`${C.mint}25`,border:`1px solid ${C.mint}55`,borderRadius:100,padding:"3px 10px"}}>
                      <Egg size={10}/> Eggless
                    </span>
                  )}
                  {isVegetarian && (
                    <span style={{display:"flex",alignItems:"center",gap:4,fontFamily:sans,fontSize:"0.6rem",fontWeight:600,color:"#2A5C2A",background:"#E8F5E8",border:"1px solid #C8E8C8",borderRadius:100,padding:"3px 10px"}}>
                      <Leaf size={10}/> Vegetarian
                    </span>
                  )}
                  {isPremium && (
                    <span style={{display:"flex",alignItems:"center",gap:4,fontFamily:sans,fontSize:"0.6rem",fontWeight:600,color:C.cocoa,background:`${C.apricot}35`,border:`1px solid ${C.apricot}66`,borderRadius:100,padding:"3px 10px"}}>
                      <Crown size={10}/> Premium
                    </span>
                  )}
                </div>
              </div>

              {/* ── RIGHT: Details ── */}
              <div style={{flex:1, padding: isMobile ? "20px 20px 28px" : "32px 32px 28px", minWidth:0}}>

                {/* Category + availability */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:8}}>
                  <span style={{fontFamily:sans,fontSize:"0.6rem",fontWeight:700,color:C.peach,letterSpacing:"0.25em"}}>
                    {p.category.toUpperCase()}
                  </span>
                  {availability && (
                    <span style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:600,color:availColor,background:`${availColor}20`,border:`1px solid ${availColor}55`,borderRadius:100,padding:"3px 10px"}}>
                      {availability}
                    </span>
                  )}
                </div>

                <h2 style={{fontFamily:serif,fontSize: isMobile?"1.35rem":"1.55rem",fontWeight:700,color:text,margin:"0 0 10px",lineHeight:1.2}}>{p.name}</h2>

                {/* Rating */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{display:"flex",gap:2}}>
                    {Array.from({length:5}).map((_,i)=><Star key={i} size={13} fill={i<Math.round(avgRating)?C.apricot:"none"} color={i<Math.round(avgRating)?C.apricot:C.shortbread}/>)}
                  </div>
                  <span style={{fontFamily:sans,fontSize:"0.72rem",color:sub}}>{avgRating.toFixed(1)} ({p.reviewCount + reviews.length} reviews)</span>
                </div>

                <p style={{fontFamily:sans,fontSize:"0.82rem",color:sub,lineHeight:1.8,marginBottom:18,opacity:0.85}}>{p.longDesc}</p>

                {/* Price row */}
                <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:18}}>
                  <span style={{fontFamily:serif,fontSize:"1.7rem",fontWeight:700,color:C.peach}}>₹{curPrice}</span>
                  {discount && originalPrice && (
                    <span style={{fontFamily:sans,fontSize:"0.9rem",color:sub,textDecoration:"line-through",opacity:0.6}}>₹{originalPrice}</span>
                  )}
                </div>

                {/* Prep & Delivery */}
                {(prepTime || deliveryTime) && (
                  <div style={{display:"flex",gap:16,marginBottom:18,flexWrap:"wrap"}}>
                    {prepTime && (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Clock size={13} color={sub}/>
                        <span style={{fontFamily:sans,fontSize:"0.7rem",color:sub}}>Prep: {prepTime}</span>
                      </div>
                    )}
                    {deliveryTime && (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Truck size={13} color={sub}/>
                        <span style={{fontFamily:sans,fontSize:"0.7rem",color:sub}}>Delivery: {deliveryTime}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Size selector */}
                {p.sizes.length > 0 && (
                  <div style={{marginBottom:20}}>
                    <p style={{fontFamily:sans,fontSize:"0.6rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:10}}>SIZE</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {p.sizes.map(s=>(
                        <button key={s.label} onClick={()=>setSize(s.label)} style={{
                          padding:"8px 14px",borderRadius:10,fontFamily:sans,fontSize:"0.74rem",fontWeight:600,
                          background:size===s.label?C.hazelnut:"transparent",
                          color:size===s.label?C.crema:sub,
                          border:`1px solid ${size===s.label?"transparent":border}`,
                          cursor:"pointer",transition:"all 0.18s",
                        }}>
                          <span style={{display:"block",lineHeight:1.2}}>{s.label}</span>
                          <span style={{fontSize:"0.65rem",fontWeight:700,color:size===s.label?`${C.crema}AA`:C.peach}}>₹{s.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qty + Total */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                  <div>
                    <p style={{fontFamily:sans,fontSize:"0.6rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:8}}>QUANTITY</p>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:30,height:30,borderRadius:"50%",background:dark?"rgba(255,255,255,0.08)":C.oats,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:text}}>
                        <Minus size={12}/>
                      </button>
                      <span style={{fontFamily:sans,fontSize:"0.9rem",fontWeight:600,color:text,minWidth:16,textAlign:"center"}}>{qty}</span>
                      <button onClick={()=>setQty(q=>q+1)} style={{width:30,height:30,borderRadius:"50%",background:dark?"rgba(255,255,255,0.08)":C.oats,border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:text}}>
                        <Plus size={12}/>
                      </button>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontFamily:sans,fontSize:"0.6rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:4}}>TOTAL</p>
                    <span style={{fontFamily:serif,fontSize:"1.7rem",fontWeight:700,color:C.peach}}>₹{total}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:10,marginBottom:24}}>
                  <button onClick={handleAddToCart} style={{
                    flex:1,padding:"13px",borderRadius:100,
                    background:added?C.mint:(dark?C.apricot:C.hazelnut),
                    color:added?"#1A4A34":(dark?C.cocoa:C.crema),
                    border:"none",cursor:"pointer",
                    fontFamily:sans,fontWeight:700,fontSize:"0.82rem",letterSpacing:"0.05em",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    transition:"all 0.28s",boxShadow:added?"none":"0 6px 24px rgba(122,92,58,0.3)",
                  }}>
                    {added ? <><Check size={15}/>Added!</> : <><ShoppingCart size={15}/>Add to Cart</>}
                  </button>
                  <button onClick={handleWishlist} style={{
                    width:46,height:46,borderRadius:"50%",flexShrink:0,
                    background:liked?`${C.peach}18`:"transparent",
                    border:`1px solid ${liked?C.peach:border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                  }}>
                    <Heart size={17} fill={liked?C.peach:"none"} color={liked?C.peach:sub}/>
                  </button>
                  <button onClick={handleShare} style={{
                    width:46,height:46,borderRadius:"50%",flexShrink:0,
                    background:"transparent",border:`1px solid ${border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:sub,
                  }}>
                    {copied ? <Check size={16} color={C.mint}/> : <Share2 size={16}/>}
                  </button>
                </div>

                {/* Ingredients accordion */}
                <div style={{borderRadius:14,border:`1px solid ${border}`,marginBottom:16,overflow:"hidden"}}>
                  <button onClick={() => setIngredOpen(v => !v)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",background:sectionBg,border:"none",cursor:"pointer",color:text}}>
                    <span style={{fontFamily:sans,fontSize:"0.72rem",fontWeight:700,color:sub,letterSpacing:"0.15em"}}>INGREDIENTS</span>
                    {ingredOpen ? <ChevronUp size={14} color={sub}/> : <ChevronDown size={14} color={sub}/>}
                  </button>
                  {ingredOpen && (
                    <div style={{padding:"12px 16px 14px",background:cardBg}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {p.ingredients.map(ing=>(
                          <span key={ing} style={{fontFamily:sans,fontSize:"0.66rem",color:sub,background:sectionBg,border:`1px solid ${border}`,borderRadius:100,padding:"4px 11px"}}>
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Allergens */}
                {allergens && allergens.length > 0 && (
                  <div style={{padding:"10px 14px",borderRadius:12,background:`${C.apricot}15`,border:`1px solid ${C.apricot}40`,marginBottom:16}}>
                    <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:C.cocoa,letterSpacing:"0.15em",marginBottom:4}}>⚠ ALLERGENS</p>
                    <p style={{fontFamily:sans,fontSize:"0.7rem",color:dark?C.crema:C.cocoa,lineHeight:1.5}}>{allergens.join(", ")}</p>
                  </div>
                )}

                {/* Nutrition */}
                <div style={{borderRadius:14,border:`1px solid ${border}`,marginBottom:20,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",background:sectionBg}}>
                    <p style={{fontFamily:sans,fontSize:"0.72rem",fontWeight:700,color:sub,letterSpacing:"0.15em",marginBottom:10}}>NUTRITION (per serving)</p>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {[{label:"Calories",value:`${p.calories} kcal`},{label:"Serving",value:"1 piece"},{label:"Carbs",value:"~45g"},{label:"Protein",value:"~6g"},{label:"Fat",value:"~18g"}].map(n => (
                        <div key={n.label} style={{textAlign:"center"}}>
                          <p style={{fontFamily:serif,fontSize:"0.88rem",fontWeight:700,color:text}}>{n.value}</p>
                          <p style={{fontFamily:sans,fontSize:"0.58rem",color:sub,letterSpacing:"0.1em"}}>{n.label.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Frequently Bought Together */}
                {fbtProducts.length > 0 && (
                  <div style={{borderRadius:14,border:`1px solid ${border}`,marginBottom:20,padding:"14px 16px",background:sectionBg}}>
                    <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:12}}>FREQUENTLY BOUGHT TOGETHER</p>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {fbtProducts.map(fp => (
                        <label key={fp.id} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                          <input type="checkbox" checked={!!fbtChecked[fp.id]}
                            onChange={e => setFbtChecked(prev => ({...prev, [fp.id]: e.target.checked}))}
                            style={{accentColor:C.hazelnut,width:16,height:16}}
                          />
                          <img src={img(fp.imgId, 80, 60)} alt={fp.name} style={{width:48,height:36,borderRadius:8,objectFit:"cover"}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{fontFamily:sans,fontSize:"0.74rem",fontWeight:600,color:text,margin:0}}>{fp.name}</p>
                            <p style={{fontFamily:serif,fontSize:"0.72rem",fontWeight:700,color:C.peach,margin:0}}>+₹{fp.price}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Full-width bottom sections ── */}
            <div style={{padding: isMobile ? "0 20px 28px" : "0 32px 32px"}}>

              {/* Related Products */}
              {related.length > 0 && (
                <div style={{marginBottom:28}}>
                  <div style={{height:1,background:border,marginBottom:22}}/>
                  <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:14}}>YOU MIGHT ALSO LOVE</p>
                  <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6}}>
                    {related.map(r=>(
                      <button key={r.id} onClick={()=>onProduct(r)} style={{
                        flexShrink:0,width:110,background:"transparent",border:`1px solid ${border}`,
                        borderRadius:14,overflow:"hidden",cursor:"pointer",padding:0,
                        transition:"border-color 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.hazelnut)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                      >
                        <img src={img(r.imgId,140,100)} alt={r.name} style={{width:"100%",height:70,objectFit:"cover",display:"block"}}/>
                        <div style={{padding:"7px 8px"}}>
                          <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:600,color:text,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{r.name}</p>
                          <p style={{fontFamily:serif,fontSize:"0.72rem",fontWeight:700,color:C.peach,margin:0}}>₹{r.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Sellers Carousel */}
              {bestSellers.length > 0 && (
                <div style={{marginBottom:28}}>
                  <div style={{height:1,background:border,marginBottom:22}}/>
                  <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:14}}>BEST SELLERS</p>
                  <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6}}>
                    {bestSellers.map(r=>(
                      <button key={r.id} onClick={()=>onProduct(r)} style={{
                        flexShrink:0,width:110,background:"transparent",border:`1px solid ${border}`,
                        borderRadius:14,overflow:"hidden",cursor:"pointer",padding:0,
                        transition:"border-color 0.15s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.apricot)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                      >
                        <img src={img(r.imgId,140,100)} alt={r.name} style={{width:"100%",height:70,objectFit:"cover",display:"block"}}/>
                        <div style={{padding:"7px 8px"}}>
                          <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:600,color:text,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{r.name}</p>
                          <p style={{fontFamily:serif,fontSize:"0.72rem",fontWeight:700,color:C.peach,margin:0}}>₹{r.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div>
                <div style={{height:1,background:border,marginBottom:22}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
                  <div>
                    <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:sub,letterSpacing:"0.2em",marginBottom:4}}>CUSTOMER REVIEWS</p>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{display:"flex",gap:2}}>
                        {Array.from({length:5}).map((_,i)=><Star key={i} size={14} fill={i<Math.round(avgRating)?C.apricot:"none"} color={i<Math.round(avgRating)?C.apricot:C.shortbread}/>)}
                      </div>
                      <span style={{fontFamily:serif,fontSize:"1.1rem",fontWeight:700,color:text}}>{avgRating.toFixed(1)}</span>
                      <span style={{fontFamily:sans,fontSize:"0.72rem",color:sub}}>({reviews.length} reviews)</span>
                    </div>
                  </div>
                  {/* Sort */}
                  <select value={reviewSort} onChange={e => setReviewSort(e.target.value as ReviewSort)}
                    style={{fontFamily:sans,fontSize:"0.72rem",color:text,background:sectionBg,border:`1px solid ${border}`,borderRadius:8,padding:"6px 10px",outline:"none",cursor:"pointer"}}>
                    <option value="newest">Newest First</option>
                    <option value="highest">Highest Rated</option>
                    <option value="verified">Verified Purchase</option>
                  </select>
                </div>

                {/* Write review */}
                <div style={{borderRadius:16,border:`1px solid ${border}`,padding:"16px",marginBottom:20,background:sectionBg}}>
                  <p style={{fontFamily:sans,fontSize:"0.68rem",fontWeight:700,color:sub,letterSpacing:"0.15em",marginBottom:10}}>WRITE A REVIEW</p>
                  <StarInput value={reviewRating} onChange={setReviewRating}/>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder={user ? "Share your experience with this product…" : "Sign in to leave a review"}
                    disabled={!user}
                    rows={3}
                    style={{
                      width:"100%",marginTop:10,padding:"10px 12px",borderRadius:10,
                      background:cardBg,border:`1px solid ${border}`,
                      fontFamily:sans,fontSize:"0.78rem",color:text,
                      outline:"none",resize:"vertical",boxSizing:"border-box",
                      opacity:user?1:0.5,
                    }}
                  />
                  <button onClick={handleSubmitReview} disabled={!user} style={{
                    marginTop:10,padding:"9px 20px",borderRadius:100,
                    background:user?C.hazelnut:"rgba(122,92,58,0.3)",
                    color:C.crema,border:"none",cursor:user?"pointer":"not-allowed",
                    fontFamily:sans,fontWeight:700,fontSize:"0.76rem",
                  }}>
                    {user ? "Submit Review" : "Sign In to Review"}
                  </button>
                </div>

                {/* Review list */}
                {reviews.length === 0 ? (
                  <p style={{fontFamily:sans,fontSize:"0.8rem",color:sub,opacity:0.6,textAlign:"center",padding:"20px 0"}}>No reviews yet. Be the first!</p>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {reviews.map(r => (
                      <div key={r.id} style={{borderRadius:14,border:`1px solid ${border}`,padding:"14px 16px",background:sectionBg}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:C.hazelnut,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontFamily:sans,fontSize:"0.65rem",fontWeight:700,color:C.crema}}>{r.userInitials}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontFamily:sans,fontSize:"0.74rem",fontWeight:600,color:text}}>{r.userName}</span>
                              {r.isVerified && (
                                <span style={{fontFamily:sans,fontSize:"0.58rem",color:C.mint,background:`${C.mint}20`,border:`1px solid ${C.mint}44`,borderRadius:100,padding:"1px 7px"}}>✓ Verified</span>
                              )}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{display:"flex",gap:2}}>
                                {Array.from({length:5}).map((_,i)=><Star key={i} size={10} fill={i<r.rating?C.apricot:"none"} color={i<r.rating?C.apricot:C.shortbread}/>)}
                              </div>
                              <span style={{fontFamily:sans,fontSize:"0.62rem",color:sub,opacity:0.7}}>{r.date}</span>
                            </div>
                          </div>
                          <button onClick={() => likeReview(r.id, userId)}
                            style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",color:sub,flexShrink:0}}>
                            <ThumbsUp size={13}/> <span style={{fontFamily:sans,fontSize:"0.66rem"}}>{r.likes}</span>
                          </button>
                        </div>
                        <p style={{fontFamily:sans,fontSize:"0.78rem",color:sub,lineHeight:1.7,margin:0}}>{r.text}</p>
                        {r.ownerReply && (
                          <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:dark?"rgba(255,255,255,0.04)":C.crema,border:`1px solid ${border}`}}>
                            <p style={{fontFamily:sans,fontSize:"0.62rem",fontWeight:700,color:C.hazelnut,marginBottom:4}}>Owner Reply:</p>
                            <p style={{fontFamily:sans,fontSize:"0.74rem",color:sub,margin:0,lineHeight:1.6}}>{r.ownerReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
