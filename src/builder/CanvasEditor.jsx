import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { PageRender } from './Render.jsx';
import { STRUCTURES, labelOf, find } from './schema.js';
import { cleanHtml } from './sanitize.js';

// Runs inside the builder's preview frame (/__pb). The builder (parent window) owns the page tree;
// this layer draws it, reports clicks / drops / text edits, and shows outlines + a toolbar.
const ORIGIN = window.location.origin;
const post = (m) => window.parent.postMessage({ source: 'pb', ...m }, ORIGIN);
const COLORS = { section: '#2563eb', column: '#7c3aed', widget: '#db2777' };
const dragInfo = () => window.__pbDrag || window.parent.__pbDrag || null;
const rectOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; };
const kindOf = (el) => el?.getAttribute('data-pb-type') === 'section' ? 'section' : el?.getAttribute('data-pb-type') === 'column' ? 'column' : 'widget';

function StructurePicker({ onPick }) {
  return (
    <div className="pbx-structs">
      {STRUCTURES.map((w) => (
        <button key={w.join('-')} type="button" title={`${w.length} column${w.length > 1 ? 's' : ''}`} onClick={() => onPick(w)}>
          {w.map((x, i) => <i key={i} style={{ flex: x }} />)}
        </button>
      ))}
    </div>
  );
}

