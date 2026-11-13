import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.jsx';

// One shared fetch of the ad settings (set in Admin → Code injection → Ad slots).
let adsPromise;
const loadAds = () => (adsPromise ||= api.get('/site-code').then((c) => c?.ads || null).catch(() => null));
const inFrame = () => { try { return window.parent !== window; } catch { return true; } };

function ensureLoader(client) {
  if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
  const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`; document.head.appendChild(s);
}

/** A display ad. `place` = 'top' | 'article' | 'bottom' (slot IDs come from the admin) or pass `slot` directly. Re-created on every page change. */
export function AdSlot({ place, slot: slotProp, style }) {
  const { pathname } = useLocation();
  const box = useRef(null);
  useEffect(() => {
    if (inFrame()) return undefined;
    let alive = true;
    loadAds().then((ads) => {
      const slot = slotProp || ads?.[place]; const client = ads?.client;
      if (!alive || !ads?.enabled || !client || !slot || !box.current) return;
      ensureLoader(client);
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle'; ins.style.display = 'block';
      ins.setAttribute('data-ad-client', client); ins.setAttribute('data-ad-slot', slot);
      ins.setAttribute('data-ad-format', 'auto'); ins.setAttribute('data-full-width-responsive', 'true');
      box.current.replaceChildren(ins); box.current.hidden = false;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked by an ad blocker */ }
    });
    return () => { alive = false; box.current?.replaceChildren(); if (box.current) box.current.hidden = true; };
  }, [pathname, place, slotProp]);
  return <div ref={box} className="ad-slot" hidden style={style} aria-label="Advertisement" />;
}
export default AdSlot;
