import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PillTabs } from '../components/ui.jsx';
import { useShows } from '../lists.js';

const FILTERS = { All: null, TV: 'TV', Radio: 'RADIO', Podcasts: 'PODCAST' };
const HREF = { TV: '/tv', RADIO: '/radio', PODCAST: '/podcasts' };

export default function Shows() {
  const { shows: SHOWS, loading } = useShows();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const type = FILTERS[filter];
  const shows = SHOWS.filter((s) => (!type || s.type === type) && s.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <main className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '3px solid var(--ink)', paddingBottom: 20 }}>
        <div>
          <h1 className="page-title">Shows</h1>
          <p style={{ marginTop: 8, fontSize: 17, color: 'var(--body)' }}>Every program on 1313 TV, 1313 Radio and our podcasts.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label htmlFor="show-search" className="sr-only">Search shows</label>
          <input id="show-search" type="search" placeholder="Search shows" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ height: 44, width: 220, border: '2px solid var(--line)', borderRadius: 999, padding: '0 18px', fontSize: 15 }} />
          <PillTabs label="Filter by type" options={Object.keys(FILTERS)} value={filter} onChange={setFilter} />
        </div>
      </div>

      <p className="meta" style={{ fontSize: 14 }} aria-live="polite">{loading ? 'Loading…' : `${shows.length} shows`}</p>

      <div className="grid grid-260" style={{ gap: 28 }}>
        {shows.map((s) => (
          <Link key={s.title + s.type} to={HREF[s.type]} className="card-link">
            <div className="r-16-10" style={{ background: s.image ? `center / cover url(${s.image})` : s.bg, borderRadius: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, color: '#fff' }}>
              <span className="tag" style={{ alignSelf: 'flex-start', background: '#fff', color: 'var(--ink)' }}>{s.type}</span>
              <span className="display" style={{ fontSize: 30 }}>{s.title}</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{s.genre}</span>
            <span className="meta">{[s.host && `with ${s.host}`, s.when].filter(Boolean).join(' · ')}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
