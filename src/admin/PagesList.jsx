import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, ago } from './adminApi.js';
import { Badge, confirmAction, Empty, Page, Status, useLoad, useToast } from './ui.jsx';
import { BUILTIN_PAGES, PAGE_TEMPLATES } from '../builder/schema.js';

const BUILT_IN = { home: 'Home', news: 'News', tv: 'TV', radio: 'Radio', shows: 'Shows', podcasts: 'Podcasts', schedule: 'Schedule', sports: 'Sports', live: 'Live', about: 'About' };

function NewPage({ onClose }) {
  const nav = useNavigate(); const toast = useToast();
  const [f, setF] = useState({ title: '', slug: '', template: 'blank' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const { page } = await adminApi.post('/pages', { title: f.title, slug: f.slug || undefined, tree: PAGE_TEMPLATES[f.template].build() }); nav(`/admin/builder/${page.id}`); }
    catch (err) { toast(err.message, 'error'); setBusy(false); }
  };
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label="New page" onClick={onClose}>
      <form className="ad-modalbox" style={{ width: 'min(640px,100%)' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ad-modalhead"><h3>New page</h3><button type="button" className="ad-btn" onClick={onClose}>Close</button></div>
        <label className="ad-label">Title</label><input className="ad-input" required autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Election night coverage" />
        <label className="ad-label">Address</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="ad-muted">media1313.com/</span><input className="ad-input" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="auto from title — use “home” to replace the homepage" /></div>
        <label className="ad-label">Start from</label>
        <div className="ad-tplgrid">{Object.entries(PAGE_TEMPLATES).map(([k, t]) => <button type="button" key={k} className={`ad-tpl ${f.template === k ? 'on' : ''}`} onClick={() => setF({ ...f, template: k })}><strong>{t.label}</strong><span>{t.desc}</span></button>)}</div>
        <button className="ad-btn ad-primary" disabled={busy} type="submit" style={{ marginTop: 18 }}>{busy ? 'Creating…' : 'Create and open the builder'}</button>
      </form>
    </div>
  );
}

export default function PagesList() {
  const s = useLoad(() => adminApi.get('/pages'));
  const toast = useToast(); const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const taken = new Set((s.data?.pages || []).map((p) => p.slug));
  const customize = async (slug) => {
    try { const b = BUILTIN_PAGES[slug]; const { page } = await adminApi.post('/pages', { title: b.title, slug, tree: b.build() }); nav(`/admin/builder/${page.id}`); }
    catch (e) { toast(e.message, 'error'); }
  };
  const act = async (fn, msg) => { try { await fn(); if (msg) toast(msg); s.reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <Page title="Pages" sub="Design pages with the visual page builder. A published page replaces the built-in page at the same address — name one “home” to rebuild the homepage."
      actions={<button className="ad-btn ad-primary" onClick={() => setCreating(true)}>+ New page</button>}>
      <Status state={s} />
      <section className="ad-panel nopad">
        <table className="ad-tbl"><thead><tr><th>Title</th><th>Address</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {(s.data?.pages || []).map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/builder/${p.id}`} className="ad-link"><strong>{p.title}</strong></Link>{BUILT_IN[p.slug] && <div className="ad-mono">replaces the built-in {BUILT_IN[p.slug]} page</div>}</td>
                <td className="ad-mono">{p.slug === 'home' ? '/' : `/${p.slug}`}</td>
                <td><Badge kind={p.status === 'published' ? 'ok' : 'warn'}>{p.status}</Badge>{p.status === 'published' && p.hasDraft && <> <Badge kind="muted">unpublished edits</Badge></>}</td>
                <td>{ago(p.updatedAt)}</td>
                <td className="ad-right">
                  <Link className="ad-btn sm ad-primary" to={`/admin/builder/${p.id}`}>Edit with builder</Link>{' '}
                  {p.status === 'published' && <a className="ad-btn sm ghost" href={p.slug === 'home' ? '/' : `/${p.slug}`} target="_blank" rel="noreferrer">View</a>}{' '}
                  <button className="ad-btn sm ghost" onClick={() => act(() => adminApi.post(`/pages/${p.id}/duplicate`), 'Page duplicated')}>Duplicate</button>{' '}
                  <button className="ad-btn sm ghost danger" onClick={() => confirmAction(`Delete “${p.title}”? This cannot be undone.`) && act(() => adminApi.del(`/pages/${p.id}`), 'Page deleted')}>Delete</button>
                </td>
              </tr>
            ))}
            {s.data && s.data.pages.length === 0 && <tr><td colSpan="5"><Empty>No pages yet. Create one to try the page builder.</Empty></td></tr>}
          </tbody></table>
      </section>
      <h2 className="ad-sub">Built-in pages</h2>
      <p className="ad-muted" style={{ margin: '-6px 0 12px' }}>The pages that ship with the site. Customize one to open it in the page builder, pre-filled with the same live content. Nothing changes on the site until you publish.</p>
      <div className="ad-cardsgrid">
        {Object.entries(BUILTIN_PAGES).map(([slug, b]) => (
          <div key={slug} className="ad-tile" style={{ cursor: 'default' }}>
            <div><strong>{b.title}</strong>{taken.has(slug) ? <Badge kind="ok">customized</Badge> : <Badge kind="muted">built-in</Badge>}</div>
            <p className="ad-mono">{slug === 'home' ? '/' : `/${slug}`}</p>
            <div className="ad-btnrow">{taken.has(slug)
              ? <Link className="ad-btn sm" to={`/admin/builder/${(s.data?.pages || []).find((p) => p.slug === slug)?.id}`}>Edit with builder</Link>
              : <button className="ad-btn sm ad-primary" onClick={() => customize(slug)}>Customize with builder</button>}
              <a className="ad-btn sm ghost" href={slug === 'home' ? '/' : `/${slug}`} target="_blank" rel="noreferrer">View</a></div>
          </div>
        ))}
      </div>
      {creating && <NewPage onClose={() => setCreating(false)} />}
    </Page>
  );
}
