import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Placeholder, PillTabs, PlayIcon, VideoCard } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import { articleMeta, articleTo, timeAgo, useApi } from '../api.jsx';

export default function News() {
  const { NEWS_CATEGORIES, VIDEOS } = useContent();
  const [cat, setCat] = useState('All');
  const [pageSize, setPageSize] = useState(7); // 1 lead + 6 cards; "Load more" adds 6
  const list = useApi(`/articles?category=${encodeURIComponent(cat)}&limit=${pageSize + 1}`);
  const recent = useApi('/articles?limit=5');
  const all = list.data?.articles ?? [];
  const lead = all[0];
  const stories = all.slice(1, pageSize);
  const hasMore = all.length > pageSize;
  const changeCat = (c) => { setCat(c); setPageSize(7); };

  return (
    <main className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 40 }}>
      <div data-edit="NEWS_CATEGORIES" className="stack" style={{ gap: 20, borderBottom: '3px solid var(--ink)', paddingBottom: 20 }}>
        <h1 className="page-title">News</h1>
        <PillTabs label="News sections" options={NEWS_CATEGORIES} value={cat} onChange={changeCat} />
      </div>

      <div className="row" style={{ gap: 40 }}>
        <div data-edit-articles="1" className="stack" style={{ flex: '999 1 640px', minWidth: 0, gap: 36 }}>
          {list.error && <p role="alert" className="meta">Sorry — stories could not be loaded. {list.error.message}</p>}
          {!list.error && !list.data && <p className="meta" aria-live="polite">Loading…</p>}
          {lead && <Link to={articleTo(lead)} style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center' }}>
            <Placeholder ratio="4-3" label="Lead image 4:3" style={{ flex: '1 1 380px' }} />
            <div className="stack" style={{ flex: '1 1 320px', gap: 12 }}>
              <span className="kicker kicker--red">{cat === 'All' ? 'TOP STORY' : `${cat.toUpperCase()} · TOP STORY`}</span>
              <span className="headline" style={{ fontSize: 44, lineHeight: 1.02, color: 'var(--ink)' }}>{lead.title}</span>
              <span style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--body)' }}>{lead.dek}</span>
              <span className="meta">{lead.author && `By ${lead.author} · `}Updated {timeAgo(lead.updatedAt)}</span>
            </div>
          </Link>}

          {list.data && stories.length === 0 ? (
            <p className="meta">{lead ? `No other ${cat} stories right now.` : `No ${cat} stories right now.`}</p>
          ) : (
            <div className="grid grid-260" style={{ gap: '32px 28px' }}>
              {stories.map((s) => (
                <Link key={s.slug} to={articleTo(s)} className="card-link">
                  <Placeholder ratio="16-10" />
                  <span className="kicker kicker--red" style={{ fontSize: 11 }}>{s.kicker}</span>
                  <span className="headline" style={{ fontSize: 24, color: 'var(--ink)' }}>{s.title}</span>
                  <span className="meta">{articleMeta(s)}</span>
                </Link>
              ))}
            </div>
          )}

          <div data-edit="VIDEOS" className="box box--night stack" style={{ gap: 20, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="display" style={{ fontSize: 30 }}>News on video</h2>
              <Link to="/tv" style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>More on 1313 TV</Link>
            </div>
            <div className="grid grid-200" style={{ gap: 20 }}>
              {VIDEOS.slice(0, 3).map((v) => <VideoCard key={v.title} dark title={v.title} duration={v.dur} />)}
            </div>
          </div>

          {hasMore && <button type="button" onClick={() => setPageSize(pageSize + 6)} className="btn btn--outline" style={{ alignSelf: 'center', minHeight: 48, padding: '0 32px', color: 'var(--ink)', background: '#fff' }}>Load more stories</button>}
        </div>

        <aside className="side-col stack" style={{ gap: 28 }}>
          <div className="box box--paper" style={{ borderRadius: 8, padding: 22 }}>
            <h2 className="box-title">Most read</h2>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {(recent.data?.articles ?? []).map((a, i) => (
                <li key={a.slug} className="list-row list-row--paper" style={{ padding: '14px 0' }}>
                  <span className="cond" style={{ fontWeight: 800, fontSize: 32, lineHeight: 1, color: 'var(--red-dark)', width: 24 }}>{i + 1}</span>
                  <Link to={articleTo(a)} style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{a.title}</Link>
                </li>
              ))}
            </ol>
          </div>
          <div className="box box--ink stack" style={{ gap: 12, borderRadius: 8, padding: 22 }}>
            <span className="kicker kicker--amber">LISTEN</span>
            <h2 className="headline" style={{ fontSize: 28, lineHeight: 1.05 }}>News on the hour, every hour on 1313 Radio</h2>
            <Link to="/live" className="btn btn--amber" style={{ alignSelf: 'flex-start' }}><PlayIcon size={14} />Listen live</Link>
          </div>
          <div className="box box--line stack" style={{ gap: 10, borderRadius: 8, padding: 22 }}>
            <h2 className="display" style={{ fontSize: 24 }}>Got a news tip?</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--body)' }}>Send the 1313 newsroom a story, photo or video.</p>
            <Link to="/about#contact" style={{ fontWeight: 700, fontSize: 14, color: 'var(--red-dark)' }}>Contact the newsroom</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
