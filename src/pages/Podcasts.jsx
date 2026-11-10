import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseIcon, PlayIcon, PlusIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import { api, getToken } from '../api.jsx';

export default function Podcasts() {
  const { EPISODES, PODCASTS } = useContent();
  const [playing, setPlaying] = useState(-1);
  const [following, setFollowing] = useState(false);
  const navigate = useNavigate();
  const FEATURED = 'The Briefing';

  // Followed podcasts are saved to the signed-in member's account.
  useEffect(() => {
    if (!getToken()) return;
    api.get('/podcasts-follow').then((d) => setFollowing(d.following.includes(FEATURED))).catch(() => {});
  }, []);

  const toggleFollow = async () => {
    if (!getToken()) { navigate('/signin'); return; }
    const next = !following;
    setFollowing(next);
    try { await api.post('/podcasts-follow', { podcast: FEATURED, follow: next }); }
    catch { setFollowing(!next); }
  };

  return (
    <main className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 44 }}>
      <h1 className="page-title" style={{ borderBottom: '3px solid var(--ink)', paddingBottom: 20 }}>Podcasts</h1>

      <section data-edit="PODCASTS" aria-label="Featured podcast" className="box box--ink" style={{ display: 'flex', flexWrap: 'wrap', gap: 36, alignItems: 'center', padding: 32, borderRadius: 14 }}>
        <div className="r-1-1" style={{ flex: '0 0 280px', background: 'var(--red-dark)', borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5 }}>MEDIA 1313</span>
          <span className="display" style={{ fontSize: 56, lineHeight: 0.9 }}>The Briefing</span>
        </div>
        <div className="stack" style={{ flex: '1 1 360px', gap: 14 }}>
          <span className="kicker kicker--amber" style={{ letterSpacing: 1.5 }}>FEATURED · NEW EPISODE DAILY</span>
          <h2 className="cond" style={{ fontWeight: 800, fontSize: 48, lineHeight: 1 }}>The day's news in 15 minutes</h2>
          <p style={{ color: 'var(--soft-dark)', fontSize: 16, lineHeight: 1.55, maxWidth: 560 }}>Hosted by [Host name] from the 1313 newsroom. Today's episode: [episode title].</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--amber" style={{ minHeight: 48 }} onClick={() => setPlaying(playing === 0 ? -1 : 0)}>
              {playing === 0 ? <PauseIcon /> : <PlayIcon />}{playing === 0 ? 'Pause' : 'Play latest'}
            </button>
            <button type="button" className="btn btn--outline" style={{ minHeight: 48, color: '#fff' }} aria-pressed={following} onClick={toggleFollow}>
              {!following && <PlusIcon />}{following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      </section>

      <div className="row" style={{ gap: 40 }}>
        <section data-edit="EPISODES" aria-label="Latest episodes" style={{ flex: '999 1 560px', minWidth: 0 }}>
          <h2 className="display" style={{ fontSize: 32, marginBottom: 14 }}>Latest episodes</h2>
          {EPISODES.map((e, i) => {
            const on = playing === i;
            return (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 0', borderTop: '1px solid var(--line)' }}>
                <button type="button" aria-label={`${on ? 'Pause' : 'Play'} ${e.title}`} onClick={() => setPlaying(on ? -1 : i)} className="play-circle"
                  style={{ width: 44, height: 44, background: on ? 'var(--amber)' : 'var(--ink)' }}>
                  {on ? <PauseIcon color="#111216" /> : <PlayIcon color="#fff" />}
                </button>
                <div style={{ width: 56, height: 56, flex: 'none', borderRadius: 8, background: e.bg }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="kicker kicker--red" style={{ display: 'block', fontSize: 11 }}>{e.show}</span>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 16, marginTop: 2 }}>{e.title}</span>
                  <span className="meta" style={{ display: 'block', marginTop: 2 }}>[date] · [duration]</span>
                </div>
              </div>
            );
          })}
        </section>

        <aside className="side-col">
          <div className="box box--paper stack" style={{ gap: 12, padding: 22, borderRadius: 10 }}>
            <h2 className="display" style={{ fontSize: 24 }}>Listen anywhere</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--body)' }}>Follow 1313 podcasts in the MEDIA 1313 app or your favourite podcast app.</p>
            <a href="#" style={{ fontWeight: 700, fontSize: 14, color: 'var(--red-dark)' }}>Copy RSS feed</a>
          </div>
        </aside>
      </div>

      <section data-edit="PODCASTS" aria-label="All podcasts">
        <h2 className="display" style={{ fontSize: 32, borderBottom: '3px solid var(--ink)', paddingBottom: 10, marginBottom: 20 }}>All podcasts</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {PODCASTS.map((p) => (
            <a key={p.title} href="#" className="card-link">
              <div className="r-1-1" style={{ background: p.bg, borderRadius: 10, display: 'flex', alignItems: 'flex-end', padding: 14 }}>
                <span className="display" style={{ fontSize: 30, color: '#fff' }}>{p.title}</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{p.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
