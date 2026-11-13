import { useEffect, useState } from 'react';
import { adminApi } from './adminApi.js';
import { Page, Status, useLoad, useToast, useUnsavedWarning } from './ui.jsx';

const BOXES = [
  ['head', 'Header code', 'Goes inside <head> on every page. Use for Google Analytics / Tag Manager, Meta Pixel, site-verification tags, fonts, custom CSS.', '<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>'],
  ['bodyStart', 'Body start code', 'Goes right after the opening <body> tag. Use for the Google Tag Manager <noscript> snippet and similar.', '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX" height="0" width="0"></iframe></noscript>'],
  ['footer', 'Footer code', 'Goes just before </body> on every page. Use for chat widgets, tracking scripts that should load last, cookie banners.', '<script>/* runs after the page content */</script>'],
];

function AdSlots({ code }) {
  const toast = useToast(); const s = useLoad(() => adminApi.get('/ads'));
  const [a, setA] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!s.data) return;
    const guess = (code || '').match(/client=(ca-pub-\d+)/)?.[1] || '';        // the publisher ID is usually already in the header code
    setA({ ...s.data, client: s.data.client || guess });
  }, [s.data]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return null;
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });
  const save = async () => { setBusy(true); try { const r = await adminApi.put('/ads', a); setA(r); toast('Ad slots saved — live on the website now'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  return (
    <section className="ad-panel">
      <h2>Ad slots (AdSense display ads)</h2>
      <p className="ad-muted">Places Google display ads on every page, and keeps them working when visitors move between pages. In AdSense create a <em>Display ad</em> unit and copy two things from its code: the publisher ID (<code>data-ad-client</code>, like ca-pub-123…) and the slot number (<code>data-ad-slot</code>). Leave a position empty to skip it. Ads only appear once Google serves them for your site — empty slots take no space.</p>
      <label className="ab-check" style={{ marginTop: 0 }}><input type="checkbox" checked={a.enabled} onChange={(e) => setA({ ...a, enabled: e.target.checked })} /> <strong>{a.enabled ? 'Ad slots are ON' : 'Ad slots are OFF'}</strong></label>
      <div className="ab-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 12 }}>
        <div><label className="ad-label">Publisher ID</label><input className="ad-input" value={a.client} onChange={set('client')} placeholder="ca-pub-1234567890123456" /></div>
        <div><label className="ad-label">Top of every page (under the header)</label><input className="ad-input" inputMode="numeric" value={a.top} onChange={set('top')} placeholder="Slot number" /></div>
        <div><label className="ad-label">Inside articles (before “Share this story”)</label><input className="ad-input" inputMode="numeric" value={a.article} onChange={set('article')} placeholder="Slot number" /></div>
        <div><label className="ad-label">Bottom of every page (above the footer)</label><input className="ad-input" inputMode="numeric" value={a.bottom} onChange={set('bottom')} placeholder="Slot number" /></div>
      </div>
      <p className="ad-muted" style={{ marginTop: 8 }}>In the page builder you can also drop an <strong>Ad unit</strong> widget anywhere and give it its own slot number.</p>
      <div className="ad-actions" style={{ marginTop: 12 }}><button className="ad-btn ad-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save ad slots'}</button></div>
    </section>
  );
}

export default function CodeInjection() {
  const s = useLoad(() => adminApi.get('/code'));
  const toast = useToast();
  const [f, setF] = useState(null); const [orig, setOrig] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (s.data) { setF(s.data); setOrig(JSON.stringify([s.data.enabled, s.data.head, s.data.bodyStart, s.data.footer])); } }, [s.data]);
  const dirty = f && JSON.stringify([f.enabled, f.head, f.bodyStart, f.footer]) !== orig;
  useUnsavedWarning(dirty);
  const save = async () => {
    setBusy(true);
    try { const r = await adminApi.put('/code', { enabled: f.enabled, head: f.head, bodyStart: f.bodyStart, footer: f.footer }); setF(r); setOrig(JSON.stringify([r.enabled, r.head, r.bodyStart, r.footer])); toast('Saved — live on the website now'); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  if (!f) return <Page title="Code injection"><Status state={s} /></Page>;
  return (
    <Page title="Code injection" sub="Add tracking, verification and widget code to every page of the website." actions={<button className="ad-btn ad-primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save & publish'}</button>}>
      <section className="ad-panel">
        <label className="ab-check" style={{ marginTop: 0 }}><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> <strong>{f.enabled ? 'Injection is ON' : 'Injection is OFF'}</strong> <span className="ad-muted">— turn off to remove all of this code from the site without deleting it</span></label>
        <p className="ad-muted" style={{ marginTop: 10 }}>Saved code goes live on the website straight away — no rebuild needed. Visitors who already have a page open get it on their next page load. This code runs on your public pages with full access, so only paste code from sources you trust (a broken snippet can break the site; switch injection off to recover).</p>
      </section>
      <AdSlots code={f.head} />
      {BOXES.map(([k, title, help, ph]) => (
        <section className="ad-panel" key={k}>
          <h2>{title}</h2><p className="ad-muted">{help}</p>
          <textarea className="ad-input ci-code" rows={9} spellCheck={false} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          <p className="ad-muted" style={{ marginTop: 6 }}>{f[k].length.toLocaleString()} / 100,000 characters</p>
        </section>
      ))}
    </Page>
  );
}
