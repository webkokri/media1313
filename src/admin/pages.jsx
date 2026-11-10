import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, ago, blockInfo, BLOCKS, fmtDate, GROUPS } from './adminApi.js';
import { Badge, confirmAction, Empty, Page, Status, useLoad, useToast, useUnsavedWarning } from './ui.jsx';
import FormEditor from './FormEditor.jsx';
import MediaPicker from './MediaPicker.jsx';
import Markdown from '../markdown.jsx';

/* ============================== Dashboard ============================== */
export function Dashboard({ admin }) {
  const s = useLoad(() => adminApi.get('/stats'));
  const d = s.data;
  return (
    <Page title={`Welcome back, ${admin.name.split(' ')[0]}`} sub="Everything on the public site is editable here. Publish to push changes live."
      actions={<Link className="ad-btn ad-primary" to="/admin/articles/new">+ New article</Link>}>
      <Status state={s} />
      {d && <>
        <div className="ad-stats">
          {[['Articles', d.articles, `${d.published} published`, '/admin/articles'], ['Enquiries', d.leads, d.unread ? `${d.unread} unread` : 'all read', '/admin/leads'], ['Subscribers', d.subscribers, 'newsletter', '/admin/subscribers'], ['Members', d.members, 'site accounts', '/admin/members'], ['Media', d.media, 'files', '/admin/media'], ['Song requests', d.requests, 'from Radio', '/admin/requests']].map(([l, n, sub, to]) => (
            <Link key={l} to={to} className="ad-stat"><span>{l}</span><strong>{n}</strong><em>{sub}</em></Link>
          ))}
        </div>
        <div className="ad-two">
          <section className="ad-panel">
            <div className="ad-panelhead"><h2>Recent enquiries</h2><Link to="/admin/leads">All enquiries ↗</Link></div>
            {d.recentLeads.length === 0 ? <Empty>No enquiries yet — contact-form messages land here.</Empty> : d.recentLeads.map((l) => (
              <Link key={l.id} to="/admin/leads" className="ad-row"><div><strong>{l.name}</strong> <span className="ad-muted">· {l.topic}</span><p className="ad-clip">{l.message}</p></div><span className="ad-muted">{ago(l.created_at)}</span></Link>
            ))}
          </section>
          <section className="ad-panel">
            <div className="ad-panelhead"><h2>Activity</h2><Link to="/admin/activity">Everything ↗</Link></div>
            {d.activity.map((a, i) => <div key={i} className="ad-row"><div>{a.action} <strong>{a.target}</strong><p className="ad-muted">{a.admin_email}</p></div><span className="ad-muted">{ago(a.created_at)}</span></div>)}
          </section>
        </div>
      </>}
    </Page>
  );
}

/* ============================== Articles ============================== */
export function Articles() {
  const s = useLoad(() => adminApi.get('/articles'));
  const toast = useToast();
  const [q, setQ] = useState('');
  const list = (s.data?.articles || []).filter((a) => `${a.title} ${a.category}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = async (a) => { await adminApi.post(`/articles/${a.id}/status`, { status: a.status === 'published' ? 'draft' : 'published' }); toast(a.status === 'published' ? 'Unpublished' : 'Published'); s.reload(); };
  const remove = async (a) => { if (!confirmAction(`Delete “${a.title}”? This cannot be undone.`)) return; await adminApi.del(`/articles/${a.id}`); toast('Article deleted'); s.reload(); };
  return (
    <Page title="Articles" sub="News stories. Published articles appear on the site under News." actions={<Link className="ad-btn ad-primary" to="/admin/articles/new">+ New</Link>}>
      <input className="ad-input ad-search" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Status state={s} />
      <section className="ad-panel nopad">
        <table className="ad-tbl">
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/admin/articles/${a.id}`} className="ad-link"><strong>{a.title}</strong></Link><div className="ad-mono">/news/{a.slug}</div></td>
                <td>{a.category}</td>
                <td><Badge kind={a.status === 'published' ? 'ok' : 'warn'}>{a.status}</Badge></td>
                <td>{fmtDate(a.updatedAt)}</td>
                <td className="ad-right"><button className="ad-btn sm" onClick={() => toggle(a)}>{a.status === 'published' ? 'Unpublish' : 'Publish'}</button> <Link className="ad-btn sm ghost" to={`/admin/articles/${a.id}`}>Edit</Link> <button className="ad-btn sm ghost danger" onClick={() => remove(a)}>Delete</button></td>
              </tr>
            ))}
            {s.data && list.length === 0 && <tr><td colSpan="5"><Empty>No articles found.</Empty></td></tr>}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

