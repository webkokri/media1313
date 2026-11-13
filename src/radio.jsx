import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useContent } from './content.jsx';
import { Equalizer, PauseIcon, PlayIcon } from './components/ui.jsx';

/**
 * One shared radio player for the whole site, so the stream keeps playing while visitors browse.
 * The stream link is set in the admin (Site content → Banner & radio stream). It can be a live
 * MP3 / AAC / Ogg stream (Icecast, Shoutcast, Radio.co, Zeno… ) or an HLS (.m3u8) link.
 */
const RadioCtx = createContext(null);
export const useRadio = () => useContext(RadioCtx);
const PREF = 'm1313_radio';                                   // '' = play on every page · 'paused' = visitor paused it · 'closed' = visitor closed the bar
const getPref = () => { try { return localStorage.getItem(PREF) || ''; } catch { return ''; } };
const setPref = (v) => { try { v ? localStorage.setItem(PREF, v) : localStorage.removeItem(PREF); } catch { /* private mode */ } };
const isHls = (u) => /\.m3u8(\?|#|$)/i.test(u);

export function RadioProvider({ children }) {
  const { SITE = {}, NOW_ON_RADIO = {} } = useContent() || {};
  const url = (SITE.radioStreamUrl || '').trim();
  const audio = useRef(null);
  const hls = useRef(null);
  const [status, setStatus] = useState('idle');           // idle | loading | playing | paused | error
  const [error, setError] = useState('');
  const [volume, setVolumeState] = useState(() => { try { return Number(localStorage.getItem('m1313_vol') ?? 80); } catch { return 80; } });
  const [blocked, setBlocked] = useState(false);          // the browser refused to autoplay — it will start on the visitor's first tap
  const [started, setStarted] = useState(false);          // show the mini player once someone has pressed play

  const el = () => { if (!audio.current && typeof Audio !== 'undefined') { audio.current = new Audio(); audio.current.preload = 'none'; audio.current.volume = volume / 100; } return audio.current; };
  const teardown = useCallback(() => { if (hls.current) { hls.current.destroy(); hls.current = null; } const a = audio.current; if (a) { a.pause(); a.removeAttribute('src'); a.load(); } }, []);
  const fail = useCallback((m) => { teardown(); setError(m); setStatus('error'); }, [teardown]);

  const start = useCallback(async (opts) => {
    const auto = opts?.auto === true;
    const a = el(); if (!a) return;
    if (!auto) { setPref(''); }
    setBlocked(false);
    if (!url) { setStarted(true); fail('The live radio stream will be available soon.'); return; }
    setStarted(true); setError(''); setStatus('loading'); teardown();
    const offline = () => (/^http:/i.test(url) && location.protocol === 'https:' ? 'This stream link starts with http:// — it must be https:// to play on this secure site.' : 'The radio stream is offline or the link can’t be played right now.');
    try {
      if (isHls(url)) {
        const { default: Hls } = await import('hls.js');
        if (Hls.isSupported()) {
          hls.current = new Hls({ lowLatencyMode: true });
          hls.current.loadSource(url); hls.current.attachMedia(a);
          hls.current.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) { if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.current.recoverMediaError(); else fail(offline()); } });
        } else a.src = url;                                  // iPhone: native HLS
      } else a.src = url;                                    // MP3 / AAC / Ogg live streams play natively
      await a.play();
    } catch (e) {
      if (e?.name === 'AbortError') return;                  // a newer start replaced this one
      if (e?.name === 'NotAllowedError' && auto) { teardown(); setStatus('paused'); setBlocked(true); return; }   // autoplay refused: wait for a tap
      fail(e?.name === 'NotAllowedError' ? 'Tap play again to start the radio.' : offline());
    }
  }, [url, fail, teardown]);

  const pause = useCallback(() => { setPref('paused'); setBlocked(false); teardown(); setStatus('paused'); }, [teardown]);   // stopping the connection means resuming rejoins the live edge
  const toggle = useCallback(() => { (status === 'playing' || status === 'loading') ? pause() : start(); }, [status, pause, start]);
  const stop = useCallback(() => { teardown(); setStatus('idle'); setStarted(false); setError(''); setBlocked(false); }, [teardown]);
  const close = useCallback(() => { setPref('closed'); stop(); }, [stop]);
  const setVolume = useCallback((v) => { setVolumeState(v); if (audio.current) audio.current.volume = v / 100; try { localStorage.setItem('m1313_vol', String(v)); } catch { /* ignore */ } }, []);

  useEffect(() => {
    const a = el(); if (!a) return undefined;
    const on = { playing: () => setStatus('playing'), waiting: () => setStatus((s) => (s === 'playing' ? 'loading' : s)), error: () => { if (a.getAttribute('src')) fail('The radio stream is offline or the link can’t be played right now.'); } };
    for (const [k, f] of Object.entries(on)) a.addEventListener(k, f);
    return () => { for (const [k, f] of Object.entries(on)) a.removeEventListener(k, f); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fail]);
  useEffect(() => { if (status !== 'idle') stop(); /* the stream link changed in the admin */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Play on every page: the radio starts as soon as the site opens (or on the first tap if the browser blocks autoplay)
  // and keeps playing while visitors move between pages, until they pause or close it.
  useEffect(() => {
    if (!url || window.parent !== window || /^\/(admin|__pb)/.test(location.pathname)) return undefined;
    const pref = getPref(); if (pref === 'closed') return undefined;
    setStarted(true);
    if (pref === 'paused') { setStatus('paused'); return undefined; }
    let armed = false;
    const kick = (e) => { if (e?.target?.closest?.('[data-no-radio-kick]')) return; disarm(); start({ auto: true }); };
    const disarm = () => { if (!armed) return; armed = false; for (const k of ['click', 'keydown', 'touchend']) window.removeEventListener(k, kick, true); };
    armed = true; for (const k of ['click', 'keydown', 'touchend']) window.addEventListener(k, kick, true);
    start({ auto: true }).then(() => { if (!audio.current?.paused) disarm(); });
    return disarm;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // lock-screen / notification controls on phones
  useEffect(() => {
    if (!('mediaSession' in navigator) || status === 'idle') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: NOW_ON_RADIO.title || '1313 Radio', artist: '1313 Radio · Live', album: 'MEDIA 1313' });
      navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', start); navigator.mediaSession.setActionHandler('pause', pause); navigator.mediaSession.setActionHandler('stop', stop);
    } catch { /* not supported */ }
  }, [status, NOW_ON_RADIO.title, start, pause, stop]);

  const value = useMemo(() => ({ url, status, error, volume, blocked, toggle, start, pause, stop, close, setVolume, playing: status === 'playing', loading: status === 'loading', hasStream: !!url }), [url, status, error, volume, toggle, start, pause, stop, setVolume, blocked, close]);
  return <RadioCtx.Provider value={value}>{children}{started && <RadioBar />}</RadioCtx.Provider>;
}

/** Slim player pinned to the bottom of the page while the radio is on. */
function RadioBar() {
  const r = useRadio(); const { NOW_ON_RADIO = {} } = useContent();
  useEffect(() => { document.documentElement.classList.add('has-radiobar'); return () => document.documentElement.classList.remove('has-radiobar'); }, []);
  return (
    <div className="radiobar" role="region" aria-label="1313 Radio player">
      <button type="button" className="radiobar-play" onClick={r.toggle} aria-label={r.playing || r.loading ? 'Pause radio' : 'Play radio'}>
        {r.playing || r.loading ? <PauseIcon size={20} color="#111216" /> : <PlayIcon size={20} color="#111216" />}
      </button>
      <div className="radiobar-text">
        <strong>1313 Radio · Live</strong>
        <span>{r.status === 'error' ? r.error : r.blocked ? 'Tap anywhere to start the radio' : r.loading ? 'Connecting…' : NOW_ON_RADIO.title}</span>
      </div>
      {r.playing && <Equalizer height={22} bars={4} color="var(--amber)" />}
      <input className="radiobar-vol" type="range" min="0" max="100" value={r.volume} onChange={(e) => r.setVolume(+e.target.value)} aria-label="Volume" />
      <button type="button" className="radiobar-x" onClick={r.close} aria-label="Close radio player">✕</button>
    </div>
  );
}
