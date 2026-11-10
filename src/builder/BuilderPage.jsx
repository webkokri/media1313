import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useApi } from '../api.jsx';
import { PageRender } from './Render.jsx';

export function NotFound() {
  useEffect(() => { document.title = 'Page not found — MEDIA 1313'; }, []);
  return (
    <main className="container stack" style={{ padding: '96px 24px', gap: 16, textAlign: 'center', alignItems: 'center' }}>
      <h1 className="page-title">Page not found</h1>
      <p className="meta">We couldn’t find that page. It may have moved.</p>
      <Link to="/" className="btn btn--red">Back to the homepage</Link>
    </main>
  );
}

/** A page made in the page builder (/admin → Pages). Shown instead of the built-in page at the same address. */
export default function BuilderPage({ slug }) {
  const q = useApi(`/pages/${encodeURIComponent(slug)}`);
  const page = q.data;
  useEffect(() => {
    if (!page) return undefined;
    const prev = document.title; document.title = `${page.title} — MEDIA 1313`;
    let meta = document.querySelector('meta[name="description"]'); const old = meta?.content; 
    if (page.settings?.description) { if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); } meta.content = page.settings.description; }
    return () => { document.title = prev; if (meta && old !== undefined) meta.content = old; };
  }, [page]);
  const bare = page?.settings?.layout === 'canvas';
  return (
    <div className="app">
      {!bare && <Header />}
      {q.error ? <NotFound /> : !page ? <main className="container" style={{ padding: '80px 24px' }}><p className="meta" aria-live="polite">Loading…</p></main> : <main><PageRender tree={page.tree} /></main>}
      {!bare && <Footer />}
    </div>
  );
}
