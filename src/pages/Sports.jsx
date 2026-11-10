import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../content.jsx';
import { PillTabs, PlayIcon, Placeholder, SectionHead } from '../components/ui.jsx';

export default function Sports() {
  const { SPORTS: { sports: SPORTS, scores: SCORES, side: SIDE, clips: CLIPS, standings, lead, sportsDesk } } = useContent();
  const [sport, setSport] = useState('Hockey');
  const S = sport.toUpperCase();

  return (
    <main data-edit="SPORTS">
      {/* Scores strip — feed from your sports data provider */}
      <div style={{ background: 'var(--night)', color: '#fff' }}>
        <div className="container" style={{ paddingTop: 14, paddingBottom: 14, display: 'flex', gap: 12, overflowX: 'auto' }}>
          {SCORES.map((g, i) => (
            <Link key={i} to="/news" style={{ flex: '0 0 200px', background: 'var(--panel)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, color: '#fff' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: g.color }}>{g.status}</span>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}><span>{g.a}</span><span>{g.sa}</span></span>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}><span>{g.b}</span><span>{g.sb}</span></span>
            </Link>
          ))}
        </div>
      </div>

      <div className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 40 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '3px solid var(--ink)', paddingBottom: 20 }}>
          <h1 className="page-title">Sports</h1>
          <PillTabs label="Sports" options={SPORTS} value={sport} onChange={setSport} />
        </div>

        <div className="row">
          <Link to="/news" className="r-16-9" style={{ flex: '2 1 560px', minWidth: 0, position: 'relative', background: 'var(--panel-2)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 28, color: '#fff' }}>
            <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 12, color: '#8e929c' }}>Lead image 16:9</span>
            <span className="kicker kicker--amber">{S} · TOP STORY</span>
            <span className="cond" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1, marginTop: 8, maxWidth: 640 }}>{lead.title}</span>
            <span style={{ fontSize: 14, color: 'var(--soft-dark)', marginTop: 10 }}>{lead.byline}</span>
          </Link>
          <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 20 }}>
            {SIDE.map((s) => (
              <Link key={s.title} to="/news" style={{ display: 'flex', gap: 14, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
                <div className="ph" style={{ width: 112, height: 76, flex: 'none', padding: 0 }} />
                <span className="stack" style={{ gap: 6 }}>
                  <span className="kicker kicker--red" style={{ fontSize: 11 }}>{s.tag}</span>
                  <span className="headline" style={{ fontSize: 21, lineHeight: 1.1 }}>{s.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="row">
          <section aria-label="Standings" style={{ flex: '1 1 420px', minWidth: 0 }}>
            <h2 className="display" style={{ fontSize: 28, marginBottom: 14 }}>{S} standings</h2>
            <div className="table-wrap">
              <table>
                <thead><tr>{['#', 'Team', 'GP', 'W', 'L', 'PTS'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
                <tbody>
                  {standings.map((r) => (
                    <tr key={r.rank}><td style={{ color: 'var(--muted)' }}>{r.rank}</td><td style={{ fontWeight: 600 }}>{r.team}</td><td>{r.gp}</td><td>{r.w}</td><td>{r.l}</td><td style={{ fontWeight: 700 }}>{r.pts}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-label="Sports Desk" className="box box--night stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 16 }}>
            <span className="kicker kicker--amber">{sportsDesk.kicker}</span>
            <h2 className="cond" style={{ fontWeight: 800, fontSize: 40, lineHeight: 1 }}>Sports Desk</h2>
            <div className="thumb-play r-16-9">
              <Link to="/live" aria-label="Play Sports Desk" className="play-circle" style={{ width: 64, height: 64 }}><PlayIcon size={24} color="#111216" /></Link>
            </div>
            <p className="muted-dark" style={{ fontSize: 15, lineHeight: 1.5 }}>{sportsDesk.blurb}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/live" className="btn btn--white">Watch episodes</Link>
              <Link to="/podcasts" style={{ color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 6px' }}>Game Day podcast</Link>
            </div>
          </section>
        </div>

        <section aria-label="Highlights">
          <SectionHead title="Highlights" linkText="All sports video" to="/tv" />
          <div className="grid grid-220">
            {CLIPS.map((c) => (
              <Link key={c} to="/live" className="card-link">
                <div className="thumb-play r-16-9"><span className="duration">[0:00]</span></div>
                <span className="headline" style={{ fontSize: 21, lineHeight: 1.1 }}>{c}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
