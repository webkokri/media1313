// Tiny client for the MEDIA 1313 backend (StudioCMS + /api routes).
// Dev: Vite proxies /api to http://localhost:4321.  Production: set VITE_API_URL at build time
// (e.g. https://cms.yourdomain.com/api) or serve the backend under the same domain at /api.
import { useEffect, useState } from 'react';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'm1313_token';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Please try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};

/** Load JSON from the API. Returns { data, loading, error }. Re-fetches when `path` changes. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let live = true;
    setState((s) => ({ data: path === s.path ? s.data : null, loading: true, error: null, path }));
    api.get(path)
      .then((data) => live && setState({ data, loading: false, error: null, path }))
      .catch((error) => live && setState({ data: null, loading: false, error, path }));
    return () => { live = false; };
  }, [path]);
  return state;
}

/** Wrap page content: shows loading / error states, then calls children(data). */
export function Loaded({ state, children }) {
  if (state.error) return <main className="container" style={{ padding: '80px 0' }}><p className="meta">Sorry — this content could not be loaded. {state.error.message}</p></main>;
  if (state.loading || !state.data) return <main className="container" style={{ padding: '80px 0' }}><p className="meta" aria-live="polite">Loading…</p></main>;
  return children(state.data);
}

export function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}
export const clock = (iso) => new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
export const articleMeta = (a) => `${timeAgo(a.publishedAt)} · ${a.readMinutes} min read`;
export const articleTo = (a) => `/news/${a.slug}`;

/** Newsletter signup state for any email form: const nl = useNewsletter('home'); <form onSubmit={nl.submit}> */
export function useNewsletter(source) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const submit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'busy', message: '' });
    try {
      await api.post('/newsletter', { email, source });
      setEmail('');
      setStatus({ state: 'done', message: 'You’re subscribed — thank you!' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };
  return { email, setEmail, status, submit };
}
