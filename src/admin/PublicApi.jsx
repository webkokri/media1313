import { useEffect, useState } from 'react';
import { adminApi, ago } from './adminApi.js';
import { Badge, confirmAction, Page, Status, useLoad, useToast } from './ui.jsx';

export default function PublicApi() {
  const s = useLoad(() => adminApi.get('/public-api'));
  const toast = useToast();
  const [f, setF] = useState(null);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);     // a key that was just created (shown once)
  const [busy, setBusy] = useState('');
  const d = s.data;
  useEffect(() => { if (d) setF(d.settings); }, [d?.settings]);   // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = f && d && JSON.stringify(f) !== JSON.stringify(d.settings);

  const save = async (patch = {}, msg = 'Saved') => { setBusy('save'); try { await adminApi.put('/public-api', { ...f, ...patch }); s.reload(); toast(msg); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); } };
  const create = async (e) => { e.preventDefault(); setBusy('key'); try { const r = await adminApi.post('/public-api/keys', { name }); setFresh(r.created); setName(''); s.reload(); } catch (err) { toast(err.message, 'error'); } finally { setBusy(''); } };
  const copy = (t) => { navigator.clipboard?.writeText(t); toast('Copied'); };
  const act = async (fn, msg) => { try { await fn(); s.reload(); toast(msg); } catch (e) { toast(e.message, 'error'); } };

  if (s.error) return <Page title="Public API"><p className="ad-error">{s.error.message}</p></Page>;
  if (!f || !d) return <Page title="Public API"><p className="ad-muted">Loading…</p></Page>;
  const base = d.baseUrl; const origin = base.replace('/api/v1', '');
  const snippet = `curl ${base}/articles?per_page=5\n\n# with an API key\ncurl -H "X-API-Key: YOUR_KEY" ${base}/live`;

  return (
    <Page title="Public API" sub="Let mobile apps and other websites read your news, live TV and radio info, schedule and shows — and let app users sign in, save articles and follow podcasts."
      actions={<><a className="ad-btn" href="/api/docs" target="_blank" rel="noreferrer">Open the documentation ↗</a><button className="ad-btn ad-primary" disabled={!dirty || busy === 'save'} onClick={() => save()}>{dirty ? 'Save changes' : 'Saved'}</button></>}>
      <Status state={s} />

      <section className={`ad-panel ab-status ${f.enabled ? 'on' : ''}`}>
        <div><h2>The public API is {f.enabled ? 'ON' : 'OFF'}</h2><p className="ad-muted">Base address: <code className="ad-code">{base}</code> <button className="ad-btn sm ghost" onClick={() => copy(base)}>Copy</button></p></div>
        <button className={`ab-switch ${f.enabled ? 'on' : ''}`} role="switch" aria-checked={f.enabled} aria-label="Turn the public API on or off" onClick={() => save({ enabled: !f.enabled }, f.enabled ? 'Public API turned off' : 'Public API turned on')}><i /></button>
      </section>

      <section className="ad-panel">
        <h2>Access</h2>
        <label className="ad-check" style={{ margin: '8px 0 4px' }}><input type="checkbox" checked={f.requireKey} onChange={(e) => setF({ ...f, requireKey: e.target.checked })} /> <span>Require an API key for every request</span></label>
        <p className="ad-muted" style={{ marginTop: 0 }}>{f.requireKey ? 'Only apps and sites with a key below can use the API. Requests without a key get a 401.' : 'Open: anyone can read the public data without a key. Keys are still useful to see which app is making requests.'}</p>
        <div className="ab-grid" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 14 }}>
          <div><label className="ad-label">Websites allowed to call the API from a browser (CORS)</label><input className="ad-input" value={f.corsOrigins} onChange={(e) => setF({ ...f, corsOrigins: e.target.value })} placeholder="* (any website)  or  https://myapp.com, https://www.myapp.com" /><small>Use <code>*</code> to allow any website. Native mobile apps are not affected by this setting.</small></div>
          <div><label className="ad-label">Requests per minute (per person / key)</label><input className="ad-input" type="number" min="10" max="5000" value={f.rateLimit} onChange={(e) => setF({ ...f, rateLimit: Number(e.target.value) })} /><small>Writes (sign-up, forms) are capped at 20 per minute.</small></div>
        </div>
      </section>

      <section className="ad-panel">
        <h2>API keys</h2>
        <p className="ad-muted">Give each app or site its own key so you can see its usage and switch it off without affecting the others. Send it as the <code>X-API-Key</code> header.</p>
        {fresh && (
          <div className="ad-banner" style={{ background: '#06150f', borderColor: '#12493a', color: '#9ae6c8' }}>
            <strong>Copy this key now — it will not be shown again.</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}><code className="ad-code" style={{ flex: '1 1 320px', wordBreak: 'break-all' }}>{fresh.key}</code><button className="ad-btn sm" onClick={() => copy(fresh.key)}>Copy</button><button className="ad-btn sm ghost" onClick={() => setFresh(null)}>I’ve saved it</button></div>
          </div>
        )}
        <form onSubmit={create} className="ab-key" style={{ margin: '12px 0' }}><input className="ad-input" placeholder="Name, e.g. “iOS app” or “partner site”" required value={name} onChange={(e) => setName(e.target.value)} /><button className="ad-btn ad-primary" disabled={busy === 'key'} type="submit">Create key</button></form>
        <table className="ad-tbl" style={{ minWidth: 560 }}>
          <thead><tr><th>Name</th><th>Key</th><th>Requests</th><th>Last used</th><th /></tr></thead>
          <tbody>
            {d.keys.map((k) => (
              <tr key={k.id}>
                <td><strong>{k.name}</strong> {Number(k.revoked) ? <Badge kind="warn">revoked</Badge> : <Badge kind="ok">active</Badge>}<div className="ad-mono">created {ago(k.created_at)}</div></td>
                <td className="ad-mono">{k.key_prefix}…</td>
                <td>{Number(k.requests).toLocaleString()}</td>
                <td>{k.last_used ? ago(k.last_used) : 'never'}</td>
                <td className="ad-right">{!Number(k.revoked) && <button className="ad-btn sm" onClick={() => confirmAction(`Revoke “${k.name}”? Apps using it will stop working.`) && act(() => adminApi.put(`/public-api/keys/${k.id}/revoke`), 'Key revoked')}>Revoke</button>} <button className="ad-btn sm ghost danger" onClick={() => confirmAction(`Delete “${k.name}” permanently?`) && act(() => adminApi.del(`/public-api/keys/${k.id}`), 'Key deleted')}>Delete</button></td>
              </tr>
            ))}
            {d.keys.length === 0 && <tr><td colSpan="5"><p className="ad-empty">No keys yet.</p></td></tr>}
          </tbody>
        </table>
      </section>

      <section className="ad-panel">
        <h2>What apps can do</h2>
        <div className="api-grid">
          {[['News', 'Home feed, articles with filters, categories, tags, search, article bodies as HTML or Markdown'], ['Live', 'Live TV stream (HLS) and radio stream links, what is on now and up next, schedule, shows, podcasts'], ['Site', 'Menu, footer text, categories, and pages made in the page builder'], ['Forms', 'Newsletter signup, contact the newsroom, radio song requests'], ['Accounts', 'Sign up and sign in, saved articles, followed podcasts, delete account (as the app stores require)']].map(([t, x]) => <div key={t} className="api-tile"><strong>{t}</strong><p>{x}</p></div>)}
        </div>
        <label className="ad-label">Try it</label>
        <pre className="ad-pre">{snippet}</pre>
        <p className="ad-muted">The documentation page lists every endpoint with a “Send request” button and code for curl, JavaScript, Swift and Kotlin. The machine-readable spec is at <code>{origin}/api/v1/openapi.json</code> — import it into Postman, or generate an app client from it.</p>
      </section>
    </Page>
  );
}
