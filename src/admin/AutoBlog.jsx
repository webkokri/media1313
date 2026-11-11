import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, ago } from './adminApi.js';
import { Badge, confirmAction, Page, Status, useLoad, useToast, useUnsavedWarning } from './ui.jsx';

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const TZ = ['America/Toronto', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Vancouver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'UTC'];
const fmt = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const uid = () => Math.random().toString(36).slice(2, 10);

export default function AutoBlog() {
  const s = useLoad(() => adminApi.get('/autoblog'));
  const toast = useToast();
  const [f, setF] = useState(null);
  const [orig, setOrig] = useState('');
  const [busy, setBusy] = useState('');
  const [keyIn, setKeyIn] = useState('');
  const [bulk, setBulk] = useState('');
  const [runTopic, setRunTopic] = useState('');
  const [gModels, setGModels] = useState(null);
  const d = s.data;

  useEffect(() => { if (d) { setF(d.settings); setOrig(JSON.stringify(d.settings)); } }, [d?.settings]);   // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = f && JSON.stringify(f) !== orig;
  useUnsavedWarning(dirty);
  const times = useMemo(() => (f ? Array.from({ length: f.postsPerDay }, (_, i) => fmt(f.windowStart + ((f.windowEnd - f.windowStart) * i) / f.postsPerDay)) : []), [f]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const setTopic = (i, patch) => setF({ ...f, topics: f.topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const save = async (override = {}, msg = 'Saved') => {
    setBusy('save');
    try { const next = await adminApi.put('/autoblog', { ...f, ...override }); s.reload(); toast(msg); return next; }
    catch (e) { toast(e.message, 'error'); if (override.enabled) setF({ ...f, enabled: false }); } finally { setBusy(''); }
    return null;
  };
  const toggle = () => save({ enabled: !f.enabled }, f.enabled ? 'AI blog turned off' : 'AI blog turned on');
  const saveKey = async () => { setBusy('key'); try { await adminApi.put('/autoblog/key', { provider: f.provider, apiKey: keyIn.trim() }); setKeyIn(''); s.reload(); toast('API key saved'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); } };
  const removeKey = async () => { if (!confirmAction('Remove the saved API key? The AI blog will be turned off.')) return; await adminApi.del(`/autoblog/key?provider=${f.provider}`); s.reload(); toast('API key removed'); };
  const loadModels = async () => { setBusy('models'); try { const r = await adminApi.get('/autoblog/models'); if (r.error) toast(r.error, 'error'); else { setGModels(r.models); toast(`${r.models.length} models available to your key`); } } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); } };
  const runNow = async () => {
    if (dirty) { toast('Save your changes first.', 'error'); return; }
    setBusy('run');
    try { const r = await adminApi.post('/autoblog/run', { topicId: runTopic || undefined }); s.reload(); r.error ? toast(r.error, 'error') : toast(`Written: “${r.result.title}” (${r.result.status === 'draft' ? 'saved as a draft' : 'published'})`); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const addBulk = () => {
    const lines = bulk.split('\n').map((x) => x.trim()).filter(Boolean); if (!lines.length) return;
    setF({ ...f, topics: [...f.topics, ...lines.map((topic) => ({ id: uid(), topic, category: '', notes: '', enabled: true }))] }); setBulk('');
  };

  if (s.error) return <Page title="AI blog"><p className="ad-error">{s.error.message}</p></Page>;
  if (!f || !d) return <Page title="AI blog"><p className="ad-muted">Loading…</p></Page>;
  const sc = d.schedule; const on = d.settings.enabled;

  return (
    <Page title="AI blog" sub="AI writes articles for you on a daily schedule, from the topics you choose. You decide how many a day and whether they go live or wait for your review."
      actions={<button className="ad-btn ad-primary" disabled={!dirty || busy === 'save'} onClick={() => save()}>{busy === 'save' ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>}>
      <Status state={s} />

      <section className={`ad-panel ab-status ${on ? 'on' : ''}`}>
        <div>
          <h2>{on ? 'AI blog is ON' : 'AI blog is OFF'}</h2>
          <p className="ad-muted">{on ? `Today: ${sc.postedToday} of ${sc.target} posts written. Next post ${sc.next.day} at ${sc.next.at} (${sc.timezone}, now ${sc.localTime}).` : 'Nothing will be written until you turn it on.'}</p>
        </div>
        <button className={`ab-switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label="Turn the AI blog on or off" disabled={busy === 'save'} onClick={toggle}><i /></button>
      </section>

      <section className="ad-panel">
        <h2>Schedule</h2>
        <div className="ab-grid">
          <div><label className="ad-label">Posts per day</label><input className="ad-input" type="number" min="1" max="24" value={f.postsPerDay} onChange={set('postsPerDay')} /></div>
          <div><label className="ad-label">Start posting at</label><select className="ad-input" value={f.windowStart} onChange={(e) => setF({ ...f, windowStart: Number(e.target.value) })}>{HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}</select></div>
          <div><label className="ad-label">Stop posting at</label><select className="ad-input" value={f.windowEnd} onChange={(e) => setF({ ...f, windowEnd: Number(e.target.value) })}>{HOURS.slice(1).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}</select></div>
          <div><label className="ad-label">Time zone</label><input className="ad-input" list="ab-tz" value={f.timezone} onChange={set('timezone')} /><datalist id="ab-tz">{TZ.map((z) => <option key={z} value={z} />)}</datalist></div>
        </div>
        <p className="ad-muted" style={{ marginTop: 12 }}>Posts are spread evenly across the day: <strong style={{ color: '#fff' }}>{times.join(' · ')}</strong></p>
        <label className="ad-label">What happens to each article</label>
        <div className="ab-radio">
          <label className={f.mode === 'draft' ? 'on' : ''}><input type="radio" name="mode" checked={f.mode === 'draft'} onChange={() => setF({ ...f, mode: 'draft' })} /><span><strong>Save as a draft for review</strong><em>You read it, then press Publish. Recommended.</em></span></label>
          <label className={f.mode === 'publish' ? 'on' : ''}><input type="radio" name="mode" checked={f.mode === 'publish'} onChange={() => setF({ ...f, mode: 'publish' })} /><span><strong>Publish immediately</strong><em>Goes live on the site as soon as it is written.</em></span></label>
        </div>
      </section>

      <section className="ad-panel">
        <h2>Topics</h2>
        <p className="ad-muted">The AI rotates through your enabled topics, writing a fresh article each time and avoiding repeats. Be specific for better stories.</p>
        <div className="ab-topics">
          {f.topics.map((t, i) => (
            <div key={t.id} className={`ab-topic ${t.enabled ? '' : 'off'}`}>
              <label className="ad-check" title="Use this topic"><input type="checkbox" checked={t.enabled} onChange={(e) => setTopic(i, { enabled: e.target.checked })} /></label>
              <input className="ad-input" value={t.topic} placeholder="e.g. How to prepare your home for winter" onChange={(e) => setTopic(i, { topic: e.target.value })} />
              <select className="ad-input" value={t.category} onChange={(e) => setTopic(i, { category: e.target.value })}><option value="">Category: let the AI choose</option>{d.categories.map((c) => <option key={c}>{c}</option>)}</select>
              <input className="ad-input" value={t.notes} placeholder="Notes for the writer (optional)" onChange={(e) => setTopic(i, { notes: e.target.value })} />
              <button type="button" className="ad-btn sm ghost danger" onClick={() => setF({ ...f, topics: f.topics.filter((_, j) => j !== i) })} aria-label="Remove topic">✕</button>
            </div>
          ))}
          {f.topics.length === 0 && <p className="ad-empty">No topics yet. Add a few below.</p>}
        </div>
        <div className="ab-add">
          <button className="ad-btn" onClick={() => setF({ ...f, topics: [...f.topics, { id: uid(), topic: '', category: '', notes: '', enabled: true }] })}>+ Add a topic</button>
          <div className="ab-bulk"><textarea className="ad-input" rows={3} placeholder="Or paste several topics, one per line" value={bulk} onChange={(e) => setBulk(e.target.value)} /><button className="ad-btn" disabled={!bulk.trim()} onClick={addBulk}>Add all</button></div>
        </div>
      </section>

      <section className="ad-panel">
        <h2>Writing style</h2>
        <div className="ab-grid">
          <div><label className="ad-label">AI provider</label><select className="ad-input" value={f.provider} onChange={set('provider')}>{d.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
          {f.provider === 'gemini'
            ? <div><label className="ad-label">Gemini model</label>
                <select className="ad-input" value={f.model} onChange={set('model')}>
                  {[...new Map([...(gModels || []), ...d.geminiModels, { id: f.model, label: f.model }].map((m) => [m.id, m])).values()].map((m) => <option key={m.id} value={m.id}>{m.label}{m.label === m.id ? '' : ` (${m.id})`}</option>)}
                </select>
                <button type="button" className="ad-btn sm ghost" style={{ marginTop: 6 }} disabled={busy === 'models' || !d.keys.gemini.set} onClick={loadModels}>{busy === 'models' ? 'Loading…' : 'Load my available models'}</button></div>
            : <div><label className="ad-label">Claude model</label><select className="ad-input" value={f.claudeModel} onChange={set('claudeModel')}>{d.models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>}
          {f.provider === 'claude'
            ? <div><label className="ad-label">Effort</label><select className="ad-input" value={f.effort} onChange={set('effort')}><option value="low">Low — fastest, cheapest</option><option value="medium">Medium</option><option value="high">High — most careful</option></select></div>
            : <div />}
          <div><label className="ad-label">Length (words)</label><input className="ad-input" type="number" min="300" max="1800" step="50" value={f.wordCount} onChange={set('wordCount')} /></div>
          <div><label className="ad-label">Language</label><input className="ad-input" value={f.language} onChange={set('language')} /></div>
        </div>
        <label className="ad-label">Tone of voice</label><textarea className="ad-input" rows={2} value={f.tone} onChange={set('tone')} />
        <label className="ad-label">Author byline</label><input className="ad-input" style={{ maxWidth: 320 }} value={f.author} onChange={set('author')} />
        <p className="ad-muted" style={{ marginTop: 12 }}>The AI writes explainers, guides and background pieces — it can’t see today’s news, and it is told never to invent facts, quotes or statistics. Articles are tagged <Badge kind="muted">ai-generated</Badge>. Always have a person review anything sensitive before it goes live.</p>
      </section>

      <section className="ad-panel">
        <h2>{f.provider === 'claude' ? 'Anthropic (Claude) API key' : 'Google Gemini API key'}</h2>
        {d.key.set
          ? <p>Key in use: <Badge kind="ok">{d.key.hint}</Badge> <span className="ad-muted">{d.key.source === 'server' ? '(set on the server)' : '(saved here)'}</span> {d.key.source === 'saved' && <button className="ad-btn sm ghost danger" onClick={removeKey}>Remove</button>}</p>
          : f.provider === 'claude'
            ? <p className="ad-muted">The AI needs an API key from <a className="ad-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a> (Settings → API keys). Usage is billed to your Anthropic account.</p>
            : <p className="ad-muted">Create a free key in <a className="ad-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> (Get API key). It starts with <code>AIza</code> or <code>AQ.</code>. Check Google’s current free-tier limits and pricing for the model you pick.</p>}
        {d.key.source !== 'server' && <div className="ab-key"><input className="ad-input" type="password" autoComplete="off" placeholder={f.provider === 'claude' ? 'sk-ant-…' : 'AIza… or AQ.…'} value={keyIn} onChange={(e) => setKeyIn(e.target.value)} /><button className="ad-btn ad-primary" disabled={!keyIn.trim() || busy === 'key'} onClick={saveKey}>{d.key.set ? 'Replace key' : 'Save key'}</button></div>}
      </section>

      <section className="ad-panel">
        <h2>Try it</h2>
        <p className="ad-muted">Write one article right now to see the result. This doesn’t count toward today’s schedule.</p>
        <div className="ab-run">
          <select className="ad-input" value={runTopic} onChange={(e) => setRunTopic(e.target.value)}><option value="">Next topic in the rotation</option>{d.settings.topics.filter((t) => t.enabled).map((t) => <option key={t.id} value={t.id}>{t.topic}</option>)}</select>
          <button className="ad-btn ad-primary" disabled={busy === 'run' || !d.key.set || d.settings.topics.length === 0} onClick={runNow}>{busy === 'run' ? 'Writing… (up to a minute)' : 'Write one now'}</button>
        </div>
      </section>

      <section className="ad-panel nopad">
        <div className="ad-panelhead" style={{ padding: '18px 20px 0' }}><h2>Activity</h2></div>
        <table className="ad-tbl"><thead><tr><th>When</th><th>Topic</th><th>Result</th><th>Details</th></tr></thead>
          <tbody>
            {d.log.map((r) => (
              <tr key={r.id}>
                <td className="ad-nowrap">{ago(r.created_at)}<div className="ad-mono">{r.source === 'manual' ? 'manual' : 'scheduled'}</div></td>
                <td>{r.topic || '—'}</td>
                <td>{r.status === 'ok' ? <Badge kind="ok">written</Badge> : <Badge kind="warn">failed</Badge>}{r.article_id && <div><Link className="ad-link" to={`/admin/articles/${r.article_id}`}>{r.title}</Link></div>}</td>
                <td className="ad-muted">{r.message}{r.output_tokens ? <div className="ad-mono">{r.model} · {r.input_tokens + r.output_tokens} tokens</div> : null}</td>
              </tr>
            ))}
            {d.log.length === 0 && <tr><td colSpan="4"><p className="ad-empty">Nothing written yet.</p></td></tr>}
          </tbody></table>
      </section>
    </Page>
  );
}