export default function CanvasEditor() {
  const [st, setSt] = useState({ tree: { sections: [] }, selectedId: null, settings: {} });
  const [hover, setHover] = useState(null);
  const [box, setBox] = useState({ hover: null, sel: null });
  const [editing, setEditing] = useState(null);       // { el, id, key, rich }
  const [line, setLine] = useState(null);             // drop indicator
  const treeRef = useRef(st.tree); treeRef.current = st.tree;
  const selRef = useRef(null); selRef.current = st.selectedId;
  const editRef = useRef(null); editRef.current = editing;

  useEffect(() => {
    const h = (e) => { if (e.origin === ORIGIN && e.data?.type === 'pb:state') setSt({ tree: e.data.tree, selectedId: e.data.selectedId, settings: e.data.settings || {} }); };
    window.addEventListener('message', h); post({ type: 'pb:ready' });
    document.documentElement.classList.add('pb-canvas');
    return () => window.removeEventListener('message', h);
  }, []);

  const measure = useCallback(() => {
    const q = (id) => (id ? document.querySelector(`[data-pb-id="${id}"]`) : null);
    const hv = hover && hover !== selRef.current ? q(hover) : null; const sl = q(selRef.current);
    setBox({ hover: hv ? { ...rectOf(hv), kind: kindOf(hv), label: labelOf({ type: hv.getAttribute('data-pb-type') }) } : null, sel: sl ? { ...rectOf(sl), kind: kindOf(sl), label: labelOf({ type: sl.getAttribute('data-pb-type') }) } : null });
  }, [hover]);
  useLayoutEffect(() => { measure(); }, [st, hover, editing, measure]);
  useEffect(() => {
    window.addEventListener('scroll', measure, true); window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    return () => { window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure); ro.disconnect(); };
  }, [measure]);

  /* ---- inline editing ---- */
  const startEdit = (el, clickEvent) => {
    const owner = el.closest('[data-pb-id]'); if (!owner || editRef.current) return;
    const rich = el.hasAttribute('data-pb-rich');
    el.contentEditable = 'true'; el.spellcheck = true; el.classList.add('pb-editing'); el.focus();
    if (clickEvent && document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(clickEvent.clientX, clickEvent.clientY); if (r) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } }
    setEditing({ el, id: owner.getAttribute('data-pb-id'), key: el.getAttribute('data-pb-edit'), rich });
  };
  const finishEdit = useCallback(() => {
    const ed = editRef.current; if (!ed) return;
    const { el, id, key, rich } = ed;
    const value = rich ? cleanHtml(el.innerHTML) : el.innerText.replace(/\n+/g, ' ').trim();
    el.contentEditable = 'false'; el.classList.remove('pb-editing'); setEditing(null);
    post({ type: 'pb:update', id, patch: { [key]: value } });
  }, []);
  useEffect(() => {
    if (!editing) return undefined;
    const { el } = editing;
    const key = (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && !editing.rich)) { e.preventDefault(); el.blur(); } e.stopPropagation(); };
    el.addEventListener('blur', finishEdit); el.addEventListener('keydown', key);
    return () => { el.removeEventListener('blur', finishEdit); el.removeEventListener('keydown', key); };
  }, [editing, finishEdit]);

  /* ---- pointer + keyboard ---- */
  useEffect(() => {
    const idAt = (t) => t?.closest?.('[data-pb-id]')?.getAttribute('data-pb-id') || null;
    const move = (e) => { if (!editRef.current) setHover(idAt(e.target)); };
    const click = (e) => {
      if (e.target.closest('.pbx')) return;                       // our own overlay buttons
      if (editRef.current) { if (editRef.current.el.contains(e.target)) return; finishEdit(); }
      e.preventDefault(); e.stopPropagation();
      const id = idAt(e.target);
      // clicking text inside the already-selected widget starts typing there
      const ed = e.target.closest('[data-pb-edit]');
      if (id && ed && id === selRef.current && ed.closest('[data-pb-id]').getAttribute('data-pb-id') === id) { startEdit(ed, e); return; }
      post({ type: 'pb:select', id });
    };
    const dbl = (e) => { const ed = e.target.closest('[data-pb-edit]'); if (ed && !editRef.current) { e.preventDefault(); post({ type: 'pb:select', id: idAt(ed) }); startEdit(ed, e); } };
    const keys = (e) => {
      if (editRef.current) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') { e.preventDefault(); post({ type: e.shiftKey ? 'pb:redo' : 'pb:undo' }); }
      else if (meta && e.key.toLowerCase() === 'd' && selRef.current) { e.preventDefault(); post({ type: 'pb:action', action: 'duplicate', id: selRef.current }); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selRef.current) { e.preventDefault(); post({ type: 'pb:action', action: 'delete', id: selRef.current }); }
      else if (e.key === 'Escape') post({ type: 'pb:select', id: null });
    };
    document.addEventListener('mousemove', move); document.addEventListener('click', click, true); document.addEventListener('dblclick', dbl, true); document.addEventListener('keydown', keys);
    document.addEventListener('submit', (e) => e.preventDefault(), true);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('click', click, true); document.removeEventListener('dblclick', dbl, true); document.removeEventListener('keydown', keys); };
  }, [finishEdit]);

  /* ---- drag & drop ---- */
  const dropAt = useCallback((e, drag) => {
    const secs = [...document.querySelectorAll('.pb-page > .pb-section')];
    const nodeType = drag.kind === 'move' ? drag.nodeType : drag.kind === 'new' ? 'widget' : 'section';
    const lineAt = (y, r) => ({ top: y, left: r.left, width: r.width });
    const pageRect = document.querySelector('.pb-page')?.getBoundingClientRect() || { left: 0, width: window.innerWidth, bottom: 120 };
    if (nodeType === 'widget') {
      const col = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.matches?.('[data-pb-type="column"]'));
      if (col) {
        const ws = [...col.children].filter((c) => c.matches('[data-pb-type]') && c.getAttribute('data-pb-id') !== drag.id);
        let index = ws.length; let y = ws.length ? ws[ws.length - 1].getBoundingClientRect().bottom : col.getBoundingClientRect().top + 8;
        for (let i = 0; i < ws.length; i++) { const r = ws[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { index = i; y = r.top; break; } }
        // the index is in terms of the column's current children (excluding the dragged one when moving within the same column)
        return { drop: { parentId: col.getAttribute('data-pb-id'), index }, line: lineAt(y, col.getBoundingClientRect()) };
      }
    }
    // between / around sections (widgets get wrapped in a new section, sections / templates are inserted)
    let index = secs.length; let y = secs.length ? secs[secs.length - 1].getBoundingClientRect().bottom : pageRect.top + 8;
    for (let i = 0; i < secs.length; i++) { const r = secs[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { index = i; y = r.top; break; } }
    return { drop: { parentId: null, index, wrapSection: nodeType === 'widget' }, line: lineAt(y, pageRect) };
  }, []);
  useEffect(() => {
    const over = (e) => { const d = dragInfo(); if (!d) return; e.preventDefault(); e.dataTransfer.dropEffect = d.kind === 'move' ? 'move' : 'copy'; setLine(dropAt(e, d).line); };
    const drop = (e) => { const d = dragInfo(); if (!d) return; e.preventDefault(); const r = dropAt(e, d); setLine(null); window.__pbDrag = null; post({ type: 'pb:drop', drag: d, drop: r.drop }); };
    const leave = (e) => { if (!e.relatedTarget) setLine(null); };
    document.addEventListener('dragover', over); document.addEventListener('drop', drop); document.addEventListener('dragleave', leave);
    return () => { document.removeEventListener('dragover', over); document.removeEventListener('drop', drop); document.removeEventListener('dragleave', leave); };
  }, [dropAt]);

  const sel = box.sel; const selId = st.selectedId; const selNode = selId ? find(st.tree, selId) : null;
  const exec = (cmd, arg) => { document.execCommand(cmd, false, arg); };
  const bare = st.settings?.layout === 'canvas';

  return (
    <div className="app pb-canvas-root">
      {!bare && <div style={{ pointerEvents: 'none' }}><Header /></div>}
      <main><PageRender tree={st.tree} editor /></main>
      <div className="pbx pbx-add">
        <p>{st.tree.sections.length ? 'Add a new section' : 'Start building your page'}</p>
        <StructurePicker onPick={(widths) => post({ type: 'pb:addSection', widths })} />
        <small>Choose a structure, then drag widgets from the left. You can also drag a widget straight onto the page.</small>
      </div>
      {!bare && <div style={{ pointerEvents: 'none' }}><Footer /></div>}

      <div className="pbx pbx-layer" aria-hidden="false">
        {box.hover && <div className="pbx-box hover" style={{ ...box.hover, borderColor: COLORS[box.hover.kind] }}><span style={{ background: COLORS[box.hover.kind] }}>{box.hover.label}</span></div>}
        {sel && (
          <div className="pbx-box sel" style={{ top: sel.top, left: sel.left, width: sel.width, height: sel.height, borderColor: COLORS[sel.kind] }}>
            <div className="pbx pbx-bar" style={{ background: COLORS[sel.kind], top: sel.top < 34 ? 'auto' : -28, bottom: sel.top < 34 ? -28 : 'auto' }}>
              <span draggable className="pbx-grip" title="Drag to move"
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'pb-move'); e.dataTransfer.effectAllowed = 'move'; window.__pbDrag = { kind: 'move', id: selId, nodeType: sel.kind === 'section' ? 'section' : 'widget' }; }}
                onDragEnd={() => { window.__pbDrag = null; setLine(null); }}>⠿ {sel.label}</span>
              {sel.kind !== 'section' && <button type="button" title="Select parent" onClick={() => post({ type: 'pb:action', action: 'parent', id: selId })}>↖</button>}
              <button type="button" title="Move up" onClick={() => post({ type: 'pb:action', action: 'up', id: selId })}>↑</button>
              <button type="button" title="Move down" onClick={() => post({ type: 'pb:action', action: 'down', id: selId })}>↓</button>
              <button type="button" title="Duplicate (Ctrl/⌘ D)" onClick={() => post({ type: 'pb:action', action: 'duplicate', id: selId })}>⧉</button>
              <button type="button" title="Delete" onClick={() => post({ type: 'pb:action', action: 'delete', id: selId })}>✕</button>
            </div>
          </div>
        )}
        {editing?.rich && sel && (
          <div className="pbx pbx-rich" style={{ top: Math.max(6, sel.top - 70), left: sel.left }} onMouseDown={(e) => e.preventDefault()}>
            <button type="button" onClick={() => exec('bold')}><b>B</b></button><button type="button" onClick={() => exec('italic')}><i>I</i></button>
            <button type="button" onClick={() => exec('insertUnorderedList')}>•</button><button type="button" onClick={() => exec('insertOrderedList')}>1.</button>
            <button type="button" onClick={() => { const u = window.prompt('Link address (https://… or /page)'); if (u) exec('createLink', u); }}>🔗</button><button type="button" onClick={() => exec('unlink')}>⊘</button>
          </div>
        )}
        {line && <div className="pbx-dropline" style={line} />}
      </div>
    </div>
  );
}
