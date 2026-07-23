import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

import ambienceUrl from "../../assets/audio/bakery-ambience.mp3";
import clickUrl from "../../assets/audio/sfx-click.mp3";
import hoverUrl from "../../assets/audio/sfx-hover.mp3";
import cartUrl from "../../assets/audio/sfx-cart.mp3";
import wishlistUrl from "../../assets/audio/sfx-wishlist.mp3";
import checkoutUrl from "../../assets/audio/sfx-checkout.mp3";
import doorbellUrl from "../../assets/audio/sfx-doorbell.mp3";
import cakeCompleteUrl from "../../assets/audio/sfx-cake-complete.mp3";

export type SfxName = "click" | "hover" | "cart" | "wishlist" | "checkout" | "doorbell" | "cakeComplete";

const SFX_URLS: Record<SfxName, string> = {
  click: clickUrl,
  hover: hoverUrl,
  cart: cartUrl,
  wishlist: wishlistUrl,
  checkout: checkoutUrl,
  doorbell: doorbellUrl,
  cakeComplete: cakeCompleteUrl,
};

const STORAGE_KEY = "ww_sound_prefs";

interface SoundCtx {
  musicOn:    boolean;
  volume:     number;
  sfxOn:      boolean;
  toggleMusic: () => void;
  setVolume:   (v: number) => void;
  toggleSfx:   () => void;
  playSfx:     (name: SfxName) => void;
}

const Ctx = createContext<SoundCtx | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  })();

  const [musicOn, setMusicOn] = useState<boolean>(Boolean(stored.musicOn) || false);
  const [volume, setVolumeState] = useState<number>(typeof stored.volume === "number" ? stored.volume : 0.35);
  const [sfxOn, setSfxOn] = useState<boolean>(stored.sfxOn !== false);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const sfxCache = useRef<Map<SfxName, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const el = new Audio(ambienceUrl);
    el.loop = true;
    el.volume = volume;
    ambienceRef.current = el;
    return () => { el.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ambienceRef.current) ambienceRef.current.volume = volume;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ musicOn, volume, sfxOn }));
  }, [volume, musicOn, sfxOn]);

  useEffect(() => {
    const el = ambienceRef.current;
    if (!el) return;
    if (musicOn) {
      el.play().catch(() => { /* user hasn't interacted yet — ignore */ });
    } else {
      el.pause();
    }
  }, [musicOn]);

  const toggleMusic = useCallback(() => setMusicOn(v => !v), []);
  const setVolume = useCallback((v: number) => setVolumeState(Math.min(1, Math.max(0, v))), []);
  const toggleSfx = useCallback(() => setSfxOn(v => !v), []);

  const playSfx = useCallback((name: SfxName) => {
    if (!sfxOn) return;
    let el = sfxCache.current.get(name);
    if (!el) {
      el = new Audio(SFX_URLS[name]);
      sfxCache.current.set(name, el);
    }
    el.volume = Math.min(1, volume + 0.25);
    el.currentTime = 0;
    el.play().catch(() => { /* ignore autoplay restrictions */ });
  }, [sfxOn, volume]);

  return (
    <Ctx.Provider value={{ musicOn, volume, sfxOn, toggleMusic, setVolume, toggleSfx, playSfx }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSound() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
