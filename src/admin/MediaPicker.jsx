import { useEffect, useRef, useState } from 'react';
import { adminApi } from './adminApi.js';

/** Modal that lets editors upload an image or pick one from the library. onPick(mediaItem) */
export default function MediaPicker({ onPick, onClose }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const file = useRef();
  useEffect(() => { adminApi.get('/media').then((d) => setItems(d.media.filter((m) => m.mime.startsWith('image/')))).catch((e) => setError(e.message)); }, []);
  const upload = async (f) => {
    if (!f) return; setBusy(true); setError('');
    try { const { item } = await adminApi.upload(f); onPick(item); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Choose an image" onClick={onClose}>
      <div className="ad-modalbox" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modalhead">
          <h3>Choose an image</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files[0])} />
            <button type="button" className="ad-btn ad-primary" disabled={busy} onClick={() => file.current.click()}>{busy ? 'Uploading…' : 'Upload new'}</button>
            <button type="button" className="ad-btn" onClick={onClose}>Close</button>
          </div>
        </div>
        {error && <p className="ad-error">{error}</p>}
        {!items && !error && <p className="ad-muted">Loading…</p>}
        {items && items.length === 0 && <p className="ad-muted">No images yet. Upload one to get started.</p>}
        <div className="ad-mediagrid small">
          {(items || []).map((m) => (
            <button type="button" key={m.id} className="ad-mediacard pick" onClick={() => onPick(m)}>
              <img src={m.url} alt={m.alt || m.filename} loading="lazy" /><span>{m.filename}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