const TOOLS = [['B', '**', '**', 'Bold'], ['I', '*', '*', 'Italic'], ['H2', '\n\n## ', '\n\n', 'Heading'], ['❝', '\n\n> ', '\n\n', 'Quote'], ['•', '\n\n- ', '\n', 'List']];

export function ArticleEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const cats = useLoad(() => adminApi.get('/content'));
  const loaded = useLoad(() => (isNew ? Promise.resolve(null) : adminApi.get(`/articles/${id}`)), [id]);
  const [a, setA] = useState(null);
  const [orig, setOrig] = useState('');
  const [preview, setPreview] = useState(false);
  const [pick, setPick] = useState(null); // 'cover' | 'inline'
  const [saving, setSaving] = useState(false);
  const area = useRef();

  useEffect(() => {
    const base = isNew ? { title: '', slug: '', dek: '', category: 'Local', tags: [], content: '', heroImage: '', status: 'draft', author: '' } : loaded.data?.article;
    if (base) { const x = { ...base, tags: (base.tags || []).join(', ') }; setA(x); setOrig(JSON.stringify(x)); }
  }, [isNew, loaded.data]);
  const dirty = a && JSON.stringify(a) !== orig;
  useUnsavedWarning(dirty);

  const categories = (cats.data?.blocks?.NEWS_CATEGORIES?.value || ['Local', 'World', 'Politics', 'Business', 'Tech', 'Health', 'Entertainment']).filter((c) => c !== 'All');
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });

  const wrap = (before, after) => {
    const el = area.current; const { selectionStart: s, selectionEnd: e } = el;
    const sel = a.content.slice(s, e) || 'text';
    const next = a.content.slice(0, s) + before + sel + after + a.content.slice(e);
    setA({ ...a, content: next });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const insert = (text) => { const el = area.current; const s = el.selectionStart; setA({ ...a, content: a.content.slice(0, s) + text + a.content.slice(el.selectionEnd) }); };

  const save = async (status) => {
    setSaving(true);
    try {
      const body = { ...a, status: status ?? a.status, heroImage: a.heroImage || null };
      const { article } = isNew ? await adminApi.post('/articles', body) : await adminApi.put(`/articles/${id}`, body);
      toast(status === 'published' ? 'Published' : 'Saved');
      const x = { ...article, tags: article.tags.join(', ') }; setA(x); setOrig(JSON.stringify(x));
      if (isNew) nav(`/admin/articles/${article.id}`, { replace: true });
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const remove = async () => { if (!confirmAction('Delete this article? This cannot be undone.')) return; await adminApi.del(`/articles/${id}`); toast('Article deleted'); nav('/admin/articles'); };

  if (loaded.error) return <Page title="Article"><p className="ad-error">{loaded.error.message}</p></Page>;
  if (!a) return <Page title="Article"><p className="ad-muted">Loading…</p></Page>;
  const live = a.status === 'published';
  return (
    <Page title={isNew ? 'New article' : a.title || 'Untitled'} sub={isNew ? 'Write a story, then save it as a draft or publish it.' : `Public address: /news/${a.slug}`}
      actions={<><Link className="ad-btn ghost" to="/admin/articles">Back</Link>{!isNew && live && <a className="ad-btn" href={`/news/${a.slug}`} target="_blank" rel="noreferrer">View live ↗</a>}</>}>
      <div className="ad-editor">
        <section className="ad-panel">
          <div className="ad-fieldrow"><label>Title</label><input className="ad-input big" value={a.title} onChange={set('title')} placeholder="Headline" /></div>
          <div className="ad-fieldrow"><label>Slug</label><input className="ad-input mono" value={a.slug} onChange={set('slug')} placeholder="auto-generated from the title" /></div>
          <div className="ad-fieldrow"><label>Standfirst (excerpt)</label><textarea className="ad-input" rows={2} value={a.dek} onChange={set('dek')} placeholder="One or two sentences that set up the story." /><small>Shown in listings and as the meta description.</small></div>
          <div className="ad-fieldrow">
            <div className="ad-toolbar">
              <label>Story</label>
              <div>
                {TOOLS.map(([t, b, c, title]) => <button key={t} type="button" title={title} className="ad-tool" onClick={() => wrap(b, c)}>{t}</button>)}
                <button type="button" className="ad-tool" title="Link" onClick={() => { const url = window.prompt('Link address (https://…)'); if (url) wrap('[', `](${url})`); }}>🔗</button>
                <button type="button" className="ad-tool" title="Image" onClick={() => setPick('inline')}>🖼</button>
                <button type="button" className={`ad-tool wide ${preview ? 'on' : ''}`} onClick={() => setPreview(!preview)}>{preview ? 'Edit' : 'Preview'}</button>
              </div>
            </div>
            {preview
              ? <div className="ad-preview"><div className="prose"><Markdown source={a.content} /></div></div>
              : <textarea ref={area} className="ad-input story" rows={18} value={a.content} onChange={set('content')} placeholder="Write the story. Separate paragraphs with a blank line. Use ## for headings and > for pull quotes." />}
          </div>
        </section>
        <aside className="ad-side">
          <section className="ad-panel">
            <div className="ad-statusline"><Badge kind={live ? 'ok' : 'warn'}>{live ? 'Published' : 'Draft'}</Badge>{dirty && <span className="ad-muted">Unsaved changes</span>}</div>
            <div className="ad-btnstack">
              {live ? <button className="ad-btn ad-primary" disabled={saving} onClick={() => save('published')}>Update</button> : <button className="ad-btn ad-primary" disabled={saving} onClick={() => save('published')}>Publish</button>}
              <button className="ad-btn" disabled={saving} onClick={() => save(live ? 'draft' : undefined)}>{live ? 'Unpublish (save as draft)' : 'Save draft'}</button>
            </div>
          </section>
          <section className="ad-panel">
            <label className="ad-label">Cover image</label>
            {a.heroImage ? <img className="ad-cover" src={a.heroImage} alt="" /> : <div className="ad-cover empty">No image</div>}
            <div className="ad-btnrow"><button type="button" className="ad-btn sm" onClick={() => setPick('cover')}>{a.heroImage ? 'Change' : 'Choose / upload'}</button>{a.heroImage && <button type="button" className="ad-btn sm ghost danger" onClick={() => setA({ ...a, heroImage: '' })}>Remove</button>}</div>
            <label className="ad-label">Category</label>
            <select className="ad-input" value={a.category} onChange={set('category')}>{[...new Set([a.category, ...categories])].map((c) => <option key={c}>{c}</option>)}</select>
            <label className="ad-label">Tags</label>
            <input className="ad-input" value={a.tags} onChange={set('tags')} placeholder="transit, city council" /><small>Comma-separated.</small>
            <label className="ad-label">Author byline</label>
            <input className="ad-input" value={a.author || ''} onChange={set('author')} placeholder="Your name" />
          </section>
          {!isNew && <button className="ad-btn ghost danger" onClick={remove}>Delete article</button>}
        </aside>
      </div>
      {pick && <MediaPicker onClose={() => setPick(null)} onPick={(m) => { pick === 'cover' ? setA({ ...a, heroImage: m.url }) : insert(`\n\n![${m.alt || ''}](${m.url})\n\n`); setPick(null); }} />}
    </Page>
  );
}

/* ============================== Site content ============================== */
export function ContentList() {
  const s = useLoad(() => adminApi.get('/content'));
  const blocks = s.data?.blocks || {};
  const groups = GROUPS.map((g) => [g, Object.keys(blocks).filter((k) => blockInfo(k).group === g).sort((x, y) => Object.keys(BLOCKS).indexOf(x) - Object.keys(BLOCKS).indexOf(y))]).filter(([, ks]) => ks.length);
  return (
    <Page title="Site content" sub="Menus, schedules, shows, podcasts and more. Save as a draft to preview, then publish." actions={<Link className="ad-btn ad-primary" to="/admin/live-edit">Open live editor</Link>}>
      <Status state={s} />
      {groups.map(([g, ks]) => (
        <section key={g} className="ad-group"><h2>{g}</h2>
          <div className="ad-cardsgrid">
            {ks.map((k) => (
              <Link key={k} to={`/admin/content/${k}`} className="ad-tile">
                <div><strong>{blockInfo(k).label}</strong>{blocks[k].hasDraft && <Badge kind="warn">draft</Badge>}</div>
                <p>{blockInfo(k).desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}

export function ContentEdit() {
  const { key } = useParams();
  const s = useLoad(() => adminApi.get('/content'), [key]);
  const toast = useToast();
  const [v, setV] = useState(null);
  const [orig, setOrig] = useState('');
  const [busy, setBusy] = useState(false);
  const b = s.data?.blocks?.[key];
  useEffect(() => { if (b) { const start = b.hasDraft ? b.draft : b.value; setV(start); setOrig(JSON.stringify(start)); } }, [b]);
  const dirty = v !== null && JSON.stringify(v) !== orig;
  useUnsavedWarning(dirty);
  const info = blockInfo(key);
  const run = async (fn, msg) => { setBusy(true); try { await fn(); toast(msg); s.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  if (s.error) return <Page title={info.label}><p className="ad-error">{s.error.message}</p></Page>;
  if (s.data && !b) return <Page title="Not found"><Empty>That content block does not exist. <Link to="/admin/content">Back to Site content</Link></Empty></Page>;
  if (v === null) return <Page title={info.label}><p className="ad-muted">Loading…</p></Page>;
  return (
    <Page title={info.label} sub={info.desc}
      actions={<><Link className="ad-btn ghost" to="/admin/content">Back</Link><Link className="ad-btn" to={`/admin/live-edit?block=${key}`}>Edit visually</Link>
        <button className="ad-btn" disabled={busy || !dirty} onClick={() => run(() => adminApi.put(`/content/${key}`, { value: v }), 'Draft saved')}>Save draft</button>
        <button className="ad-btn ad-primary" disabled={busy || (!dirty && !b.hasDraft)} onClick={() => run(() => adminApi.put(`/content/${key}`, { value: v, publish: true }), 'Published — live on the site')}>Publish</button></>}>
      {b.hasDraft && <div className="ad-banner">This block has an unpublished draft. <button className="ad-link" onClick={() => run(() => adminApi.del(`/content/${key}/draft`), 'Draft discarded')}>Discard draft</button></div>}
      <section className="ad-panel"><FormEditor value={v} onChange={setV} k={key} /></section>
    </Page>
  );
}

/* ============================== Media library ============================== */
export function MediaPage() {
  const s = useLoad(() => adminApi.get('/media'));
  const toast = useToast();
  const file = useRef();
  const [busy, setBusy] = useState(false);
  const upload = async (files) => {
    setBusy(true);
    for (const f of files) { try { await adminApi.upload(f); } catch (e) { toast(`${f.name}: ${e.message}`, 'error'); } }
    setBusy(false); toast('Upload complete'); s.reload();
  };
  const remove = async (m) => { if (!confirmAction(`Delete ${m.filename}? Pages using it will show a broken image.`)) return; await adminApi.del(`/media/${m.id}`); s.reload(); };
  const saveAlt = async (m, alt) => { await adminApi.put(`/media/${m.id}`, { alt, filename: m.filename }); };
  return (
    <Page title="Media" sub="Upload images and reuse them in articles and site content."
      actions={<><input ref={file} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" hidden onChange={(e) => upload([...e.target.files])} /><button className="ad-btn ad-primary" disabled={busy} onClick={() => file.current.click()}>{busy ? 'Uploading…' : 'Upload'}</button></>}>
      <Status state={s} />
      {s.data && s.data.media.length === 0 && <Empty>No files yet. Upload your first image.</Empty>}
      <div className="ad-mediagrid">
        {(s.data?.media || []).map((m) => (
          <div key={m.id} className="ad-mediacard">
            {m.mime.startsWith('image/') ? <img src={m.url} alt={m.alt || m.filename} loading="lazy" /> : <div className="ad-pdf">PDF</div>}
            <div className="ad-mediameta">
              <span className="ad-clip" title={m.filename}>{m.filename}</span>
              <input className="ad-input sm" defaultValue={m.alt} placeholder="Alt text (describes the image)" onBlur={(e) => e.target.value !== (m.alt || '') && saveAlt(m, e.target.value)} />
              <div className="ad-btnrow"><button className="ad-btn sm" onClick={() => { navigator.clipboard?.writeText(location.origin + m.url); toast('Link copied'); }}>Copy link</button><button className="ad-btn sm ghost danger" onClick={() => remove(m)}>Delete</button></div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/* ============================== Inboxes ============================== */
export function Leads() {
  const s = useLoad(() => adminApi.get('/leads'));
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const mark = async (l, status) => { await adminApi.put(`/leads/${l.id}`, { status }); s.reload(); };
  const remove = async (l) => { if (!confirmAction('Delete this enquiry?')) return; await adminApi.del(`/leads/${l.id}`); toast('Deleted'); s.reload(); };
  return (
    <Page title="Enquiries" sub="Messages sent from the contact form.">
      <Status state={s} />
      {s.data?.leads.length === 0 && <Empty>No enquiries yet.</Empty>}
      <section className="ad-panel nopad">
        {(s.data?.leads || []).map((l) => (
          <div key={l.id} className={`ad-lead ${l.status === 'new' ? 'unread' : ''}`}>
            <button className="ad-leadhead" onClick={() => { setOpen(open === l.id ? null : l.id); if (l.status === 'new') mark(l, 'read'); }}>
              <span><strong>{l.name}</strong> <span className="ad-muted">{l.email}</span></span>
              <span><Badge kind="muted">{l.topic}</Badge> <span className="ad-muted">{ago(l.created_at)}</span> {l.status === 'new' && <Badge kind="ok">new</Badge>}</span>
            </button>
            {open === l.id && <div className="ad-leadbody"><p>{l.message}</p><div className="ad-btnrow"><a className="ad-btn sm ad-primary" href={`mailto:${l.email}?subject=${encodeURIComponent('Re: ' + l.topic)}`}>Reply by email</a><button className="ad-btn sm" onClick={() => mark(l, 'new')}>Mark unread</button><button className="ad-btn sm ghost danger" onClick={() => remove(l)}>Delete</button></div></div>}
          </div>
        ))}
      </section>
    </Page>
  );
}

const csv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); };

function SimpleList({ title, sub, loader, pick, cols, del, exportName, admin }) {
  const s = useLoad(loader);
  const toast = useToast();
  const rows = s.data ? s.data[pick] : [];
  return (
    <Page title={title} sub={sub} actions={exportName && rows.length ? <button className="ad-btn" onClick={() => download(exportName, csv(rows, cols.map((c) => c[0])))}>Export CSV</button> : null}>
      <Status state={s} />
      <section className="ad-panel nopad">
        <table className="ad-tbl">
          <thead><tr>{cols.map(([, h]) => <th key={h}>{h}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id || r.created_at + r.target}>
                {cols.map(([k, , f]) => <td key={k}>{f ? f(r[k], r) : r[k]}</td>)}
                <td className="ad-right">{del && (!admin || admin.role === 'admin') && <button className="ad-btn sm ghost danger" onClick={async () => { if (!confirmAction('Delete this entry?')) return; await adminApi.del(`${del}/${r.id}`); toast('Deleted'); s.reload(); }}>Delete</button>}</td>
              </tr>
            ))}
            {s.data && rows.length === 0 && <tr><td colSpan={cols.length + 1}><Empty>Nothing here yet.</Empty></td></tr>}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
export const Subscribers = () => <SimpleList title="Subscribers" sub="People signed up to The 1313 Briefing." loader={() => adminApi.get('/subscribers')} pick="subscribers" del="/subscribers" exportName="subscribers.csv" cols={[['email', 'Email'], ['source', 'Source'], ['created_at', 'Joined', (v) => fmtDate(v)]]} />;
export const SongRequests = () => <SimpleList title="Song requests" sub="Requests sent from the Radio page." loader={() => adminApi.get('/song-requests')} pick="requests" del="/song-requests" cols={[['request_text', 'Request'], ['created_at', 'Received', (v) => ago(v)]]} />;
export const Members = ({ admin }) => <SimpleList admin={admin} title="Members" sub="Visitors with a MEDIA 1313 account." loader={() => adminApi.get('/members')} pick="members" del="/members" exportName="members.csv" cols={[['name', 'Name'], ['email', 'Email'], ['wants_briefing', 'Briefing', (v) => (Number(v) ? 'Yes' : 'No')], ['created_at', 'Joined', (v) => fmtDate(v)]]} />;
export function Activity() {
  const s = useLoad(() => adminApi.get('/activity'));
  return (
    <Page title="Activity" sub="Who changed what, and when.">
      <Status state={s} />
      <section className="ad-panel">{(s.data?.activity || []).map((a) => <div key={a.id} className="ad-row"><div>{a.action} <strong>{a.target}</strong><p className="ad-muted">{a.admin_email}</p></div><span className="ad-muted">{ago(a.created_at)}</span></div>)}</section>
    </Page>
  );
}

/* ============================== Users & account ============================== */
export function Users({ admin }) {
  const s = useLoad(() => adminApi.get('/users'));
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'editor' });
  const add = async (e) => { e.preventDefault(); try { await adminApi.post('/users', f); toast('User added'); setF({ name: '', email: '', password: '', role: 'editor' }); s.reload(); } catch (err) { toast(err.message, 'error'); } };
  const act = async (fn, msg) => { try { await fn(); toast(msg); s.reload(); } catch (err) { toast(err.message, 'error'); } };
  return (
    <Page title="Users" sub="Administrators can manage everything. Editors can write and edit content but not manage users.">
      <Status state={s} />
      <section className="ad-panel nopad">
        <table className="ad-tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last sign-in</th><th /></tr></thead>
          <tbody>{(s.data?.users || []).map((u) => (
            <tr key={u.id}><td><strong>{u.name}</strong></td><td>{u.email}</td>
              <td><select className="ad-input sm" value={u.role} disabled={u.id === admin.id} onChange={(e) => act(() => adminApi.put(`/users/${u.id}`, { role: e.target.value }), 'Role updated')}><option value="admin">Administrator</option><option value="editor">Editor</option></select></td>
              <td>{u.last_login ? ago(u.last_login) : 'never'}</td>
              <td className="ad-right"><button className="ad-btn sm" onClick={() => { const p = window.prompt(`New password for ${u.email} (10+ characters)`); if (p) act(() => adminApi.put(`/users/${u.id}`, { password: p }), 'Password reset'); }}>Reset password</button> {u.id !== admin.id && <button className="ad-btn sm ghost danger" onClick={() => confirmAction(`Remove ${u.email}?`) && act(() => adminApi.del(`/users/${u.id}`), 'User removed')}>Remove</button>}</td></tr>
          ))}</tbody></table>
      </section>
      <form className="ad-panel ad-form" onSubmit={add}>
        <h2>Add a user</h2>
        <div className="ad-grid4">
          <input className="ad-input" placeholder="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="ad-input" type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className="ad-input" type="text" placeholder="Temporary password (10+ chars)" minLength={10} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <select className="ad-input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="editor">Editor</option><option value="admin">Administrator</option></select>
        </div>
        <button className="ad-btn ad-primary" type="submit">Add user</button>
      </form>
    </Page>
  );
}

export function Account({ admin }) {
  const toast = useToast();
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.again) return toast('The new passwords do not match.', 'error');
    try { await adminApi.put('/me/password', { current: f.current, next: f.next }); toast('Password changed'); setF({ current: '', next: '', again: '' }); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <Page title="Account" sub={`${admin.name} · ${admin.email} · ${admin.role === 'admin' ? 'Administrator' : 'Editor'}`}>
      <form className="ad-panel ad-form narrow" onSubmit={submit}>
        <h2>Change password</h2>
        <label className="ad-label">Current password</label><input className="ad-input" type="password" autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        <label className="ad-label">New password (10+ characters)</label><input className="ad-input" type="password" autoComplete="new-password" minLength={10} required value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        <label className="ad-label">Repeat new password</label><input className="ad-input" type="password" autoComplete="new-password" required value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} />
        <button className="ad-btn ad-primary" type="submit">Update password</button>
      </form>
    </Page>
  );
}
