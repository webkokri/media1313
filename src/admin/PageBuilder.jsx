import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from './adminApi.js';
import { useLoad, useToast, confirmAction } from './ui.jsx';
import Controls from './controls.jsx';
import { COMMON_ADVANCED, STRUCTURES, TEMPLATES, WIDGETS, WIDGET_CATS, duplicateNode, find, insertNode, labelOf, moveNode, newColumn, newSection, newWidget, patchSettings, previewText, removeNode, settingsSpec, withNewIds } from '../builder/schema.js';

const DEVICES = [['desktop', '100%', 'Desktop', 'M3 4h18v12H3zM8 20h8M12 16v4'], ['tablet', '820px', 'Tablet', 'M6 2h12v20H6zM11 18h2'], ['mobile', '390px', 'Mobile', 'M8 2h8v20H8zM11 18h2']];
const Ico = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const clone = (x) => JSON.parse(JSON.stringify(x));

function Struct({ widths, ...p }) { return <button type="button" className="pbb-struct" {...p}>{widths.map((w, i) => <i key={i} style={{ flex: w }} />)}</button>; }

function Navigator({ tree, selected, onSelect, onAction }) {
  const row = (node, depth) => {
    const f = find(tree, node.id);
    return (
      <div key={node.id}>
        <div className={`pbb-navrow ${selected === node.id ? 'on' : ''}`} style={{ paddingLeft: 10 + depth * 16 }} onClick={() => onSelect(node.id)}>
          <span className="pbb-navico">{node.type === 'section' ? '▭' : node.type === 'column' ? '▯' : WIDGETS[node.type]?.icon}</span>
          <span className="pbb-navlabel">{labelOf(node)}<em>{previewText(node)}</em></span>
          <span className="pbb-navbtns">
            <button type="button" title="Move up" disabled={f.index === 0} onClick={(e) => { e.stopPropagation(); onAction('up', node.id); }}>↑</button>
            <button type="button" title="Move down" disabled={f.index === f.list.length - 1} onClick={(e) => { e.stopPropagation(); onAction('down', node.id); }}>↓</button>
            <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); onAction('duplicate', node.id); }}>⧉</button>
            <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); onAction('delete', node.id); }}>✕</button>
          </span>
        </div>
        {(node.cols || []).map((c) => row(c, depth + 1))}
        {(node.widgets || []).map((w) => row(w, depth + 1))}
      </div>
    );
  };
  return <div className="pbb-nav">{tree.sections.length ? tree.sections.map((s) => row(s, 0)) : <p className="pbb-muted pad">The page is empty. Add a section to begin.</p>}</div>;
}

