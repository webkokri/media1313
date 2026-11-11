import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { articleTo, useApi } from '../api.jsx';
import { useContent } from '../content.jsx';

const PLACEHOLDER = /^Breaking alert headline appears here/i;
function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Scrolling "breaking" ticker: a fresh random pick of published stories on every page load. */
export default function NewsTicker({ label }) {
  const { SITE } = useContent();
  const feed = useApi('/articles?limit=40');
  const items = useMemo(() => shuffle(feed.data?.articles || []).slice(0, 10), [feed.data]);
  const pinned = SITE?.breaking && !PLACEHOLDER.test(SITE.breaking) ? SITE.breaking : null;   // a headline typed into the admin goes first
  const dur = Math.max(30, (items.length + (pinned ? 1 : 0)) * 7);
  const track = (suffix) => (
    <ul key={suffix} className="ticker-list" aria-hidden={suffix ? 'true' : undefined}>
      {pinned && <li><span>{pinned}</span></li>}
      {items.map((a) => <li key={a.slug}><Link to={articleTo(a)} tabIndex={suffix ? -1 : undefined}>{a.title}</Link></li>)}
    </ul>
  );
  return (
    <div className="ticker">
      <div className="container">
        <strong>{label || 'BREAKING'}</strong>
        {items.length || pinned
          ? <div className="ticker-view" role="marquee" aria-label="Latest stories"><div className="ticker-track" style={{ animationDuration: `${dur}s` }}>{track('')}{track('b')}</div></div>
          : <p>{SITE?.breaking}</p>}
      </div>
    </div>
  );
}
