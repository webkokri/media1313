import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from './api.jsx';

// Site-wide content (navigation, shows, schedule, podcasts, ...) from GET /api/content.
const ContentContext = createContext(null);

// The admin's visual editor loads this site inside an iframe. In that case we load DRAFT content,
// accept live changes from the editor, and let editors click regions to select them.
const inEditor = (() => {
  try { return window.parent !== window && window.parent.location.pathname.startsWith('/admin/live-edit'); } catch { return false; }
})();

function EditorBridge({ onContent }) {
  const { pathname } = useLocation();
  const go = useNavigate();
  useEffect(() => { window.parent.postMessage({ type: 'm1313:nav', path: pathname }, window.location.origin); }, [pathname]);
  useEffect(() => {
    document.documentElement.classList.add('m1313-editing');
    const onMsg = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'm1313:content') onContent(e.data.content);
      if (e.data?.type === 'm1313:go') go(e.data.path);
      if (e.data?.type === 'm1313:highlight') { // outline the selected block on the page
        let st = document.getElementById('m1313-sel');
        if (!st) { st = document.createElement('style'); st.id = 'm1313-sel'; document.head.appendChild(st); }
        st.textContent = e.data.key ? `[data-edit="${CSS.escape(e.data.key)}"]{outline:3px solid #2563eb !important;outline-offset:-3px}` : '';
      }
    };
    const onClick = (e) => {
      const el = e.target.closest?.('[data-edit],[data-edit-articles]');
      if (!el) return;
      e.preventDefault(); e.stopPropagation();
      window.parent.postMessage({ type: 'm1313:select', key: el.getAttribute('data-edit'), articles: el.hasAttribute('data-edit-articles') && !el.getAttribute('data-edit') }, window.location.origin);
    };
    window.addEventListener('message', onMsg);
    document.addEventListener('click', onClick, true);
    window.parent.postMessage({ type: 'm1313:ready' }, window.location.origin);
    return () => { window.removeEventListener('message', onMsg); document.removeEventListener('click', onClick, true); };
  }, [onContent, go]);
  return null;
}

export function ContentProvider({ children }) {
  const state = useApi(inEditor ? '/admin/content' : '/content');
  const [override, setOverride] = useState(null);
  if (state.error) return <div style={{ padding: 48, fontFamily: 'sans-serif' }}><h1>MEDIA 1313</h1><p>We can’t load the site right now. Please refresh in a moment.</p></div>;
  if (!state.data) return <div style={{ padding: 48, fontFamily: 'sans-serif' }} aria-live="polite">Loading…</div>;
  let content = state.data;
  if (inEditor) { // /admin/content returns { blocks: { KEY: { value, draft } } } — show drafts
    content = Object.fromEntries(Object.entries(state.data.blocks).map(([k, b]) => [k, b.hasDraft ? b.draft : b.value]));
  }
  return (
    <ContentContext.Provider value={override || content}>
      {inEditor && <EditorBridge onContent={setOverride} />}
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => useContext(ContentContext);
