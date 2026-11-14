import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from './adminApi.js';
import { ToastProvider, useLoad } from './ui.jsx';
import { Account, Activity, ArticleEdit, Articles, ContentEdit, ContentList, Dashboard, Leads, MediaPage, Members, SongRequests, Subscribers, Users } from './pages.jsx';
import './admin.css';

const LiveEditor = lazy(() => import('./LiveEditor.jsx'));
const PageBuilder = lazy(() => import('./PageBuilder.jsx'));
const PagesList = lazy(() => import('./PagesList.jsx'));
const AutoBlog = lazy(() => import('./AutoBlog.jsx'));
const Notifications = lazy(() => import('./Notifications.jsx'));
const CodeInjection = lazy(() => import('./CodeInjection.jsx'));
const ShowsManager = lazy(() => import('./ShowsVideos.jsx').then((m) => ({ default: m.ShowsManager })));
const VideosManager = lazy(() => import('./ShowsVideos.jsx').then((m) => ({ default: m.VideosManager })));
const PublicApi = lazy(() => import('./PublicApi.jsx'));

const I = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const NAV = [
  ['/admin', 'Dashboard', 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', true],
  ['/admin/live-edit', 'Live editor', 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  ['/admin/pages', 'Pages', 'M5 3h10l4 4v14H5zM14 3v5h5M9 13h6M9 17h6'],
  ['/admin/articles', 'Articles', 'M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM8 9h8M8 13h8M8 17h4'],
  ['/admin/autoblog', 'AI blog', 'M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9zM5 15l.7 1.6L7.5 17l-1.8.7L5 19.5l-.7-1.8L2.5 17l1.8-.4z', false, null, 'admin'],
  ['/admin/notifications', 'Notifications', 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0', false, null, 'admin'],
  ['/admin/code', 'Code injection', 'M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12', false, null, 'admin'],
  ['/admin/api', 'Public API', 'M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14', false, null, 'admin'],
  ['/admin/content', 'Site content', 'M3 5h18v6H3zM3 15h8v4H3zM15 15h6v4h-6z'],
  ['/admin/shows', 'Shows', 'M4 6h16v10H4zM8 20h8M12 16v4M10 9l5 2-5 2z'],
  ['/admin/videos', 'Videos', 'M3 5h14v14H3zM17 10l4-2v8l-4-2M7 9l4 3-4 3z'],
  ['/admin/media', 'Media', 'M3 5h18v14H3zM8 11l3 3 2-2 4 4M8.5 9.5h.01'],
  ['/admin/leads', 'Enquiries', 'M3 6h18v12H3zM3 7l9 7 9-7', false, 'unread'],
  ['/admin/subscribers', 'Subscribers', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6'],
  ['/admin/requests', 'Song requests', 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  ['/admin/members', 'Members', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  ['/admin/activity', 'Activity', 'M3 12h4l3-8 4 16 3-8h4'],
  ['/admin/users', 'Users', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z', false, null, 'admin'],
];

function Login({ onIn }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { admin } = await adminApi.post('/login', f); try { localStorage.setItem('m1313_admin', '1'); } catch { /* ignore */ } onIn(admin); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <div className="ad-login">
      <form onSubmit={submit} className="ad-loginbox">
        <div className="ad-brand big"><span className="ad-logo">13</span><div><strong>MEDIA 1313</strong><em>Studio</em></div></div>
        <p>Sign in to manage MEDIA 1313.</p>
        <label className="ad-label" htmlFor="ad-email">Email</label>
        <input id="ad-email" className="ad-input" type="email" autoComplete="username" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <label className="ad-label" htmlFor="ad-pass">Password</label>
        <input id="ad-pass" className="ad-input" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="ad-error" role="alert">{err}</p>}
        <button className="ad-btn ad-primary wide" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="ad-muted center">← Back to the site</Link>
      </form>
    </div>
  );
}

function Layout({ admin, onOut }) {
  const stats = useLoad(() => adminApi.get('/stats'), [useLocation().pathname]);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => setMenu(false), [loc.pathname]);
  return (
    <div className={`ad-shell ${menu ? 'menu-open' : ''}`}>
      <aside className="ad-sidebar">
        <Link to="/admin" className="ad-brand"><span className="ad-logo">13</span><strong>Studio</strong></Link>
        <nav aria-label="Admin">
          {NAV.filter((n) => !n[5] || n[5] === admin.role).map(([to, label, d, end, badge]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `ad-nav ${isActive ? 'on' : ''}`}>
              <I d={d} />{label}{badge && stats.data?.[badge] > 0 && <b>{stats.data[badge]}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="ad-sidefoot">
          <a className="ad-nav" href="/" target="_blank" rel="noreferrer">View live site ↗</a>
          <NavLink to="/admin/account" className="ad-who"><strong>{admin.name}</strong><span>{admin.email}</span></NavLink>
          <button className="ad-nav" onClick={onOut}>Sign out</button>
        </div>
      </aside>
      <div className="ad-main">
        <div className="ad-mobilebar"><button className="ad-btn sm" onClick={() => setMenu(!menu)} aria-label="Menu">☰ Menu</button><strong>MEDIA 1313 Studio</strong></div>
        <Outlet />
      </div>
    </div>
  );
}

function Shell() {
  const [admin, setAdmin] = useState(undefined); // undefined = checking, null = signed out
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { adminApi.get('/me').then((d) => { setAdmin(d.admin); try { localStorage.setItem('m1313_admin', '1'); } catch { /* ignore */ } }).catch(() => setAdmin(null)); }, []);
  useEffect(() => { const h = () => setAdmin(null); window.addEventListener('m1313:signed-out', h); return () => window.removeEventListener('m1313:signed-out', h); }, []);
  useEffect(() => { document.title = 'Studio — MEDIA 1313'; document.documentElement.classList.add('ad-root'); return () => document.documentElement.classList.remove('ad-root'); }, []);
  const out = async () => { await adminApi.post('/logout').catch(() => {}); try { localStorage.removeItem('m1313_admin'); } catch { /* ignore */ } setAdmin(null); nav('/admin/login'); };

  if (admin === undefined) return <div className="ad-login"><p className="ad-muted">Loading…</p></div>;
  if (!admin) return loc.pathname === '/admin/login' ? <Login onIn={(a) => { setAdmin(a); nav('/admin'); }} /> : <Navigate to="/admin/login" replace />;
  return (
    <ToastProvider>
      <Routes>
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="live-edit" element={<Suspense fallback={<div className="ad-login"><p className="ad-muted">Loading editor…</p></div>}><LiveEditor admin={admin} /></Suspense>} />
        <Route path="builder/:id" element={<Suspense fallback={<div className="ad-login"><p className="ad-muted">Loading page builder…</p></div>}><PageBuilder /></Suspense>} />
        <Route element={<Layout admin={admin} onOut={out} />}>
          <Route path="pages" element={<Suspense fallback={null}><PagesList /></Suspense>} />
          <Route path="api" element={admin.role === 'admin' ? <Suspense fallback={null}><PublicApi /></Suspense> : <Navigate to="/admin" replace />} />
          <Route path="notifications" element={admin.role === 'admin' ? <Suspense fallback={null}><Notifications /></Suspense> : <Navigate to="/admin" replace />} />
          <Route path="code" element={admin.role === 'admin' ? <Suspense fallback={null}><CodeInjection /></Suspense> : <Navigate to="/admin" replace />} />
          <Route path="autoblog" element={admin.role === 'admin' ? <Suspense fallback={null}><AutoBlog /></Suspense> : <Navigate to="/admin" replace />} />
          <Route index element={<Dashboard admin={admin} />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:id" element={<ArticleEdit />} />
          <Route path="content" element={<ContentList />} />
          <Route path="content/:key" element={<ContentEdit />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="shows" element={<Suspense fallback={null}><ShowsManager /></Suspense>} />
          <Route path="videos" element={<Suspense fallback={null}><VideosManager /></Suspense>} />
          <Route path="leads" element={<Leads />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="requests" element={<SongRequests />} />
          <Route path="members" element={<Members admin={admin} />} />
          <Route path="activity" element={<Activity />} />
          <Route path="users" element={admin.role === 'admin' ? <Users admin={admin} /> : <Navigate to="/admin" replace />} />
          <Route path="account" element={<Account admin={admin} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}

// Mounted under /admin/* so every child route path is relative to /admin.
export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Shell />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
