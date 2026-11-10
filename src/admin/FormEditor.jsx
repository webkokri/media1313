import { useState } from 'react';
import MediaPicker from './MediaPicker.jsx';

// A generic editor for any JSON shape: objects become labelled fields, lists become add/remove/reorder cards or rows.
const NICE = { streamUrl: 'Stream URL (HLS .m3u8, MP4 or YouTube link)', poster: 'Poster image (shown before play)', autoplay: 'Autoplay (muted)', tvWeekday: 'TV — weekdays', tvWeekend: 'TV — weekends', radioWeekday: 'Radio — weekdays', radioWeekend: 'Radio — weekends', bg: 'Colour', tagColor: 'Tag colour', dur: 'Duration', desc: 'Description', sub: 'Subtitle', to: 'Link (page address)', sa: 'Score A', sb: 'Score B', a: 'Team A', b: 'Team B', gp: 'Games', w: 'Wins', l: 'Losses', pts: 'Points', fm: 'FM label', radioStreamUrl: 'Radio live stream link (MP3 / AAC / Icecast or HLS .m3u8)', breaking: 'Breaking-news ticker', dek: 'Standfirst', blurb: 'Blurb', byline: 'Byline', sports: 'Sports tabs', scores: 'Scores strip', side: 'Side stories', clips: 'Highlight clips', standings: 'Standings', lead: 'Top story', sportsDesk: 'Sports Desk box' };
const TUPLES = { tvWeekday: ['Time', 'Show', 'Description', 'On now'], tvWeekend: ['Time', 'Show', 'Description', 'On now'], radioWeekday: ['Time', 'Show', 'Description', 'On now'], radioWeekend: ['Time', 'Show', 'Description', 'On now'], items: ['Title', 'When / info', 'Colour'] };
const LONG = /^(desc|dek|blurb|message|text|content|breaking|sub)$/i;
const IMG = /^(image|img|heroimage|cover|photo|src|avatar|poster)$/i;
const human = (k) => NICE[k] || String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v);
const titleOf = (o, i) => (o && typeof o === 'object' ? o.title || o.name || o.label || o.show || o.team || o.tag || o.status : null) || `Item ${i + 1}`;
const blankLike = (sample) => {
  if (Array.isArray(sample)) return sample.map(() => '');
  if (sample && typeof sample === 'object') return Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blankLike(v)]));
  return typeof sample === 'number' ? 0 : typeof sample === 'boolean' ? false : '';
};
const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const n = [...arr]; [n[i], n[j]] = [n[j], n[i]]; return n; };

function Leaf({ k, value, onChange }) {
  const [pick, setPick] = useState(false);
  if (typeof value === 'boolean') return <label className="ad-check"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {value ? 'Yes' : 'No'}</label>;
  if (typeof value === 'number') return <input className="ad-input" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />;
  const s = value ?? '';
  if (isHex(s) || /colou?r|^bg$/i.test(k)) return (
    <div className="ad-colour"><input type="color" value={isHex(s) && s.length === 7 ? s : '#444444'} onChange={(e) => onChange(e.target.value)} /><input className="ad-input" value={s} onChange={(e) => onChange(e.target.value)} /></div>
  );
  if (IMG.test(k)) return (
    <div className="ad-imgfield">
      {s && <img src={s} alt="" />}
      <input className="ad-input" value={s} placeholder="Image address" onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="ad-btn" onClick={() => setPick(true)}>Choose image</button>
      {pick && <MediaPicker onClose={() => setPick(false)} onPick={(m) => { onChange(m.url); setPick(false); }} />}
    </div>
  );
  if (LONG.test(k) || String(s).length > 90) return <textarea className="ad-input" rows={3} value={s} onChange={(e) => onChange(e.target.value)} />;
  return <input className="ad-input" value={s} onChange={(e) => onChange(e.target.value)} />;
}

