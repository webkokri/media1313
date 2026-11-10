import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, Equalizer, LiveBadge, PauseIcon, Placeholder, PlayIcon, SectionHead, Segmented, VideoCard, VideoIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useRadio } from '../radio.jsx';
import { Loaded, articleMeta, articleTo, clock, timeAgo, useApi, useNewsletter } from '../api.jsx';

function OnNowPanel() {
  const { FM, NOW_ON_RADIO, RADIO_UP_NEXT, TV_UP_NEXT } = useContent();
  const [tab, setTab] = useState('tv');
  const radio = useRadio();
  return (
    <div data-edit="TV_UP_NEXT" className="box box--panel stack" style={{ flex: '1 1 340px', minWidth: 0, gap: 16, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="cond" style={{ fontWeight: 700, fontSize: 26 }}>On now</h2>
        <Segmented label="Channel type" value={tab} onChange={setTab} options={[{ value: 'tv', label: 'TV' }, { value: 'radio', label: 'Radio' }]} />
      </div>

      {tab === 'tv' ? (
        <div className="stack">
          {TV_UP_NEXT.map((r) => (
            <Link key={r.time} to="/live" className="list-row list-row--dark" style={{ alignItems: 'center', color: '#fff' }}>
              <span className="time-col time-col--dark">{r.time}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span className="row-title">{r.title}</span><span className="row-sub row-sub--dark">{r.sub}</span></span>
              {r.tag && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: r.tagColor }}>{r.tag}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          <div style={{ background: 'var(--night)', borderRadius: 10, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <button type="button" onClick={radio.toggle} aria-label={radio.playing || radio.loading ? 'Pause 1313 Radio' : 'Play 1313 Radio'} className="play-circle" style={{ width: 52, height: 52, background: 'var(--amber)' }}>{radio.playing || radio.loading ? <PauseIcon size={22} color="#111216" /> : <PlayIcon size={22} color="#111216" />}</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="kicker kicker--amber">1313 RADIO · {FM}</p>
              <p style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{NOW_ON_RADIO.title}</p>
            </div>
            {radio.playing ? <Equalizer /> : null}
          </div>
          <div className="stack">
            {RADIO_UP_NEXT.map((r) => (
              <Link key={r.time} to="/live" className="list-row list-row--dark" style={{ color: '#fff' }}>
                <span className="time-col time-col--dark">{r.time}</span>
                <span><span className="row-title">{r.title}</span><span className="row-sub row-sub--dark">{r.sub}</span></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link to="/schedule" style={{ marginTop: 'auto', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>Full schedule <ArrowIcon /></Link>
    </div>
  );
}

export default function Home() {
  const feed = useApi('/home');
  return <Loaded state={feed}>{(data) => <HomeBody feed={data} />}</Loaded>;
}

function HomeBody({ feed }) {
  const { FM, NOW_ON_RADIO, NOW_ON_TV, PLAYER, PODCASTS, SITE, VIDEOS } = useContent();
  const radioMain = useRadio();
  const { lead, secondary, latest, sections } = feed;
  const nl = useNewsletter('home');
  return (
    <main>
      {/* Breaking ticker */}
      <div className="ticker" data-edit="SITE">
        <div className="container">
          <strong>BREAKING</strong>
          <p>{SITE.breaking}</p>
        </div>
      </div>

      {/* Live band */}
      <section aria-label="Live now" style={{ background: 'var(--night)', color: '#fff' }}>
        <div className="container row" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="main-col stack" style={{ gap: 16 }} data-edit="NOW_ON_TV">
            <div className="thumb-play r-16-9" data-edit="PLAYER" style={{ borderRadius: 12, overflow: 'hidden' }}>
              <VideoPlayer src={PLAYER.streamUrl} poster={PLAYER.poster} autoPlay={PLAYER.autoplay} muted={PLAYER.autoplay} />
              <span style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'none' }}><LiveBadge /></span>
              <span style={{ position: 'absolute', top: 18, right: 16, fontSize: 13, color: 'var(--soft-dark)', pointerEvents: 'none', textShadow: '0 1px 4px #000' }}>{PLAYER.title}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p className="kicker kicker--amber" style={{ marginBottom: 4 }}>ON 1313 TV NOW</p>
                <h2 className="headline" style={{ fontSize: 40, lineHeight: 1.05 }}>{NOW_ON_TV.title}</h2>
                <p className="muted-dark" style={{ marginTop: 6, fontSize: 15 }}>{NOW_ON_TV.sub}</p>
              </div>
              <span className="muted-dark" style={{ fontSize: 14 }}>{NOW_ON_TV.time}</span>
            </div>
          </div>
          <OnNowPanel />
        </div>
      </section>

      {/* Top stories */}
      <section data-edit-articles="1" aria-label="Top stories" className="container" style={{ paddingTop: 56, paddingBottom: 24 }}>
        <SectionHead title="Top Stories" linkText="All news" to="/news" />
        <div className="row">
          <article className="stack" style={{ flex: '2 1 520px', minWidth: 0, gap: 14 }}>
            <Placeholder label="Lead image 16:9" />
            {lead && <>
            <span className="kicker kicker--red">{lead.kicker}</span>
            <h3 className="headline" style={{ fontSize: 48, lineHeight: 1.02 }}><Link to={articleTo(lead)}>{lead.title}</Link></h3>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--body)' }}>{lead.dek}</p>
            <div className="meta" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {lead.author && <span>By {lead.author}</span>}<span>Updated {timeAgo(lead.updatedAt)}</span>
              <Link to="/live" style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600, color: 'var(--ink)' }}><VideoIcon />Watch the report</Link>
            </div>
            </>}
          </article>

          <div className="stack" style={{ flex: '1 1 300px', minWidth: 0, gap: 24 }}>
            {secondary.map((s) => (
              <article key={s.slug} style={{ display: 'flex', gap: 16, paddingBottom: 24, borderBottom: '1px solid var(--line)' }}>
                <div className="ph" style={{ width: 120, height: 80, flex: 'none', padding: 0 }} />
                <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                  <span className="kicker kicker--red" style={{ fontSize: 11 }}>{s.kicker}</span>
                  <h3 className="headline" style={{ fontSize: 22, lineHeight: 1.1 }}><Link to={articleTo(s)}>{s.title}</Link></h3>
                  <span className="meta" style={{ fontSize: 12 }}>{articleMeta(s)}</span>
                </div>
              </article>
            ))}
          </div>

          <aside aria-label="Latest" className="box box--paper" style={{ flex: '1 1 260px', minWidth: 0, alignSelf: 'flex-start', padding: 20, borderRadius: 8 }}>
            <h2 className="box-title">Latest</h2>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {latest.map((a) => (
                <li key={a.slug} className="list-row list-row--paper">
                  <span className="time-col" style={{ width: 52, fontSize: 12 }}>{clock(a.publishedAt)}</span>
                  <Link to={articleTo(a)} style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{a.title}</Link>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* Watch */}
      <section data-edit="VIDEOS" aria-label="Watch" className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <SectionHead title="Watch" linkText="All video & shows" to="/shows" />
        <div className="grid grid-220">
          {VIDEOS.map((v) => <VideoCard key={v.title} title={v.title} kicker={v.show} duration={v.dur} />)}
        </div>
      </section>

      {/* Listen */}
      <section data-edit="PODCASTS" aria-label="Listen" style={{ background: 'var(--paper)', marginTop: 16 }}>
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
          <SectionHead title="Listen" linkText="Radio & podcasts" to="/podcasts" />
          <div className="row" style={{ gap: 24 }}>
            <div data-edit="NOW_ON_RADIO" className="box box--ink stack" style={{ flex: '1 1 380px', minWidth: 0, gap: 18, padding: 28 }}>
              <span className="kicker kicker--amber">1313 RADIO · LIVE</span>
              <h3 className="headline" style={{ fontSize: 40, lineHeight: 1 }}>{NOW_ON_RADIO.title}</h3>
              <p className="muted-dark" style={{ fontSize: 15, lineHeight: 1.5 }}>News, traffic and music for the ride home. Stream it here or tune in on {FM}.</p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={radioMain.toggle} className="btn btn--amber">{radioMain.playing || radioMain.loading ? <PauseIcon size={16} /> : <PlayIcon />}{radioMain.playing || radioMain.loading ? 'Pause radio' : 'Listen live'}</button>
                <Link to="/schedule" style={{ color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 4px' }}>Radio schedule</Link>
              </div>
            </div>
            <div className="grid" style={{ flex: '2 1 520px', minWidth: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
              {PODCASTS.slice(0, 3).map((p) => (
                <Link key={p.title} to="/podcasts" className="stack" style={{ background: '#fff', borderRadius: 12, padding: 16, gap: 12 }}>
                  <div className="r-1-1" style={{ background: p.bg, borderRadius: 8, display: 'flex', alignItems: 'flex-end', padding: 14 }}>
                    <span className="display" style={{ fontSize: 26, lineHeight: 1, color: '#fff' }}>{p.title}</span>
                  </div>
                  <span className="kicker kicker--muted" style={{ fontSize: 11 }}>PODCAST</span>
                  <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35, color: 'var(--ink)' }}>{p.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section data-edit-articles="1" aria-label="News by section" className="container" style={{ paddingTop: 56, paddingBottom: 56 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
          {sections.map((sec) => (
            <div key={sec.name} className="stack">
              <h2 className="display" style={{ fontSize: 26, borderBottom: '3px solid var(--ink)', paddingBottom: 8, marginBottom: 14 }}>{sec.name}</h2>
              <Placeholder ratio="16-10" style={{ marginBottom: 12 }} />
              {sec.lead && <Link to={articleTo(sec.lead)} className="headline" style={{ fontSize: 22, lineHeight: 1.1, marginBottom: 10 }}>{sec.lead.title}</Link>}
              {sec.links.map((l) => (
                <Link key={l.slug} to={articleTo(l)} style={{ fontSize: 15, fontWeight: 500, padding: '10px 0', borderTop: '1px solid var(--line)' }}>{l.title}</Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" aria-label="Stay connected" style={{ background: 'var(--red)', color: '#fff' }}>
        <div className="container" style={{ paddingTop: 48, paddingBottom: 48, display: 'flex', flexWrap: 'wrap', gap: '24px 48px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 420px' }}>
            <h2 className="display" style={{ fontSize: 44, lineHeight: 1 }}>The 1313 Briefing</h2>
            <p style={{ marginTop: 10, fontSize: 16, lineHeight: 1.5 }}>Top stories, what's on TV tonight and what's playing on radio — in your inbox every morning.</p>
          </div>
          <form onSubmit={nl.submit} style={{ flex: '1 1 420px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <label htmlFor="nl-email" className="sr-only">Email address</label>
            <input id="nl-email" type="email" required placeholder="Your email address" value={nl.email} onChange={(e) => nl.setEmail(e.target.value)} style={{ flex: '1 1 240px', height: 52, border: 0, borderRadius: 999, padding: '0 22px', fontSize: 16 }} />
            <button type="submit" disabled={nl.status.state === 'busy'} className="btn btn--ink btn--lg">Subscribe</button>
            {nl.status.message && <p role="status" style={{ flexBasis: '100%', fontWeight: 600 }}>{nl.status.message}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
