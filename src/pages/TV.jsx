import { Link } from 'react-router-dom';
import { AntennaIcon, ArrowIcon, LiveBadge, PhoneIcon, PlayIcon, TvIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';

export default function TV() {
  const { NOW_ON_TV, TV_ROWS } = useContent();
  return (
    <main style={{ color: '#fff' }}>
      <section aria-label="Featured" style={{ position: 'relative', background: 'var(--panel-2)' }}>
        <div className="container stack" style={{ paddingTop: 96, paddingBottom: 72, minHeight: 420, justifyContent: 'flex-end', gap: 16 }}>
          <span style={{ position: 'absolute', top: 20, right: 24, fontSize: 12, color: '#8e929c' }}>Key art 21:9</span>
          <span className="kicker kicker--amber" style={{ fontSize: 13, letterSpacing: 1.5 }}>1313 ORIGINAL · NEW SEASON</span>
          <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 88px)', lineHeight: 0.9, maxWidth: 760 }}>[Featured show title]</h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: 'var(--soft-dark)', maxWidth: 560 }}>A one-line hook for the featured series. New episodes [day] at [time] on 1313 TV and streaming here.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <Link to="/live" className="btn btn--white btn--lg"><PlayIcon />Watch episode 1</Link>
            <Link to="/shows" className="btn btn--outline btn--lg" style={{ color: '#fff' }}>More info</Link>
          </div>
        </div>
      </section>

      <div className="container stack" style={{ paddingTop: 40, paddingBottom: 64, gap: 48 }}>
        <Link data-edit="NOW_ON_TV" to="/live" className="box box--panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', padding: '18px 22px' }}>
          <LiveBadge label="LIVE NOW" />
          <span className="headline" style={{ fontSize: 26 }}>{NOW_ON_TV.title}</span>
          <span className="muted-dark" style={{ fontSize: 14 }}>{NOW_ON_TV.time} · Up next: Sports Desk</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>Watch live <ArrowIcon /></span>
        </Link>

        {TV_ROWS.map((row) => (
          <section data-edit="TV_ROWS" key={row.title} className="stack" style={{ gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="display" style={{ fontSize: 32 }}>{row.title}</h2>
              <Link to="/shows" style={{ fontWeight: 600, fontSize: 14, color: 'var(--soft-dark)' }}>See all</Link>
            </div>
            <div className="grid grid-220" style={{ gap: 20 }}>
              {row.items.map(([title, sub, bg], i) => (
                <Link key={title + i} to="/shows" className="card-link">
                  <div className="r-16-9" style={{ background: bg, borderRadius: 8, display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                    <span className="display" style={{ fontSize: 24, lineHeight: 1 }}>{title}</span>
                  </div>
                  <span className="muted-dark" style={{ fontSize: 13 }}>{sub}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section aria-label="How to watch" className="box stack" style={{ background: '#fff', color: 'var(--ink)', padding: 32, gap: 24 }}>
          <h2 className="display" style={{ fontSize: 36 }}>How to watch 1313 TV</h2>
          <div className="grid grid-220">
            <HowTo icon={<TvIcon size={32} color="var(--red)" />} title="On TV" text="Channel [##] on cable and satellite in [region]." />
            <HowTo icon={<AntennaIcon color="var(--red)" />} title="Over the air" text="Free with an antenna on channel [##.#]." />
            <HowTo icon={<PhoneIcon size={32} color="var(--red)" />} title="Online & app" text="Stream live and on demand here or in the MEDIA 1313 app." />
          </div>
        </section>
      </div>
    </main>
  );
}

const HowTo = ({ icon, title, text }) => (
  <div className="stack" style={{ gap: 8 }}>
    {icon}
    <h3 style={{ fontSize: 18 }}>{title}</h3>
    <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--body)' }}>{text}</p>
  </div>
);
