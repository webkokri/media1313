import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayIcon } from './ui.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import { useRadio } from '../radio.jsx';

/** A video card. When the video has a link (set in Admin → Videos) it plays in a pop-up on the same page; otherwise it opens the live page. */
export default function VideoTile({ video, dark = false }) {
  const [open, setOpen] = useState(false);
  const radio = useRadio();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);
  const thumb = (
    <>
      <div className="thumb-play r-16-9" style={video.poster ? { background: `center / cover url(${video.poster})` } : undefined}>
        <span className="play-circle" style={{ width: 48, height: 48 }}><PlayIcon size={18} color="#111216" /></span>
        {video.dur && <span className="duration">{video.dur}</span>}
      </div>
      {video.show && <span className="kicker kicker--muted">{video.show}</span>}
      <span className="headline" style={{ fontSize: 22 }}>{video.title}</span>
    </>
  );
  if (!video.url) return <Link to="/live" className="card-link" style={dark ? { color: '#fff' } : undefined}>{thumb}</Link>;
  return (
    <>
      <button type="button" className="card-link" onClick={() => { radio?.pause?.(); setOpen(true); }} style={{ textAlign: 'left', background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', color: dark ? '#fff' : 'inherit' }} aria-label={`Play ${video.title}`}>{thumb}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={video.title} onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.86)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(960px, 100%)' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000', borderRadius: 10, overflow: 'hidden' }}><VideoPlayer src={video.url} poster={video.poster} autoPlay /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 12, color: '#fff' }}>
              <strong style={{ fontSize: 18 }}>{video.title}</strong>
              <button type="button" onClick={() => setOpen(false)} style={{ border: 0, borderRadius: 999, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Close ✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
