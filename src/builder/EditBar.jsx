import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// A small floating button on every public page, visible only to signed-in admins (like WordPress's "Edit with Elementor").
const HINT = 'm1313_admin';
const slugOf = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, ''));
const hasHint = () => { try { return !!localStorage.getItem(HINT); } catch { return false; } };

export default function EditBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!hasHint() || window.parent !== window) return;
    fetch('/api/admin/me', { credentials: 'same-origin' }).then((r) => { if (r.ok) setOk(true); else { try { localStorage.removeItem(HINT); } catch { /* ignore */ } } }).catch(() => {});
  }, []);
  if (!ok) return null;
  const isArticle = /^\/news\/.+/.test(pathname);
  const go = async () => {
    if (isArticle) { window.location.assign('/admin/articles'); return; }
    setBusy(true);
    try {
      const slug = slugOf(pathname); const h = { 'Content-Type': 'application/json', 'X-Requested-With': 'm1313' };
      const list = await (await fetch('/api/admin/pages', { credentials: 'same-origin' })).json();
      let page = list.pages.find((p) => p.slug === slug);
      if (!page) { // first time: make an editable copy from the page's starter layout
        const { BUILTIN_PAGES, PAGE_TEMPLATES } = await import('./schema.js');
        const b = BUILTIN_PAGES[slug]; const title = b?.title || slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
        const res = await fetch('/api/admin/pages', { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ title, slug, tree: (b || PAGE_TEMPLATES.blank).build() }) });
        if (!res.ok) throw new Error((await res.json()).error || 'Could not create the page');
        page = (await res.json()).page;
      }
      window.location.assign(`/admin/builder/${page.id}`);
    } catch (e) { window.alert(e.message); setBusy(false); }
  };
  return (
    <button type="button" onClick={go} disabled={busy} className="m1313-editbtn" title="Open this page in the page builder">
      <span aria-hidden="true">✎</span> {busy ? 'Opening…' : isArticle ? 'Edit article' : 'Edit with page builder'}
    </button>
  );
}
