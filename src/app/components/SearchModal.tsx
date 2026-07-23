import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Clock, Star, ShoppingCart, SlidersHorizontal, ChevronDown, ChevronUp, Check } from "lucide-react";
import { type Product } from "../data/products";
import { useProductStore } from "../contexts/ProductStoreContext";
import { useCart } from "../contexts/CartContext";
import { useToast } from "../contexts/ToastContext";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8", lilac:"#C9B4E8" };
const sans  = "'Poppins', system-ui, sans-serif";
const serif = "'Playfair Display', Georgia, serif";
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=80&h=80&fit=crop&auto=format&q=80`;

const ALL_CATEGORIES = [
  "Birthday Cakes","Wedding Cakes","Chocolate Cakes","Strawberry Cakes",
  "Cheesecakes","Cupcakes","Donuts","Cookies","Croissants","Macarons",
  "Coffee","Tea","Bread","Pastries","Seasonal Specials","Gift Boxes",
  "Cakes","Muffins","Brownies",
];
const TRENDING_TAGS = ["Birthday","Wedding","Chocolate","Eggless","Bestseller"];
const RECENT_KEY = "ww_recent_searches";
type SortOption = "relevance" | "price_asc" | "price_desc" | "top_rated" | "newest";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5); } catch { return []; }
}
function addRecent(q: string) {
  const prev = getRecent().filter(s => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 5)));
}

interface Props { open: boolean; onClose: () => void; dark: boolean; onProduct: (p: Product) => void; }

export function SearchModal({ open, onClose, dark, onProduct }: Props) {
  const { products } = useProductStore();
  const { add } = useCart();
  const { toast } = useToast();

  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<Product[]>([]);
  const [recent,      setRecent]      = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort,        setSort]        = useState<SortOption>("relevance");

  // Filters
  const [selCats,   setSelCats]   = useState<string[]>([]);
  const [dietary,   setDietary]   = useState<{ eggless:boolean; vegetarian:boolean; premium:boolean }>({ eggless:false, vegetarian:false, premium:false });
  const [types,     setTypes]     = useState<{ bestSeller:boolean; newArrival:boolean; seasonal:boolean; featured:boolean }>({ bestSeller:false, newArrival:false, seasonal:false, featured:false });
  const [priceRange, setPriceRange] = useState<string>("any");
  const [minRating,  setMinRating] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setRecent(getRecent()); setTimeout(() => inputRef.current?.focus(), 120); }
  }, [open]);

  const filterCount = selCats.length
    + (dietary.eggless?1:0) + (dietary.vegetarian?1:0) + (dietary.premium?1:0)
    + (types.bestSeller?1:0) + (types.newArrival?1:0) + (types.seasonal?1:0) + (types.featured?1:0)
    + (priceRange !== "any" ? 1 : 0)
    + (minRating > 0 ? 1 : 0);

  const clearAll = () => {
    setSelCats([]); setDietary({eggless:false,vegetarian:false,premium:false});
    setTypes({bestSeller:false,newArrival:false,seasonal:false,featured:false});
    setPriceRange("any"); setMinRating(0); setSort("relevance");
  };

  useEffect(() => {
    const lower = query.trim().toLowerCase();
    let r = products.filter(p => {
      if (lower) {
        const inName  = p.name.toLowerCase().includes(lower);
        const inCat   = p.category.toLowerCase().includes(lower);
        const inDesc  = (p.desc + " " + p.longDesc).toLowerCase().includes(lower);
        const inIngr  = p.ingredients.some(i => i.toLowerCase().includes(lower));
        const inTags  = ((p as any).tags ?? []).some((t: string) => t.toLowerCase().includes(lower));
        if (!inName && !inCat && !inDesc && !inIngr && !inTags) return false;
      }
      if (selCats.length && !selCats.includes(p.category)) return false;
      if (dietary.eggless && !(p as any).isEggless) return false;
      if (dietary.vegetarian && !(p as any).isVegetarian) return false;
      if (dietary.premium && !(p as any).isPremium) return false;
      if (types.bestSeller && !p.isBestSeller) return false;
      if (types.newArrival && !p.isNew) return false;
      if (types.featured && !p.isFeatured) return false;
      if (types.seasonal && p.category !== "Seasonal Specials") return false;
      if (priceRange === "under500" && p.price >= 500) return false;
      if (priceRange === "500_1000" && (p.price < 500 || p.price > 1000)) return false;
      if (priceRange === "1000_2000" && (p.price < 1000 || p.price > 2000)) return false;
      if (priceRange === "above2000" && p.price <= 2000) return false;
      if (minRating > 0 && p.rating < minRating) return false;
      return true;
    });

    // Sort
    if (sort === "price_asc")   r = [...r].sort((a,b) => a.price - b.price);
    else if (sort === "price_desc") r = [...r].sort((a,b) => b.price - a.price);
    else if (sort === "top_rated")  r = [...r].sort((a,b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    else if (sort === "newest")     r = [...r].sort((a,b) => (b.isNew?1:0) - (a.isNew?1:0));

    setResults(r);
  }, [query, selCats, dietary, types, priceRange, minRating, sort, products]);

  const handleClose = () => { setQuery(""); onClose(); };
  const handleSelect = (p: Product) => {
    if (query.trim()) { addRecent(query.trim()); setRecent(getRecent()); }
    handleClose(); onProduct(p);
  };
  const handleAddToCart = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    add({ productId:p.id, name:p.name, price:p.price, qty:1, imgId:p.imgId, size:"Standard", category:p.category });
    toast(`${p.name} added to cart! 🛒`, "success");
  };
  const handleTag = (tag: string) => { setQuery(tag); addRecent(tag); setRecent(getRecent()); };
  const toggleCat = (cat: string) => setSelCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const bg     = dark ? "rgba(18,10,4,0.98)" : "rgba(250,246,240,0.98)";
  const border = dark ? "rgba(255,255,255,0.07)" : C.shortbread;
  const text   = dark ? C.crema : C.cocoa;
  const sub    = dark ? C.shortbread : C.hazelnut;
  const sectionBg = dark ? "rgba(255,255,255,0.04)" : C.oats;

  const shown = results.slice(0, query.trim() || filterCount > 0 ? 50 : 8);

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="search-overlay"
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          transition={{ duration:0.22 }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", zIndex:400, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px 24px" }}
        >
          <motion.div
            initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
            transition={{ duration:0.26, ease:[0.16,1,0.3,1] }}
            style={{ width:"min(760px, 96vw)", maxHeight:"90vh", background:bg, borderRadius:24, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 32px 100px rgba(0,0,0,0.45)" }}
          >
            {/* Search bar */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"20px 20px 16px", borderBottom:`1px solid ${border}`, flexShrink:0 }}>
              <Search size={20} color={sub} style={{ flexShrink:0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && query.trim()) { addRecent(query.trim()); setRecent(getRecent()); } }}
                placeholder="Search cakes, pastries, macarons…"
                style={{
                  flex:1, background:"none", border:"none", outline:"none",
                  fontFamily:serif, fontSize:"clamp(1.1rem, 3vw, 1.6rem)", color:text,
                  caretColor:C.hazelnut, minWidth:0,
                }}
              />
              {/* Filter toggle */}
              <button onClick={() => setFiltersOpen(v => !v)}
                style={{ position:"relative", display:"flex", alignItems:"center", gap:6, background:filtersOpen?C.hazelnut:sectionBg, border:`1px solid ${filtersOpen?"transparent":border}`, borderRadius:100, padding:"8px 14px", cursor:"pointer", color:filtersOpen?C.crema:sub, flexShrink:0 }}>
                <SlidersHorizontal size={14}/>
                <span style={{ fontFamily:sans, fontSize:"0.72rem", fontWeight:600 }}>Filters</span>
                {filterCount > 0 && (
                  <span style={{ position:"absolute", top:-6, right:-6, width:18, height:18, borderRadius:"50%", background:C.peach, color:"#fff", fontFamily:sans, fontSize:"0.6rem", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{filterCount}</span>
                )}
              </button>
              <button onClick={handleClose}
                style={{ background:"none", border:"none", cursor:"pointer", color:sub, display:"flex", flexShrink:0 }}>
                <X size={22} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {/* Filter Panel */}
              <AnimatePresence>
                {filtersOpen && (
                  <motion.div key="filters"
                    initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
                    transition={{ duration:0.25 }}
                    style={{ overflow:"hidden", borderBottom:`1px solid ${border}` }}
                  >
                    <div style={{ padding:"16px 20px", background:sectionBg }}>
                      {/* Sort */}
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>SORT BY</p>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {([["relevance","Relevance"],["price_asc","Price ↑"],["price_desc","Price ↓"],["top_rated","Top Rated"],["newest","Newest"]] as [SortOption, string][]).map(([v,l]) => (
                            <button key={v} onClick={() => setSort(v)} style={{ padding:"6px 14px", borderRadius:100, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, background:sort===v?C.hazelnut:"transparent", color:sort===v?C.crema:sub, border:`1px solid ${sort===v?"transparent":border}`, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category */}
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>CATEGORY</p>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {ALL_CATEGORIES.map(c => (
                            <button key={c} onClick={() => toggleCat(c)} style={{ padding:"5px 12px", borderRadius:100, fontFamily:sans, fontSize:"0.68rem", fontWeight:600, background:selCats.includes(c)?C.hazelnut:"transparent", color:selCats.includes(c)?C.crema:sub, border:`1px solid ${selCats.includes(c)?"transparent":border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                              {selCats.includes(c) && <Check size={10}/>} {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dietary */}
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>DIETARY</p>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {([["eggless","🥚 Eggless"],["vegetarian","🌿 Vegetarian"],["premium","👑 Premium"]] as [keyof typeof dietary, string][]).map(([k,l]) => (
                            <button key={k} onClick={() => setDietary(p => ({...p, [k]: !p[k]}))} style={{ padding:"6px 14px", borderRadius:100, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, background:dietary[k]?C.mint:"transparent", color:dietary[k]?"#1A4A34":sub, border:`1px solid ${dietary[k]?C.mint:border}`, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Type */}
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>TYPE</p>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {([["bestSeller","⭐ Best Seller"],["newArrival","✨ New Arrival"],["seasonal","🍂 Seasonal"],["featured","💎 Featured"]] as [keyof typeof types, string][]).map(([k,l]) => (
                            <button key={k} onClick={() => setTypes(t => ({...t, [k]: !t[k]}))} style={{ padding:"6px 14px", borderRadius:100, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, background:types[k]?C.apricot:"transparent", color:types[k]?C.cocoa:sub, border:`1px solid ${types[k]?C.apricot:border}`, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>PRICE</p>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {([["any","Any"],["under500","Under ₹500"],["500_1000","₹500–₹1000"],["1000_2000","₹1000–₹2000"],["above2000","Above ₹2000"]] as [string,string][]).map(([v,l]) => (
                            <button key={v} onClick={() => setPriceRange(v)} style={{ padding:"6px 14px", borderRadius:100, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, background:priceRange===v?C.hazelnut:"transparent", color:priceRange===v?C.crema:sub, border:`1px solid ${priceRange===v?"transparent":border}`, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rating */}
                      <div style={{ marginBottom:8 }}>
                        <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.2em", marginBottom:8 }}>MIN RATING</p>
                        <div style={{ display:"flex", gap:8 }}>
                          {[[0,"Any"],[3,"3+"],[4,"4+"],[5,"5 ★"]] .map(([v,l]) => (
                            <button key={v} onClick={() => setMinRating(Number(v))} style={{ padding:"6px 14px", borderRadius:100, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, background:minRating===Number(v)?C.apricot:"transparent", color:minRating===Number(v)?C.cocoa:sub, border:`1px solid ${minRating===Number(v)?C.apricot:border}`, cursor:"pointer" }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filterCount > 0 && (
                        <button onClick={clearAll} style={{ marginTop:12, fontFamily:sans, fontSize:"0.72rem", fontWeight:600, color:C.peach, background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:0 }}>
                          Clear all filters ({filterCount})
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content */}
              <div style={{ padding:"16px 20px 32px" }}>
                {/* Trending tags */}
                {!query && (
                  <div style={{ marginBottom:18 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.25em", marginBottom:10 }}>TRENDING</p>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {TRENDING_TAGS.map(t => (
                        <button key={t} onClick={() => handleTag(t)} style={{ padding:"6px 16px", borderRadius:100, fontFamily:sans, fontSize:"0.74rem", fontWeight:600, background:`${C.apricot}22`, color:C.cocoa, border:`1px solid ${C.apricot}55`, cursor:"pointer" }}>
                          #{t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent searches */}
                {!query && recent.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <p style={{ fontFamily:sans, fontSize:"0.6rem", fontWeight:700, color:sub, letterSpacing:"0.25em", marginBottom:10 }}>RECENT</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {recent.map(r => (
                        <button key={r} onClick={() => { setQuery(r); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:100, background:"transparent", border:`1px solid ${border}`, fontFamily:sans, fontSize:"0.74rem", color:sub, cursor:"pointer" }}>
                          <Clock size={11} /> {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {(query.trim() || filterCount > 0) && results.length === 0 && (
                  <div style={{ textAlign:"center", padding:"48px 0", opacity:0.55 }}>
                    <Search size={36} color={sub} strokeWidth={1} style={{ display:"block", margin:"0 auto 14px" }} />
                    <p style={{ fontFamily:serif, fontSize:"1.1rem", color:text, marginBottom:8 }}>No results found</p>
                    <p style={{ fontFamily:sans, fontSize:"0.78rem", color:sub }}>Try different search terms or adjust your filters.</p>
                    {filterCount > 0 && <button onClick={clearAll} style={{ marginTop:12, fontFamily:sans, fontSize:"0.78rem", fontWeight:600, color:C.hazelnut, background:"none", border:`1px solid ${C.hazelnut}55`, borderRadius:100, padding:"8px 20px", cursor:"pointer" }}>Clear Filters</button>}
                  </div>
                )}

                {/* Results header */}
                {shown.length > 0 && (
                  <p style={{ fontFamily:sans, fontSize:"0.62rem", fontWeight:700, color:sub, letterSpacing:"0.25em", marginBottom:14 }}>
                    {query.trim() || filterCount > 0
                      ? `${results.length} RESULT${results.length !== 1 ? "S" : ""}`
                      : "FEATURED"}
                  </p>
                )}

                {/* Results list */}
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <AnimatePresence>
                    {shown.map((p, i) => (
                      <motion.div key={p.id}
                        initial={{ opacity:0, y:10 }}
                        animate={{ opacity:1, y:0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                        onClick={() => handleSelect(p)}
                        style={{
                          display:"flex", alignItems:"center", gap:14, padding:"12px 14px", borderRadius:16,
                          background:"transparent", border:`1px solid ${border}`, cursor:"pointer",
                          transition:"background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = dark?"rgba(255,255,255,0.04)":C.oats)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <img src={img(p.imgId)} alt={p.name} style={{ width:52, height:52, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontFamily:serif, fontSize:"0.92rem", fontWeight:700, color:text, marginBottom:3 }}>{p.name}</p>
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:sans, fontSize:"0.64rem", color:sub, background:`${C.hazelnut}15`, padding:"2px 8px", borderRadius:100 }}>{p.category}</span>
                            <div style={{ display:"flex", gap:2 }}>
                              {Array.from({length:5}).map((_,j) => <Star key={j} size={9} fill={j<p.rating?C.apricot:"none"} color={j<p.rating?C.apricot:C.shortbread} />)}
                            </div>
                            {p.isBestSeller && <span style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:600, color:C.cocoa, background:`${C.apricot}40`, borderRadius:100, padding:"1px 7px" }}>Bestseller</span>}
                            {p.isNew && <span style={{ fontFamily:sans, fontSize:"0.58rem", fontWeight:600, color:"#1A4A34", background:`${C.mint}30`, borderRadius:100, padding:"1px 7px" }}>New</span>}
                          </div>
                        </div>
                        <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontFamily:serif, fontSize:"0.95rem", fontWeight:700, color:C.peach }}>₹{p.price}</span>
                          <button onClick={e => handleAddToCart(e, p)}
                            style={{ width:32, height:32, borderRadius:"50%", background:C.hazelnut, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                            <ShoppingCart size={13} color={C.crema}/>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
