import { useEffect, useState } from 'react';
import { adminApi, ago } from './adminApi.js';
import { Badge, Page, Status, useLoad, useToast, useUnsavedWarning } from './ui.jsx';
import { currentSubscription, disablePush, enablePush, pushSupported } from '../push.js';

export default function Notifications() {
  const s = useLoad(() => adminApi.get('/push'));
  const toast = useToast();
  const d = s.data;
  const [f, setF] = useState(null); const [orig, setOrig] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ topic: 'all', title: '', body: '', url: '/' });
  const [testOn, setTestOn] = useState(false);
  useEffect(() => { if (d) { setF(d.settings); setOrig(JSON.stringify(d.settings)); } }, [d?.settings]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { currentSubscription().then((x) => setTestOn(!!x)); }, []);
  const dirty = f && JSON.stringify(f) !== orig;
  useUnsavedWarning(dirty);
  if (!f) return <Page title="Notifications"><Status state={s} /></Page>;

  const tick = (k) => (e) => setF({ ...f, [k]: e.target.checked });
  const toggleCat = (c) => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] });
  const save = async (override = {}, text = 'Saved') => {
    setBusy('save');
    try { await adminApi.put('/push', { ...f, ...override }); s.reload(); toast(text); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const send = async () => {
    if (!msg.title.trim()) { toast('Write a title first.', 'error'); return; }
    if (!f.enabled) { toast('Switch notifications on first.', 'error'); return; }
    setBusy('send');
    try { const r = await adminApi.post('/push/send', msg); toast(`Sent to ${r.sent} ${r.sent === 1 ? 'device' : 'devices'}${r.failed ? ` (${r.failed} failed)` : ''}`); setMsg({ ...msg, title: '', body: '' }); s.reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const joinTest = async () => {
    setBusy('test');
    try { if (testOn) { await disablePush(); setTestOn(false); toast('This browser no longer gets test notifications'); } else { await enablePush(['test']); setTestOn(true); toast('Done — pick “Test (this browser only)” below and press Send'); } s.reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const per = d.stats.perTopic;

  return (
    <Page title="Notifications" sub="Browser push notifications — visitors opt in with the bell in the site header."
      actions={<button className="ad-btn ad-primary" disabled={!dirty || busy === 'save'} onClick={() => save()}>{busy === 'save' ? 'Saving…' : 'Save settings'}</button>}>
      <section className={`ad-panel ab-status ${f.enabled ? 'on' : ''}`}>
        <div>
          <h2>{f.enabled ? 'Notifications are ON' : 'Notifications are OFF'}</h2>
          <p className="ad-muted">{d.stats.total} {d.stats.total === 1 ? 'device is' : 'devices are'} subscribed. When off, the bell is hidden from visitors and nothing is sent.</p>
        </div>
        <button className={`ab-switch ${f.enabled ? 'on' : ''}`} role="switch" aria-checked={f.enabled} aria-label="Turn notifications on or off" disabled={busy === 'save'} onClick={() => { setF({ ...f, enabled: !f.enabled }); save({ enabled: !f.enabled }, f.enabled ? 'Notifications turned off' : 'Notifications turned on'); }}><i /></button>
      </section>

      <section className="ad-panel">
        <h2>When should a notification be sent automatically?</h2>
        <p className="ad-muted">These are the permissions for automatic notifications. Each one only goes to visitors who chose that topic with the bell.</p>
        <label className="ab-check"><input type="checkbox" checked={f.newArticle} onChange={tick('newArticle')} /> <span><strong>New article published</strong> <span className="ad-muted">— sent to the “New stories” topic ({per.news || 0} subscribers)</span></span></label>
        {f.newArticle && (
          <div style={{ margin: '8px 0 4px 28px' }}>
            <p className="ad-muted" style={{ marginBottom: 6 }}>Only for these categories {f.categories.length === 0 && <Badge kind="ok">all categories</Badge>}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {d.categories.map((c) => <button key={c} type="button" className={`ad-btn sm ${f.categories.includes(c) ? 'ad-primary' : 'ghost'}`} onClick={() => toggleCat(c)}>{c}</button>)}
            </div>
            <p className="ad-muted" style={{ marginTop: 6 }}>Pick none to notify for every category.</p>
            <label className="ab-check"><input type="checkbox" checked={f.aiArticles} onChange={tick('aiArticles')} /> Also notify for articles written by the AI blog</label>
          </div>
        )}
        <label className="ab-check"><input type="checkbox" checked={f.newVideo} onChange={tick('newVideo')} /> <span><strong>New video added</strong> <span className="ad-muted">— “New videos” topic ({per.videos || 0})</span></span></label>
        <label className="ab-check"><input type="checkbox" checked={f.breaking} onChange={tick('breaking')} /> <span><strong>Breaking headline changed</strong> <span className="ad-muted">— when you publish a new headline under Site content → Banner (“Breaking news” topic, {per.breaking || 0})</span></span></label>
        <div style={{ marginTop: 14, maxWidth: 360 }}>
          <label className="ad-label">Maximum automatic notifications per day</label>
          <input className="ad-input" type="number" min="1" max="100" value={f.dailyCap} onChange={(e) => setF({ ...f, dailyCap: Number(e.target.value) })} />
          <p className="ad-muted" style={{ marginTop: 4 }}>A safety limit so visitors aren’t flooded. Notifications you send by hand don’t count.</p>
        </div>
        <label className="ad-label" style={{ marginTop: 14 }}>Contact address for push services (optional)</label>
        <input className="ad-input" style={{ maxWidth: 360 }} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="mailto:info@media1313.com" />
      </section>

      <section className="ad-panel">
        <h2>Send a notification now</h2>
        <div className="ab-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div><label className="ad-label">Who gets it</label>
            <select className="ad-input" value={msg.topic} onChange={(e) => setMsg({ ...msg, topic: e.target.value })}>
              <option value="all">Everyone subscribed ({d.stats.total - (per.test && d.stats.total === per.test ? per.test : 0)})</option>
              {d.topics.map((t) => <option key={t.id} value={t.id}>{t.label} ({per[t.id] || 0})</option>)}
              <option value="test">Test (this browser only)</option>
            </select></div>
          <div><label className="ad-label">Opens this page</label><input className="ad-input" value={msg.url} onChange={(e) => setMsg({ ...msg, url: e.target.value })} placeholder="/news/some-story" /></div>
        </div>
        <label className="ad-label">Title</label><input className="ad-input" maxLength={120} value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} />
        <label className="ad-label">Message</label><textarea className="ad-input" rows={2} maxLength={240} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
        <div className="ad-actions" style={{ marginTop: 12 }}>
          <button className="ad-btn ad-primary" disabled={busy === 'send'} onClick={send}>{busy === 'send' ? 'Sending…' : 'Send notification'}</button>
          {pushSupported() && <button className="ad-btn ghost" disabled={busy === 'test' || !f.enabled} onClick={joinTest}>{testOn ? 'Stop test notifications on this browser' : 'Enable test notifications on this browser'}</button>}
        </div>
      </section>

      <section className="ad-panel">
        <h2>Recently sent</h2>
        {d.log.length === 0 ? <p className="ad-muted">Nothing sent yet.</p> : d.log.map((r) => (
          <div key={r.id} className="ad-row"><div><strong>{r.title}</strong> <Badge>{r.source}</Badge> <Badge>{r.topic}</Badge>{r.body && <p className="ad-muted ad-clip">{r.body}</p>}</div><span className="ad-muted ad-nowrap">{r.sent} sent{r.failed ? ` · ${r.failed} failed` : ''} · {ago(r.created_at)}</span></div>
        ))}
      </section>
    </Page>
  );
}
