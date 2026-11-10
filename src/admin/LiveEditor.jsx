import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi, blockInfo, BLOCKS } from './adminApi.js';
import { useLoad, useToast, confirmAction } from './ui.jsx';
import FormEditor from './FormEditor.jsx';

const PAGES = [['/', 'Home'], ['/news', 'News'], ['/tv', 'TV'], ['/radio', 'Radio'], ['/shows', 'Shows'], ['/podcasts', 'Podcasts'], ['/schedule', 'Schedule'], ['/sports', 'Sports'], ['/live', 'Live'], ['/about', 'About']];
// Which content blocks appear on each page (shown in the "On this page" outline).
const ON_PAGE = {
  '/': ['SITE', 'NOW_ON_TV', 'TV_UP_NEXT', 'RADIO_UP_NEXT', 'NOW_ON_RADIO', 'VIDEOS', 'PODCASTS'],
  '/news': ['NEWS_CATEGORIES', 'VIDEOS'], '/tv': ['NOW_ON_TV', 'TV_ROWS'], '/radio': ['NOW_ON_RADIO', 'RADIO_HOSTS', 'FM'],
  '/shows': ['SHOWS'], '/podcasts': ['PODCASTS', 'EPISODES'], '/schedule': ['SCHEDULE', 'FM'], '/sports': ['SPORTS'],
  '/live': ['LIVE_UPDATES', 'NOW_ON_TV', 'NOW_ON_RADIO', 'SCHEDULE'], '/about': ['CONTACT_TOPICS', 'FM'],
};
const DEVICES = [['desktop', '100%', 'Desktop', 'M3 4h18v12H3zM8 20h8M12 16v4'], ['tablet', '820px', 'Tablet', 'M6 2h12v20H6zM11 18h2'], ['mobile', '390px', 'Mobile', 'M8 2h8v20H8zM11 18h2']];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const Ico = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function LiveEditor({ admin }) {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const server = useLoad(() => adminApi.get('/content'));
  const frame = useRef();
  const [blocks, setBlocks] = useState(null);     // working copy (what the preview shows)
  const [saved, setSaved] = useState({});         // last state stored on the server (draft if any, else live)
  const [drafted, setDrafted] = useState({});     // keys that currently have a saved draft on the server
  const [selected, setSelected] = useState(params.get('block') || null);
  const [articlesHint, setArticlesHint] = useState(false);
  const [path, setPath] = useState(params.get('page') || '/');
  const [device, setDevice] = useState('desktop');
  const [zoom, setZoom] = useState('auto');
  const [tab, setTab] = useState('page');
  const [q, setQ] = useState('');
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [busy, setBusy] = useState(false);
  const hist = useRef({ stack: [], i: -1, key: null, at: 0 });
  const [, tick] = useState(0);

  // initial load from server
  useEffect(() => {
    const b = server.data?.blocks; if (!b) return;
    const cur = Object.fromEntries(Object.entries(b).map(([k, x]) => [k, x.hasDraft ? x.draft : x.value]));
    setBlocks(cur); setSaved(cur); setDrafted(Object.fromEntries(Object.entries(b).map(([k, x]) => [k, x.hasDraft])));
    hist.current = { stack: [cur], i: 0, key: null, at: 0 };
  }, [server.data]);

  const send = useCallback((content) => frame.current?.contentWindow?.postMessage({ type: 'm1313:content', content }, window.location.origin), []);
  useEffect(() => { if (blocks) { const t = setTimeout(() => send(blocks), 120); return () => clearTimeout(t); } return undefined; }, [blocks, send]);
  useEffect(() => { frame.current?.contentWindow?.postMessage({ type: 'm1313:highlight', key: selected }, window.location.origin); }, [selected, path]);

  // messages from the preview (clicks, navigation)
  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data || {};
      if (d.type === 'm1313:ready') { if (blocks) send(blocks); frame.current?.contentWindow?.postMessage({ type: 'm1313:highlight', key: selected }, window.location.origin); }
      if (d.type === 'm1313:nav') setPath(d.path);
      if (d.type === 'm1313:select') { if (d.key) { setSelected(d.key); setArticlesHint(false); setRight(true); } else if (d.articles) { setSelected(null); setArticlesHint(true); setRight(true); } }
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [blocks, selected, send]);

  const dirtyKeys = useMemo(() => (blocks ? Object.keys(blocks).filter((k) => !same(blocks[k], saved[k])) : []), [blocks, saved]);
  const draftKeys = useMemo(() => Object.keys(drafted).filter((k) => drafted[k]), [drafted]);
  const unpublished = useMemo(() => [...new Set([...dirtyKeys, ...draftKeys])], [dirtyKeys, draftKeys]);
  useEffect(() => {
    if (!dirtyKeys.length) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [dirtyKeys.length]);

  // ---- history (undo / redo) ----
  const change = (key, value) => {
    const next = { ...blocks, [key]: value }; const h = hist.current; const now = Date.now();
    if (h.key === key && now - h.at < 800) h.stack[h.i] = next;           // merge rapid typing into one step
    else { h.stack = [...h.stack.slice(0, h.i + 1), next].slice(-60); h.i = h.stack.length - 1; }
    h.key = key; h.at = now; setBlocks(next); tick((n) => n + 1);
  };
  const jump = (d) => { const h = hist.current; const i = h.i + d; if (i < 0 || i >= h.stack.length) return; h.i = i; h.key = null; setBlocks(h.stack[i]); tick((n) => n + 1); };
  const canUndo = hist.current.i > 0, canRedo = hist.current.i < hist.current.stack.length - 1;
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); jump(e.shiftKey ? 1 : -1); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const persist = async (publish) => {
    setBusy(true);
    try {
      for (const k of dirtyKeys) await adminApi.put(`/content/${k}`, { value: blocks[k] });
      let published = 0;
      if (publish) published = (await adminApi.post('/content-publish', { keys: unpublished })).published;
      setSaved({ ...blocks });
      setDrafted((d) => { const n = { ...d }; for (const k of dirtyKeys) n[k] = true; if (publish) for (const k of unpublished) n[k] = false; return n; });
      toast(publish ? `Published ${published} block${published === 1 ? '' : 's'} — live on the site` : 'Draft saved');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const leave = (to) => { if (dirtyKeys.length && !confirmAction('You have unsaved changes. Leave without saving?')) return; nav(to); };
  const goPage = (p) => { setPath(p); frame.current?.contentWindow?.postMessage({ type: 'm1313:go', path: p }, window.location.origin); };
  const revert = (k) => change(k, saved[k]);

  if (server.error) return <div className="ad-live ad-center"><p className="ad-error">{server.error.message}</p></div>;
  if (!blocks) return <div className="ad-live ad-center"><p className="ad-muted">Loading editor…</p></div>;

  const pageLabel = (PAGES.find(([p]) => p === path) || [null, path])[1];
  const keys = Object.keys(blocks);
  const onPage = [...new Set([...(ON_PAGE[path] || []), 'NAV', 'FOOTER_COLS'])].filter((k) => k in blocks);
  const list = (tab === 'page' ? onPage : keys).filter((k) => `${blockInfo(k).label} ${k}`.toLowerCase().includes(q.toLowerCase()));
  const width = DEVICES.find(([d]) => d === device)[1];
  const scale = zoom === 'auto' ? 1 : Number(zoom);

  return (
    <div className="ad-live">
      <header className="ad-livebar">
        <div className="ad-livebar-l"><button className={`ad-iconbtn ${left ? 'on' : ''}`} onClick={() => setLeft(!left)} aria-label="Toggle blocks panel" title="Blocks"><Ico d="M3 3h18v18H3zM9 3v18" /></button>
          <button className={`ad-iconbtn ${right ? 'on' : ''}`} onClick={() => setRight(!right)} aria-label="Toggle properties panel" title="Properties"><Ico d="M3 3h18v18H3zM15 3v18" /></button></div>
        <div className="ad-livetitle"><strong>{pageLabel} page — live editor</strong>{unpublished.length > 0 && <span className="ad-dot" title={`${unpublished.length} block(s) not published`}>● {unpublished.length} unpublished</span>}</div>
        <div className="ad-livebar-r">
          <button className="ad-iconbtn" disabled={!canUndo} onClick={() => jump(-1)} title="Undo (Ctrl/⌘ Z)" aria-label="Undo"><Ico d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></button>
          <button className="ad-iconbtn" disabled={!canRedo} onClick={() => jump(1)} title="Redo (Ctrl/⌘ Shift Z)" aria-label="Redo"><Ico d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></button>
          <button className="ad-btn sm" onClick={() => leave('/admin')}>Admin</button>
          <a className="ad-btn sm" href={path} target="_blank" rel="noreferrer">View site</a>
          <button className="ad-btn sm" disabled={busy || dirtyKeys.length === 0} onClick={() => persist(false)}>Save draft</button>
          <button className="ad-btn sm ad-publish" disabled={busy || unpublished.length === 0} onClick={() => persist(true)}>🌐 Publish</button>
        </div>
      </header>
      <div className={`ad-livebody ${left ? '' : 'noleft'} ${right ? '' : 'noright'}`}>
        {left && (
          <aside className="ad-liveleft">
            <div className="ad-tabs"><button className={tab === 'page' ? 'on' : ''} onClick={() => setTab('page')}>On this page</button><button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All blocks</button></div>
            <input className="ad-input sm" placeholder="Search blocks…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="ad-blocklist">
              {list.map((k) => (
                <button key={k} className={`ad-blockitem ${selected === k ? 'on' : ''}`} onClick={() => { setSelected(k); setArticlesHint(false); setRight(true); }}>
                  <span>{blockInfo(k).label}</span>{dirtyKeys.includes(k) ? <i className="ad-chg" title="Unsaved" /> : drafted[k] ? <i className="ad-chg draft" title="Draft saved, not published" /> : null}
                </button>
              ))}
              {list.length === 0 && <p className="ad-muted pad">No blocks match.</p>}
              <Link className="ad-blockitem link" to="/admin/articles" onClick={(e) => { e.preventDefault(); leave('/admin/articles'); }}><span>Articles →</span></Link>
              <Link className="ad-blockitem link" to="/admin/media" onClick={(e) => { e.preventDefault(); leave('/admin/media'); }}><span>Media library →</span></Link>
            </div>
          </aside>
        )}
        <main className="ad-livecenter">
          <div className="ad-canvasbar">
            <div className="ad-devices">{DEVICES.map(([d, , label, ic]) => <button key={d} className={`ad-iconbtn ${device === d ? 'on' : ''}`} onClick={() => setDevice(d)} title={label} aria-label={label}><Ico d={ic} /></button>)}</div>
            <select className="ad-input sm" value={path} onChange={(e) => goPage(e.target.value)} aria-label="Page to edit">{PAGES.map(([p, l]) => <option key={p} value={p}>{l}</option>)}{!PAGES.some(([p]) => p === path) && <option value={path}>{path}</option>}</select>
            <select className="ad-input sm" value={zoom} onChange={(e) => setZoom(e.target.value)} aria-label="Zoom"><option value="auto">Fit</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select>
          </div>
          <div className="ad-canvas">
            <div className="ad-frame" style={{ width: device === 'desktop' ? `${100 / scale}%` : width, transform: `scale(${scale})`, transformOrigin: 'top center', height: `${100 / scale}%` }}>
              <iframe ref={frame} title="Site preview" src={path} />
            </div>
          </div>
          <p className="ad-canvashint">Click any outlined area on the page to edit it. Changes preview instantly; use Save draft to keep them and Publish to go live.</p>
        </main>
        {right && (
          <aside className="ad-liveright">
            {selected && selected in blocks ? (
              <>
                <div className="ad-propshead"><div><h2>{blockInfo(selected).label}</h2><p>{blockInfo(selected).desc}</p></div>{!same(blocks[selected], saved[selected]) && <button className="ad-btn sm ghost" onClick={() => revert(selected)}>Revert</button>}</div>
                <FormEditor value={blocks[selected]} onChange={(v) => change(selected, v)} k={selected} />
              </>
            ) : articlesHint ? (
              <div className="ad-propsempty"><h2>Articles</h2><p>Stories on this page come from the Articles section.</p><button className="ad-btn ad-primary" onClick={() => leave('/admin/articles')}>Manage articles</button></div>
            ) : (
              <div className="ad-propsempty"><h2>Page</h2><p>Click a highlighted area of the page, or choose a block on the left, to edit it here.</p></div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
