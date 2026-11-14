import { useEffect, useRef, useState } from 'react';
import { disablePush, enablePush, pushConfig, pushSupported, savedTopics } from '../push.js';

const Bell = ({ on }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? '#111216' : 'none'} stroke="#111216" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;

/** Bell in the header: lets a visitor choose what to be notified about and turn notifications on or off. */
export default function PushBell() {
  const [cfg, setCfg] = useState(null);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(null);          // topics this browser is subscribed to (null = not subscribed)
  const [pick, setPick] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const box = useRef(null);

  useEffect(() => { if (window.parent !== window || !pushSupported()) return; pushConfig().then(setCfg); savedTopics().then((t) => { setMine(t); }); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!cfg?.enabled) return null;

  const toggleOpen = () => { setMsg(''); setPick(mine || cfg.topics.filter((t) => t.id === 'breaking' || t.id === 'news').map((t) => t.id)); setOpen(!open); };
  const flip = (id) => setPick(pick.includes(id) ? pick.filter((x) => x !== id) : [...pick, id]);
  const save = async () => {
    setBusy(true); setMsg('');
    try { if (!pick.length) { await disablePush(); setMine(null); setMsg('Notifications are off.'); } else { await enablePush(pick); setMine(pick); setMsg('Saved — you will get notifications for the topics you picked.'); } }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  const off = async () => { setBusy(true); try { await disablePush(); setMine(null); setPick([]); setMsg('Notifications are off.'); } finally { setBusy(false); } };

  return (
    <div className="pushbell" ref={box}>
      <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={open} onClick={toggleOpen}><Bell on={!!mine} /></button>
      {open && (
        <div className="pushbell-pop" role="dialog" aria-label="Notification settings">
          <strong>Get notified</strong>
          <p>Choose what you’d like to hear about. You can change this any time.</p>
          {cfg.topics.map((t) => (
            <label key={t.id} className="pushbell-opt"><input type="checkbox" checked={pick.includes(t.id)} onChange={() => flip(t.id)} /><span><b>{t.label}</b><em>{t.desc}</em></span></label>
          ))}
          <div className="pushbell-actions">
            <button type="button" className="btn btn--red" disabled={busy} onClick={save}>{mine ? 'Save' : 'Turn on notifications'}</button>
            {mine && <button type="button" className="pushbell-off" disabled={busy} onClick={off}>Turn off</button>}
          </div>
          {msg && <p className="pushbell-msg" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}