function Tuple({ labels, rows, onChange }) {
  const cols = Math.max(labels?.length || 0, ...rows.map((r) => r.length), 1);
  const names = Array.from({ length: cols }, (_, i) => labels?.[i] || `Field ${i + 1}`);
  const set = (ri, ci, v) => onChange(rows.map((r, i) => {
    if (i !== ri) return r;
    const n = Array.from({ length: cols }, (_, c) => (c === ci ? v : r[c] ?? (names[c] === 'On now' ? false : '')));
    while (n.length > 2 && (n[n.length - 1] === '' || n[n.length - 1] === false)) n.pop();
    return n;
  }));
  return (
    <div className="ad-table">
      <div className="ad-tr ad-th" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr)) 92px` }}>{names.map((n) => <span key={n}>{n}</span>)}<span /></div>
      {rows.map((r, ri) => (
        <div key={ri} className="ad-tr" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr)) 92px` }}>
          {names.map((n, ci) => n === 'On now'
            ? <label key={ci} className="ad-check"><input type="checkbox" checked={r[ci] === true} onChange={(e) => set(ri, ci, e.target.checked)} />live</label>
            : <input key={ci} className="ad-input" value={r[ci] ?? ''} onChange={(e) => set(ri, ci, e.target.value)} />)}
          <span className="ad-rowbtns">
            <button type="button" title="Move up" onClick={() => onChange(move(rows, ri, -1))}>↑</button>
            <button type="button" title="Move down" onClick={() => onChange(move(rows, ri, 1))}>↓</button>
            <button type="button" title="Remove" className="danger" onClick={() => onChange(rows.filter((_, i) => i !== ri))}>✕</button>
          </span>
        </div>
      ))}
      <button type="button" className="ad-btn ad-add" onClick={() => onChange([...rows, Array(Math.min(cols, 3)).fill('')])}>+ Add row</button>
    </div>
  );
}

function Card({ i, item, total, onChange, onMove, onRemove, onDup }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ad-card">
      <div className="ad-cardhead">
        <button type="button" className="ad-cardtitle" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} {titleOf(item, i)}</button>
        <span className="ad-rowbtns">
          <button type="button" disabled={i === 0} onClick={() => onMove(-1)} title="Move up">↑</button>
          <button type="button" disabled={i === total - 1} onClick={() => onMove(1)} title="Move down">↓</button>
          <button type="button" onClick={onDup} title="Duplicate">⧉</button>
          <button type="button" className="danger" onClick={onRemove} title="Remove">✕</button>
        </span>
      </div>
      {open && <div className="ad-cardbody"><Node value={item} onChange={onChange} k="item" /></div>}
    </div>
  );
}

export default function Node({ value, onChange, k = '', depth = 0 }) {
  if (Array.isArray(value)) {
    if (value.length && value.every((v) => Array.isArray(v))) return <Tuple labels={TUPLES[k]} rows={value} onChange={onChange} />;
    if (value.length === 0 || value.every((v) => typeof v !== 'object' || v === null)) {
      return (
        <div className="ad-list">
          {value.map((v, i) => (
            <div key={i} className="ad-listrow">
              <Leaf k={k} value={v} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} />
              <span className="ad-rowbtns">
                <button type="button" onClick={() => onChange(move(value, i, -1))}>↑</button>
                <button type="button" onClick={() => onChange(move(value, i, 1))}>↓</button>
                <button type="button" className="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
              </span>
            </div>
          ))}
          <button type="button" className="ad-btn ad-add" onClick={() => onChange([...value, ''])}>+ Add</button>
        </div>
      );
    }
    return (
      <div className="ad-cards">
        {value.map((item, i) => (
          <Card key={i} i={i} item={item} total={value.length}
            onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))}
            onMove={(d) => onChange(move(value, i, d))}
            onRemove={() => onChange(value.filter((_, j) => j !== i))}
            onDup={() => onChange([...value.slice(0, i + 1), JSON.parse(JSON.stringify(item)), ...value.slice(i + 1)])} />
        ))}
        <button type="button" className="ad-btn ad-add" onClick={() => onChange([...value, blankLike(value[0])])}>+ Add item</button>
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className={`ad-obj ${depth ? 'nested' : ''}`}>
        {Object.entries(value).map(([key, v]) => {
          const complex = v && typeof v === 'object';
          return (
            <div key={key} className={`ad-field ${complex ? 'complex' : ''}`}>
              <label>{human(key)}</label>
              {complex ? <Node k={key} value={v} depth={depth + 1} onChange={(nv) => onChange({ ...value, [key]: nv })} /> : <Leaf k={key} value={v} onChange={(nv) => onChange({ ...value, [key]: nv })} />}
            </div>
          );
        })}
      </div>
    );
  }
  return <Leaf k={k} value={value} onChange={onChange} />;
}