export default function PageBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const server = useLoad(() => adminApi.get(`/pages/${id}`), [id]);
  const content = useLoad(() => adminApi.get('/content'));
  const frame = useRef();
  const [meta, setMeta] = useState(null);           // { title, slug, status, settings }
  const [tree, setTree] = useState(null);
  const [saved, setSaved] = useState('');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('elements');     // elements | navigator | page | settings
  const [tab, setTab] = useState('content');
  const [device, setDevice] = useState('desktop');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const hist = useRef({ stack: [], i: -1, key: null, at: 0 });
  const treeRef = useRef(null); treeRef.current = tree;
  const selRef = useRef(null); selRef.current = selected;

  useEffect(() => {
    const p = server.data?.page; if (!p) return;
    setMeta({ title: p.title, slug: p.slug, status: p.status, hasDraft: p.hasDraft, settings: p.settings });
    setTree(p.tree); hist.current = { stack: [p.tree], i: 0, key: null, at: 0 };
    setSaved(JSON.stringify({ t: p.title, s: p.slug, tree: p.tree, st: p.settings }));
  }, [server.data]);

  const dirty = tree && meta && JSON.stringify({ t: meta.title, s: meta.slug, tree, st: meta.settings }) !== saved;
  useEffect(() => { if (!dirty) return undefined; const h = (e) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  /* ---- history ---- */
  const change = useCallback((next, key = null) => {
    const h = hist.current; const now = Date.now();
    if (key && h.key === key && now - h.at < 700) h.stack[h.i] = next;
    else { h.stack = [...h.stack.slice(0, h.i + 1), next].slice(-80); h.i = h.stack.length - 1; }
    h.key = key; h.at = now; setTree(next); force((n) => n + 1);
  }, []);
  const jump = useCallback((d) => { const h = hist.current; const i = h.i + d; if (i < 0 || i >= h.stack.length) return; h.i = i; h.key = null; setTree(h.stack[i]); force((n) => n + 1); }, []);
  const canUndo = hist.current.i > 0, canRedo = hist.current.i < hist.current.stack.length - 1;

  /* ---- keeping the preview frame in sync ---- */
  const push = useCallback(() => { frame.current?.contentWindow?.postMessage({ type: 'pb:state', tree: treeRef.current, selectedId: selRef.current, settings: meta?.settings }, window.location.origin); }, [meta?.settings]);
  useEffect(() => { if (tree) push(); }, [tree, selected, push]);

  /* ---- actions ---- */
  const select = (nid) => { setSelected(nid); if (nid) { setMode('settings'); setTab('content'); } else setMode((m) => (m === 'settings' ? 'elements' : m)); };
  const act = useCallback((action, nid) => {
    const t = treeRef.current; const f = find(t, nid); if (!f) return;
    if (action === 'delete') { if (f.kind === 'section' && f.node.cols.some((c) => c.widgets.length) && !confirmAction('Delete this section and everything in it?')) return; change(removeNode(t, nid)); setSelected(null); setMode('elements'); }
    else if (action === 'duplicate') { const [n, newId] = duplicateNode(t, nid); change(n); setSelected(newId); }
    else if (action === 'up' || action === 'down') { const parentId = f.parent?.id ?? null; const to = action === 'up' ? f.index - 1 : f.index + 2; if (to < 0 || to > f.list.length + 1) return; change(moveNode(t, nid, parentId, Math.max(0, to))); }
    else if (action === 'parent') { if (f.parent) { setSelected(f.parent.id); setMode('settings'); } }
  }, [change]);

  const targetColumn = (t) => { // where "click to add" puts a widget
    const f = selRef.current ? find(t, selRef.current) : null;
    if (f?.kind === 'widget') return { parentId: f.parent.id, index: f.index + 1 };
    if (f?.kind === 'column') return { parentId: f.node.id, index: f.node.widgets.length };
    if (f?.kind === 'section') return { parentId: f.node.cols[0].id, index: f.node.cols[0].widgets.length };
    const last = t.sections[t.sections.length - 1]; if (last) { const c = last.cols[last.cols.length - 1]; return { parentId: c.id, index: c.widgets.length }; }
    return null;
  };
  const addWidget = (type) => {
    const t = treeRef.current; const node = newWidget(type); const tc = targetColumn(t);
    if (!tc) { const sec = newSection([100]); sec.cols[0].widgets = [node]; change(insertNode(t, null, 0, sec)); }
    else change(insertNode(t, tc.parentId, tc.index, node));
    setSelected(node.id); setMode('settings'); setTab('content');
  };
  const addSection = (widths) => {
    const t = treeRef.current; const sec = newSection(widths); const f = selRef.current ? find(t, selRef.current) : null;
    const secId = f ? (f.kind === 'section' ? f.node.id : find(t, selRef.current) && t.sections.find((s) => find({ sections: [s] }, selRef.current))?.id) : null;
    const idx = secId ? t.sections.findIndex((s) => s.id === secId) + 1 : t.sections.length;
    change(insertNode(t, null, idx, sec)); setSelected(sec.id); setMode('settings');
  };
  const addTemplate = (key) => { const t = treeRef.current; const sec = TEMPLATES[key].build(); change(insertNode(t, null, t.sections.length, sec)); setSelected(sec.id); setMode('settings'); };

  const applyDrop = useCallback((drag, drop) => {
    let t = treeRef.current; let newId = null;
    const wrap = (node) => { const sec = newSection([100]); sec.cols[0].widgets = [node]; return sec; };
    if (drag.kind === 'move') {
      const f = find(t, drag.id); if (!f) return;
      if (drag.nodeType === 'section') t = moveNode(t, drag.id, null, drop.index);
      else if (drop.wrapSection) { const node = clone(f.node); t = insertNode(removeNode(t, drag.id), null, drop.index, wrap(node)); }
      else { let idx = drop.index; if (f.parent?.id === drop.parentId && idx >= f.index) idx += 1; t = moveNode(t, drag.id, drop.parentId, idx); }
      newId = drag.id;
    } else if (drag.kind === 'new') {
      const node = newWidget(drag.type); newId = node.id;
      t = drop.wrapSection ? insertNode(t, null, drop.index, wrap(node)) : insertNode(t, drop.parentId, drop.index, node);
    } else if (drag.kind === 'structure') { const sec = newSection(drag.widths); newId = sec.id; t = insertNode(t, null, drop.parentId == null ? drop.index : t.sections.length, sec); }
    else if (drag.kind === 'template') { const sec = TEMPLATES[drag.id].build(); newId = sec.id; t = insertNode(t, null, drop.index, sec); }
    change(t); setSelected(newId); setMode('settings'); setTab('content');
  }, [change]);

  /* ---- messages from the canvas ---- */
  useEffect(() => {
    const h = (e) => {
      if (e.origin !== window.location.origin || e.data?.source !== 'pb') return;
      const d = e.data;
      if (d.type === 'pb:ready') push();
      else if (d.type === 'pb:select') select(d.id);
      else if (d.type === 'pb:update') { const keys = Object.keys(d.patch); change(patchSettings(treeRef.current, d.id, d.patch), `${d.id}:${keys[0]}`); }
      else if (d.type === 'pb:drop') applyDrop(d.drag, d.drop);
      else if (d.type === 'pb:addSection') addSection(d.widths);
      else if (d.type === 'pb:action') act(d.action, d.id);
      else if (d.type === 'pb:undo') jump(-1); else if (d.type === 'pb:redo') jump(1);
    };
    window.addEventListener('message', h); return () => window.removeEventListener('message', h);
  });
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) { e.preventDefault(); jump(e.shiftKey ? 1 : -1); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [jump]);

  /* ---- palette drag ---- */
  const dragStart = (info) => (e) => { window.__pbDrag = info; e.dataTransfer.setData('text/plain', 'pb-new'); e.dataTransfer.effectAllowed = 'copy'; };
  const dragEnd = () => { window.__pbDrag = null; };

  /* ---- saving ---- */
  const persist = async (publish) => {
    setBusy(true);
    try {
      const body = { title: meta.title, slug: meta.slug, tree, settings: meta.settings };
      let { page } = await adminApi.put(`/pages/${id}`, body);
      if (publish) ({ page } = await adminApi.post(`/pages/${id}/publish`));
      setMeta((m) => ({ ...m, slug: page.slug, status: page.status, hasDraft: page.hasDraft }));
      setSaved(JSON.stringify({ t: meta.title, s: page.slug, tree, st: meta.settings }));
      toast(publish ? 'Published — live on the site' : 'Draft saved');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const unpublish = async () => { if (!confirmAction('Take this page offline? The built-in page (if any) will show again.')) return; await adminApi.post(`/pages/${id}/unpublish`); setMeta((m) => ({ ...m, status: 'draft' })); toast('Page is now a draft'); };
  const leave = (to) => { if (dirty && !confirmAction('You have unsaved changes. Leave without saving?')) return; nav(to); };

  const node = tree && selected ? find(tree, selected)?.node : null;
  const spec = node ? settingsSpec(node) : null;
  const categories = content.data?.blocks?.NEWS_CATEGORIES?.value || [];
  const widgetList = useMemo(() => Object.entries(WIDGETS).filter(([k, w]) => `${w.label} ${k}`.toLowerCase().includes(q.toLowerCase())), [q]);

  if (server.error) return <div className="pbb-center"><p className="ad-error">{server.error.message}</p></div>;
  if (!tree || !meta) return <div className="pbb-center"><p className="ad-muted">Loading the page builder…</p></div>;
  const live = meta.status === 'published';
  const width = DEVICES.find(([d]) => d === device)[1];
  const pageUrl = meta.slug === 'home' ? '/' : `/${meta.slug}`;

  return (
    <div className="pbb">
      <header className="pbb-top">
        <div className="pbb-top-l"><button className="pbb-icon" onClick={() => leave('/admin/pages')} title="Back to Pages" aria-label="Back to Pages"><Ico d="M15 18l-6-6 6-6" /></button>
          <input className="pbb-title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} aria-label="Page title" /></div>
        <div className="pbb-top-c">{DEVICES.map(([d, , label, ic]) => <button key={d} className={`pbb-icon ${device === d ? 'on' : ''}`} onClick={() => setDevice(d)} title={label} aria-label={label}><Ico d={ic} /></button>)}</div>
        <div className="pbb-top-r">
          {dirty && <span className="pbb-dirty">● Unsaved</span>}
          <button className="pbb-icon" disabled={!canUndo} onClick={() => jump(-1)} title="Undo" aria-label="Undo"><Ico d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></button>
          <button className="pbb-icon" disabled={!canRedo} onClick={() => jump(1)} title="Redo" aria-label="Redo"><Ico d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></button>
          {live && <a className="pbb-btn" href={pageUrl} target="_blank" rel="noreferrer">View page</a>}
          <button className="pbb-btn" disabled={busy || !dirty} onClick={() => persist(false)}>Save draft</button>
          <button className="pbb-btn pbb-primary" disabled={busy || (!dirty && live && !meta.hasDraft)} onClick={() => persist(true)}>{live ? 'Update' : 'Publish'}</button>
        </div>
      </header>
      <div className="pbb-body">
        <aside className="pbb-panel">
          <div className="pbb-tabs">
            <button className={mode === 'elements' ? 'on' : ''} onClick={() => setMode('elements')} title="Elements"><Ico d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /><span>Elements</span></button>
            <button className={mode === 'navigator' ? 'on' : ''} onClick={() => setMode('navigator')} title="Navigator"><Ico d="M4 6h16M8 12h12M12 18h8" /><span>Navigator</span></button>
            <button className={mode === 'page' ? 'on' : ''} onClick={() => setMode('page')} title="Page settings"><Ico d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /><span>Page</span></button>
          </div>
          <div className="pbb-panelbody">
            {mode === 'elements' && (
              <>
                <input className="pbb-search" placeholder="Search widget…" value={q} onChange={(e) => setQ(e.target.value)} />
                <h4 className="pbb-h">Structure</h4>
                <div className="pbb-structs">{STRUCTURES.map((w) => <Struct key={w.join('-')} widths={w} draggable onDragStart={dragStart({ kind: 'structure', widths: w })} onDragEnd={dragEnd} onClick={() => addSection(w)} title="Click or drag to add a section" />)}</div>
                {WIDGET_CATS.map((cat) => { const items = widgetList.filter(([, w]) => w.cat === cat); return items.length ? (
                  <div key={cat}><h4 className="pbb-h">{cat}</h4>
                    <div className="pbb-grid">{items.map(([k, w]) => <button key={k} type="button" className="pbb-widget" draggable onDragStart={dragStart({ kind: 'new', type: k })} onDragEnd={dragEnd} onClick={() => addWidget(k)} title="Click or drag onto the page"><span>{w.icon}</span>{w.label}</button>)}</div></div>
                ) : null; })}
                {!q && <><h4 className="pbb-h">Ready-made sections</h4>
                  <div className="pbb-tpls">{Object.entries(TEMPLATES).map(([k, t]) => <button key={k} type="button" className="pbb-tpl" draggable onDragStart={dragStart({ kind: 'template', id: k })} onDragEnd={dragEnd} onClick={() => addTemplate(k)}>{t.label}</button>)}</div></>}
              </>
            )}
            {mode === 'navigator' && <Navigator tree={tree} selected={selected} onSelect={select} onAction={act} />}
            {mode === 'page' && (
              <div className="ctls">
                <h5 className="ctl-heading">Page settings</h5>
                <div className="ctl"><div className="ctl-label"><label>Title</label></div><input className="ctl-input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></div>
                <div className="ctl"><div className="ctl-label"><label>Address</label></div><div className="ctl-addr"><span>/</span><input className="ctl-input" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })} /></div>
                  <small className="pbb-muted">{meta.slug === 'home' ? 'This page replaces the homepage when published.' : `Public address: ${pageUrl}. If a built-in page uses this address (for example “tv”), this page replaces it.`}</small></div>
                <div className="ctl"><div className="ctl-label"><label>Layout</label></div><select className="ctl-input" value={meta.settings.layout || 'default'} onChange={(e) => setMeta({ ...meta, settings: { ...meta.settings, layout: e.target.value } })}><option value="default">Site header and footer</option><option value="canvas">Blank canvas (no header or footer)</option></select></div>
                <div className="ctl"><div className="ctl-label"><label>Search description (SEO)</label></div><textarea className="ctl-input" rows={3} value={meta.settings.description || ''} onChange={(e) => setMeta({ ...meta, settings: { ...meta.settings, description: e.target.value } })} /></div>
                {live && <button className="pbb-btn danger wide" onClick={unpublish}>Unpublish this page</button>}
              </div>
            )}
            {mode === 'settings' && node && (
              <>
                <div className="pbb-sethead"><button className="pbb-icon" onClick={() => setMode('elements')} title="Back to elements" aria-label="Back to elements"><Ico d="M15 18l-6-6 6-6" /></button><strong>Edit {spec.label}</strong></div>
                <div className="pbb-settabs">{['content', 'style', 'advanced'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
                {spec.note && tab === 'content' && <p className="pbb-note">{spec.note}</p>}
                {spec[tab].length === 0 && <p className="pbb-muted pad">Nothing to set here.</p>}
                <Controls spec={spec[tab]} s={node.s} device={device} ctx={{ categories }} onSet={(patch) => change(patchSettings(tree, node.id, patch), `${node.id}:${Object.keys(patch)[0]}`)} />
                {device !== 'desktop' && <p className="pbb-note">Editing for <b>{device}</b>: controls marked with a device icon only change this screen size.</p>}
              </>
            )}
          </div>
        </aside>
        <main className="pbb-canvas">
          <div className="pbb-frame" style={{ width }}>
            <iframe ref={frame} title="Page canvas" src="/__pb" />
          </div>
        </main>
      </div>
    </div>
  );
}
