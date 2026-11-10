import { useState } from 'react';
import MediaPicker from './MediaPicker.jsx';
import { val } from '../builder/css.js';

// Renders the settings controls described in builder/schema.js. `device` = desktop | tablet | mobile.
const SUF = { desktop: '', tablet: '_t', mobile: '_m' };
const DEV = { desktop: 'd', tablet: 't', mobile: 'm' };
const PAGES = ['/', '/news', '/tv', '/radio', '/shows', '/podcasts', '/schedule', '/sports', '/live', '/about', '/about#contact', '/signin'];
const DevIcon = ({ device }) => <span className="ctl-dev" title={`Applies to ${device}`}>{device === 'desktop' ? '🖥' : device === 'tablet' ? '▯' : '📱'}</span>;

function Field({ ctl, device, children, reset }) {
  return (
    <div className="ctl">
      <div className="ctl-label"><label>{ctl.label}</label>{ctl.responsive && <DevIcon device={device} />}{reset}</div>
      {children}
    </div>
  );
}

function Control({ ctl, s, set, device, ctx }) {
  const [pick, setPick] = useState(false);
  const [linked, setLinked] = useState(false);
  const key = ctl.responsive ? ctl.key + SUF[device] : ctl.key;
  const own = s[key];
  const shown = ctl.responsive ? val(s, ctl.key, DEV[device]) : s[ctl.key];
  const reset = ctl.responsive && device !== 'desktop' && own !== undefined ? <button type="button" className="ctl-reset" title="Reset to the larger-screen value" onClick={() => set({ [key]: undefined })}>↺</button> : null;
  const inherited = ctl.responsive && device !== 'desktop' && own === undefined;

  if (ctl.type === 'heading') return <h5 className="ctl-heading">{ctl.label}</h5>;
  if (ctl.type === 'spacing') {
    const sides = [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']];
    const put = (side, v) => { const n = v === '' ? undefined : Number(v); set(linked ? Object.fromEntries(sides.map(([x]) => [ctl.key + x + SUF[device], n])) : { [ctl.key + side + SUF[device]]: n }); };
    return (
      <Field ctl={ctl} device={device}>
        <div className="ctl-spacing">
          {sides.map(([x, l]) => <label key={x}><input type="number" placeholder={val(s, ctl.key + x, DEV[device]) ?? ''} value={s[ctl.key + x + SUF[device]] ?? ''} onChange={(e) => put(x, e.target.value)} /><span>{l}</span></label>)}
          <button type="button" className={`ctl-link ${linked ? 'on' : ''}`} title="Link values" onClick={() => setLinked(!linked)}>🔗</button>
        </div>
      </Field>
    );
  }
  if (ctl.type === 'text') return <Field ctl={ctl}><input className="ctl-input" value={s[ctl.key] ?? ''} onChange={(e) => set({ [ctl.key]: e.target.value })} /></Field>;
  if (ctl.type === 'textarea') return <Field ctl={ctl}><textarea className={`ctl-input ${ctl.mono ? 'mono' : ''}`} rows={ctl.rows || 3} value={s[ctl.key] ?? ''} onChange={(e) => set({ [ctl.key]: e.target.value })} /></Field>;
  if (ctl.type === 'link') return <Field ctl={ctl}><input className="ctl-input" list="pb-pages" placeholder="/page or https://…" value={s[ctl.key] ?? ''} onChange={(e) => set({ [ctl.key]: e.target.value })} /><datalist id="pb-pages">{PAGES.map((p) => <option key={p} value={p} />)}</datalist></Field>;
  if (ctl.type === 'switch') return <Field ctl={ctl}><label className="ctl-switch"><input type="checkbox" checked={!!s[ctl.key]} onChange={(e) => set({ [ctl.key]: e.target.checked })} /><i /></label></Field>;
  if (ctl.type === 'select') {
    const options = ctl.dynamic === 'categories' ? [['All', 'All'], ...(ctx.categories || []).filter((c) => c !== 'All').map((c) => [c, c])] : ctl.options;
    return <Field ctl={ctl}><select className="ctl-input" value={s[ctl.key] ?? ''} onChange={(e) => set({ [ctl.key]: e.target.value })}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
  }
  if (ctl.type === 'color') return (
    <Field ctl={ctl} reset={s[ctl.key] ? <button type="button" className="ctl-reset" onClick={() => set({ [ctl.key]: undefined })}>✕</button> : null}>
      <div className="ctl-colour"><input type="color" value={/^#[0-9a-f]{6}$/i.test(s[ctl.key] || '') ? s[ctl.key] : '#ffffff'} onChange={(e) => set({ [ctl.key]: e.target.value })} /><input className="ctl-input" placeholder="Default" value={s[ctl.key] ?? ''} onChange={(e) => set({ [ctl.key]: e.target.value })} /></div>
    </Field>
  );
  if (ctl.type === 'image') return (
    <Field ctl={ctl}>
      <div className="ctl-image">{s[ctl.key] ? <img src={s[ctl.key]} alt="" /> : <div className="ctl-noimg">No image</div>}
        <div><button type="button" className="ctl-btn" onClick={() => setPick(true)}>{s[ctl.key] ? 'Change' : 'Choose image'}</button>{s[ctl.key] && <button type="button" className="ctl-btn ghost" onClick={() => set({ [ctl.key]: '' })}>Remove</button>}</div></div>
      {pick && <MediaPicker onClose={() => setPick(false)} onPick={(m) => { set({ [ctl.key]: m.url }); setPick(false); }} />}
    </Field>
  );
  if (ctl.type === 'align') return (
    <Field ctl={ctl} device={device} reset={reset}>
      <div className={`ctl-align ${inherited ? 'inh' : ''}`}>{[['left', '⇤'], ['center', '↔'], ['right', '⇥']].map(([v, ic]) => <button key={v} type="button" className={shown === v ? 'on' : ''} title={v} onClick={() => set({ [key]: v })}>{ic}</button>)}</div>
    </Field>
  );
  if (ctl.type === 'range') return (
    <Field ctl={ctl} device={device} reset={reset}>
      <div className={`ctl-range ${inherited ? 'inh' : ''}`}>
        <input type="range" min={ctl.min} max={ctl.max} step={ctl.step} value={shown ?? ctl.min} onChange={(e) => set({ [key]: Number(e.target.value) })} />
        <input type="number" min={ctl.min} max={ctl.max} step={ctl.step} value={shown ?? ''} onChange={(e) => set({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })} />
        {ctl.unit && <span>{ctl.unit}</span>}
      </div>
    </Field>
  );
  if (ctl.type === 'repeater') {
    const items = s[ctl.key] || [];
    const put = (n) => set({ [ctl.key]: n });
    const mv = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; put(n); };
    return (
      <Field ctl={ctl}>
        <div className="ctl-rep">
          {items.map((it, i) => (
            <details key={i} className="ctl-repitem" open={items.length <= 2}>
              <summary><span>{it.title || it.text || it.alt || it.src?.split('/').pop() || `Item ${i + 1}`}</span><span className="ctl-repbtns"><button type="button" onClick={(e) => { e.preventDefault(); mv(i, -1); }}>↑</button><button type="button" onClick={(e) => { e.preventDefault(); mv(i, 1); }}>↓</button><button type="button" onClick={(e) => { e.preventDefault(); put(items.filter((_, j) => j !== i)); }}>✕</button></span></summary>
              <div className="ctl-repbody">{ctl.fields.map((f) => <Control key={f.key} ctl={f} s={it} device="desktop" ctx={ctx} set={(patch) => put(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))} />)}</div>
            </details>
          ))}
          <button type="button" className="ctl-btn" onClick={() => put([...items, { ...ctl.blank }])}>+ Add item</button>
        </div>
      </Field>
    );
  }
  return null;
}

export default function Controls({ spec, s, onSet, device, ctx }) {
  return <div className="ctls">{spec.map((c, i) => <Control key={c.key || `h${i}`} ctl={c} s={s} set={onSet} device={device} ctx={ctx} />)}</div>;
}
