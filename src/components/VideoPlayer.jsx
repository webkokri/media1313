import { useEffect, useRef, useState } from 'react';
import { PlayIcon } from './ui.jsx';

/**
 * Video player for the live TV stream. Accepts:
 *   - HLS links (.m3u8)      → hls.js (or the browser's native HLS on Safari / iOS)
 *   - MP4 / WebM files       → plain <video>
 *   - YouTube links          → privacy-friendly embed
 * Fills its (position: relative) parent. Shows the poster with a play button first, so nothing loads until asked
 * (unless autoPlay is on — browsers only allow that when muted).
 */
const youtubeId = (u) => { const m = String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/); return m ? m[1] : null; };
const isHls = (u) => /\.m3u8(\?|#|$)/i.test(u);
const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

export default function VideoPlayer({ src, poster, autoPlay = false, muted = false, emptyMessage = 'The live stream will appear here soon.' }) {
  const url = (src || '').trim();
  const yt = youtubeId(url);
  const video = useRef();
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setStarted(autoPlay && !!url); setError(''); }, [url, autoPlay]);

  useEffect(() => {
    if (!started || !url || yt) return undefined;
    const el = video.current; if (!el) return undefined;
    let hls; let dead = false;
    const fail = (m) => { if (!dead) setError(m); };
    const play = () => el.play().catch(() => { /* needs a tap — the native controls are visible */ });
    const offline = () => (/^http:/i.test(url) && location.protocol === 'https:' ? 'The stream link must start with https:// to play on this secure site.' : 'The stream is offline or the link cannot be reached.');
    if (isHls(url)) {
      import('hls.js').then(({ default: Hls }) => {
        if (dead) return;
        if (Hls.isSupported()) {                       // desktop + Android browsers
          hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(url); hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, play);
          let recovered = false;
          hls.on(Hls.Events.ERROR, (_e, d) => {
            if (!d.fatal) return;
            if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) { recovered = true; hls.recoverMediaError(); }
            else if (d.type === Hls.ErrorTypes.NETWORK_ERROR) fail(offline());
            else fail('The stream could not be played.');
          });
        } else if (el.canPlayType('application/vnd.apple.mpegurl')) { el.src = url; play(); }   // iPhone / iPad: native HLS
        else fail('This browser cannot play this stream.');
      }).catch(() => fail('The player could not be loaded.'));
    } else { el.src = url; play(); }
    return () => { dead = true; if (hls) hls.destroy(); el.removeAttribute('src'); el.load?.(); };
  }, [started, url, yt]);

  if (!url) return (
    <div style={{ ...fill, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: 'var(--soft-dark)', background: poster ? `center / cover url(${poster})` : 'var(--panel-2)' }}>
      <span style={{ background: 'rgba(14,16,20,.72)', padding: '10px 16px', borderRadius: 8, fontSize: 14 }}>{emptyMessage}</span>
    </div>
  );
  if (!started) return (
    <button type="button" onClick={() => setStarted(true)} aria-label="Play the live stream"
      style={{ ...fill, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', background: poster ? `center / cover url(${poster})` : 'var(--panel-2)' }}>
      <span className="play-circle" style={{ width: 88, height: 88 }}><PlayIcon size={34} color="#111216" /></span>
    </button>
  );
  if (yt) return <iframe title="Live stream" style={{ ...fill, border: 0 }} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1${muted ? '&mute=1' : ''}`} />;
  return (
    <>
      <video ref={video} controls playsInline muted={muted} poster={poster || undefined} style={{ ...fill, background: '#000', objectFit: 'contain' }} onError={() => setError(isHls(url) ? 'The stream is offline or the link cannot be reached.' : 'The video could not be played.')} />
      {error && <div role="alert" style={{ ...fill, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, background: 'rgba(14,16,20,.88)', color: '#fff', fontSize: 15 }}>{error}</div>}
    </>
  );
}
