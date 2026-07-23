import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Bookmark, Home, Briefcase, Star, Trash2, Loader2 } from "lucide-react";

const C = { crema:"#FAF6F0", oats:"#F2EBE0", apricot:"#FFBC8A", peach:"#F4956A", cocoa:"#4A3728", hazelnut:"#7A5C3A", shortbread:"#E0CEB4", mint:"#9DD4B8" };
const sans  = "'Poppins', system-ui, sans-serif";

// Fix default marker icon paths (Vite bundling breaks leaflet's relative asset URLs)
const pinIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 29 17 29s17-17 17-29C34 7.6 26.4 0 17 0z" fill="#7A5C3A"/>
      <circle cx="17" cy="17" r="7" fill="#FAF6F0"/>
    </svg>`),
  iconSize: [34, 46],
  iconAnchor: [17, 46],
});

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  country: string;
  lat: number;
  lng: number;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

const SAVED_KEY = "ww_saved_addresses";

export function loadSavedAddresses(): SavedAddress[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function persistSaved(list: SavedAddress[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom(), { animate: true }); }, [lat, lng]);
  return null;
}

interface Props {
  dark: boolean;
  value: { line1: string; line2: string; city: string; postcode: string; country: string; lat?: number; lng?: number };
  onChange: (v: { line1: string; line2: string; city: string; postcode: string; country: string; lat?: number; lng?: number }) => void;
}

const labelIcons: Record<string, any> = { Home, Work: Briefcase, Other: Star };

export function AddressMapPicker({ dark, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: value.lat ?? 48.8566, lng: value.lng ?? 2.3522 });
  const [saved, setSaved] = useState<SavedAddress[]>(() => loadSavedAddresses());
  const [labelPrompt, setLabelPrompt] = useState(false);
  const [newLabel, setNewLabel] = useState("Home");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const text = dark ? C.crema : C.cocoa;
  const sub  = dark ? C.shortbread : C.hazelnut;
  const border = dark ? "rgba(255,255,255,0.1)" : C.shortbread;
  const bgField = dark ? "rgba(255,255,255,0.06)" : C.oats;

  const runSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim() || q.trim().length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`, {
          headers: { "Accept-Language": "en" },
        });
        const data: GeoResult[] = await resp.json();
        setResults(data);
      } catch { setResults([]); }
      setSearching(false);
    }, 450);
  };

  const applyGeoResult = (r: GeoResult) => {
    const a = r.address || {};
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon);
    const line1 = [a.house_number, a.road].filter(Boolean).join(" ") || r.display_name.split(",")[0];
    onChange({
      line1,
      line2: value.line2,
      city: a.city || a.town || a.village || a.municipality || "",
      postcode: a.postcode || "",
      country: a.country || "",
      lat, lng,
    });
    setCenter({ lat, lng });
    setQuery(r.display_name);
    setResults([]);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setCenter({ lat, lng });
    onChange({ ...value, lat, lng });
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
      const r: GeoResult = await resp.json();
      const a = r.address || {};
      const line1 = [a.house_number, a.road].filter(Boolean).join(" ") || r.display_name?.split(",")[0] || "";
      onChange({
        line1, line2: value.line2,
        city: a.city || a.town || a.village || a.municipality || "",
        postcode: a.postcode || "", country: a.country || "",
        lat, lng,
      });
      setQuery(r.display_name || "");
    } catch { /* keep manual pin only */ }
  };

  const saveCurrentAddress = () => {
    if (!value.line1 || value.lat === undefined) return;
    setLabelPrompt(true);
  };

  const confirmSaveLabel = () => {
    const entry: SavedAddress = {
      id: `addr-${Date.now()}`, label: newLabel,
      line1: value.line1, line2: value.line2, city: value.city, postcode: value.postcode, country: value.country,
      lat: value.lat!, lng: value.lng!,
    };
    const next = [...saved.filter(s => s.label !== newLabel), entry];
    setSaved(next); persistSaved(next);
    setLabelPrompt(false);
  };

  const applySaved = (a: SavedAddress) => {
    onChange({ line1: a.line1, line2: a.line2, city: a.city, postcode: a.postcode, country: a.country, lat: a.lat, lng: a.lng });
    setCenter({ lat: a.lat, lng: a.lng });
    setQuery(`${a.line1}, ${a.city}`);
  };

  const removeSaved = (id: string) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next); persistSaved(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Saved addresses */}
      {saved.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {saved.map(a => {
            const Icon = labelIcons[a.label] || Bookmark;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px 7px 12px", borderRadius: 100, background: bgField, border: `1px solid ${border}` }}>
                <button onClick={() => applySaved(a)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: sans, fontSize: "0.72rem", fontWeight: 600, color: text }}>
                  <Icon size={12} color={C.hazelnut} /> {a.label}
                </button>
                <button onClick={() => removeSaved(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: sub, display: "flex", opacity: 0.6 }}>
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search box */}
      <div style={{ position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: sub, opacity: 0.5 }} />
        <input
          value={query}
          onChange={e => runSearch(e.target.value)}
          placeholder="Search your address…"
          style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12, background: bgField, border: `1px solid ${border}`, fontFamily: sans, fontSize: "0.84rem", color: text, outline: "none", boxSizing: "border-box" }}
        />
        {searching && <Loader2 size={14} className="animate-spin" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: sub }} />}
        {results.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: dark ? "#221609" : "#fff", border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", zIndex: 30, boxShadow: "0 12px 30px rgba(0,0,0,0.2)" }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => applyGeoResult(r)} style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: i < results.length - 1 ? `1px solid ${border}` : "none", cursor: "pointer", textAlign: "left" }}>
                <MapPin size={13} color={C.hazelnut} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: sans, fontSize: "0.76rem", color: text, lineHeight: 1.4 }}>{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${border}`, height: 220 }}>
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom={true}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[center.lat, center.lng]} icon={pinIcon} draggable
            eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); reverseGeocode(p.lat, p.lng); } }} />
          <ClickHandler onPick={reverseGeocode} />
          <Recenter lat={center.lat} lng={center.lng} />
        </MapContainer>
      </div>
      <p style={{ fontFamily: sans, fontSize: "0.66rem", color: sub, opacity: 0.6, marginTop: -4 }}>
        Click the map or drag the pin to set your exact delivery location.
      </p>

      {/* Save button */}
      {value.line1 && value.lat !== undefined && (
        <div>
          {!labelPrompt ? (
            <button onClick={saveCurrentAddress} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${border}`, borderRadius: 100, padding: "8px 16px", cursor: "pointer", fontFamily: sans, fontSize: "0.72rem", fontWeight: 600, color: C.hazelnut }}>
              <Bookmark size={12} /> Save this address
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${border}`, background: bgField, color: text, fontFamily: sans, fontSize: "0.76rem" }}>
                {["Home", "Work", "Other"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={confirmSaveLabel} style={{ padding: "8px 16px", borderRadius: 10, background: C.hazelnut, color: "#fff", border: "none", cursor: "pointer", fontFamily: sans, fontSize: "0.74rem", fontWeight: 600 }}>Save</button>
              <button onClick={() => setLabelPrompt(false)} style={{ padding: "8px 12px", borderRadius: 10, background: "none", border: `1px solid ${border}`, color: sub, cursor: "pointer", fontFamily: sans, fontSize: "0.74rem" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
