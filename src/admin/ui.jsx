import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ---- tiny data loader: const { data, error, loading, reload } = useLoad(() => adminApi.get('/x'), [deps]) ----
export function useLoad(fn, deps = []) {
  const [s, setS] = useState({ data: null, error: null, loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setS((p) => ({ ...p, loading: true, error: null }));
    fn().then((data) => live && setS({ data, error: null, loading: false })).catch((error) => live && setS({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...s, reload: useCallback(() => setN((x) => x + 1), []) };
}

// ---- toasts ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`ad-toast ${t.kind}`}>{t.message}</div>)}</div>
    </ToastCtx.Provider>
  );
}

export const Page = ({ title, sub, actions, children }) => (
  <div className="ad-page">
    <header className="ad-pagehead">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="ad-actions">{actions}</div>
    </header>
    {children}
  </div>
);
export const Badge = ({ kind = 'muted', children }) => <span className={`ad-badge ${kind}`}>{children}</span>;
export const Empty = ({ children }) => <div className="ad-empty">{children}</div>;
export const Status = ({ state }) => (state.error ? <p className="ad-error">{state.error.message}</p> : state.loading && !state.data ? <p className="ad-muted">Loading…</p> : null);
export function confirmAction(msg) { return window.confirm(msg); }

/** Warn before leaving the page with unsaved edits. */
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}
