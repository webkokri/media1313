import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, CaptionsIcon, Equalizer, FullscreenIcon, LiveBadge, PauseIcon, PlayIcon, PlusIcon, RadioIcon, Segmented, ShareIcon, TvIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { useRadio } from '../radio.jsx';

function TVPlayer() {
  const { NOW_ON_TV, PLAYER } = useContent();
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="thumb-play r-16-9" data-edit="PLAYER" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <VideoPlayer src={PLAYER.streamUrl} poster={PLAYER.poster} autoPlay={PLAYER.autoplay} muted={PLAYER.autoplay} />
        <span style={{ position: 'absolute', top: 18, left: 18, pointerEvents: 'none' }}><LiveBadge /></span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 360px' }}>
          <p className="kicker kicker--amber" style={{ marginBottom: 6 }}>ON 1313 TV NOW · {NOW_ON_TV.time}</p>
          <h2 className="headline" style={{ fontSize: 44, lineHeight: 1.02 }}>{NOW_ON_TV.title}</h2>
          <p className="muted-dark" style={{ marginTop: 10, fontSize: 16, lineHeight: 1.55, maxWidth: 620 }}>{NOW_ON_TV.sub}, with weather and sports at the half hour.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <button type="button" className="btn btn--ghost"><PlusIcon color="#fff" />My list</button>
          <button type="button" className="btn btn--ghost"><ShareIcon size={16} color="#fff" />Share</button>
        </div>
      </div>
    </div>
  );
}

function RadioPlayer() {
  const { FM, NOW_ON_RADIO } = useContent();
  const radio = useRadio(); const playing = radio.playing || radio.loading;
  return (
    <div className="box box--panel" style={{ padding: 32, display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', borderRadius: 14 }}>
      <div style={{ width: 240, height: 240, flex: 'none', background: 'var(--amber)', borderRadius: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, color: 'var(--ink)' }}>
        <span className="cond" style={{ fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>1313 RADIO</span>
        <span className="display" style={{ fontSize: 44 }}>Drive Home Show</span>
      </div>
      <div className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 16 }}>
        <p className="kicker kicker--amber">ON AIR · {FM} · {NOW_ON_RADIO.time}</p>
        <h2 className="headline" style={{ fontSize: 48, lineHeight: 1 }}>{NOW_ON_RADIO.title}</h2>
        <p className="muted-dark" style={{ fontSize: 16, lineHeight: 1.55 }}>With [Host name] — news on the hour, traffic every 15 minutes and music for the ride home.</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" aria-label={playing ? 'Pause 1313 Radio' : 'Play 1313 Radio'} className="play-circle" style={{ width: 72, height: 72, background: 'var(--amber)' }} onClick={radio.toggle}>
            {playing ? <PauseIcon size={26} color="#111216" /> : <PlayIcon size={28} color="#111216" />}
          </button>
          {radio.playing && <Equalizer height={36} bars={5} />}
          {radio.status === 'error' && <span role="alert" style={{ fontSize: 13, color: '#FF6B70' }}>{radio.error}</span>}
          <label htmlFor="vol" style={{ fontSize: 13, color: 'var(--muted-dark)', marginLeft: 'auto' }}>Volume</label>
          <input id="vol" type="range" min="0" max="100" value={radio.volume} onChange={(e) => radio.setVolume(+e.target.value)} style={{ width: 140, accentColor: 'var(--amber)' }} />
        </div>
      </div>
      <div style={{ flex: '1 1 100%', borderTop: '1px solid var(--line-dark)', paddingTop: 20 }}>
        <h3 className="kicker muted-dark" style={{ marginBottom: 8, fontSize: 13 }}>RECENTLY PLAYED</h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="list-row list-row--dark" style={{ fontSize: 15 }}>
            <span className="time-col time-col--dark" style={{ width: 72 }}>[time]</span>
            <span style={{ fontWeight: 600 }}>[Track title]</span>
            <span className="muted-dark">[Artist]</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const iconBtn = { width: 44, height: 44, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };

export default function Live() {
  const { SCHEDULE, LIVE_UPDATES } = useContent();
  const [mode, setMode] = useState('tv');
  const isTV = mode === 'tv';
  const guide = isTV ? SCHEDULE.tvWeekday.slice(3, 9) : SCHEDULE.radioWeekday.slice(2, 8);

  return (
    <main className="container stack" style={{ paddingTop: 32, paddingBottom: 64, gap: 32, color: '#fff' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="page-title">Live</h1>
        <Segmented
          large
          label="Choose live service"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'tv', label: 'Watch 1313 TV', icon: <TvIcon /> },
            { value: 'radio', label: 'Listen 1313 Radio', icon: <RadioIcon /> },
          ]}
        />
      </div>

      <div className="row">
        <div data-edit="LIVE_UPDATES" className="stack" style={{ flex: '999 1 600px', minWidth: 0, gap: 20 }}>
          {isTV ? <TVPlayer /> : <RadioPlayer />}

          <div className="box" style={{ background: '#fff', color: 'var(--ink)', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 className="display" style={{ fontSize: 28 }}>Live updates</h2>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--red-dark)' }}><span className="dot dot--pulse" />From the newsroom</span>
            </div>
            {LIVE_UPDATES.map((u) => (
              <Link key={u} to="/news" className="list-row" style={{ padding: '14px 0', color: 'var(--ink)' }}>
                <span className="time-col">[time]</span>
                <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.4 }}>{u}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside data-edit="SCHEDULE" aria-label="Schedule" className="stack" style={{ flex: '1 1 340px', minWidth: 0, gap: 20 }}>
          <div className="box box--panel" style={{ padding: 22, borderRadius: 14 }}>
            <h2 className="headline" style={{ fontSize: 28, marginBottom: 12 }}>{isTV ? 'Today on 1313 TV' : 'Today on 1313 Radio'}</h2>
            {guide.map(([time, title, sub, now]) => (
              <div key={time} style={{ display: 'flex', gap: 12, padding: 12, margin: '0 -12px', borderRadius: 8, ...(now ? { background: 'var(--line-dark)' } : { borderTop: '1px solid var(--line-dark)' }) }}>
                <span className="time-col time-col--dark" style={{ width: 72 }}>{time}</span>
                <span style={{ flex: 1, minWidth: 0 }}><span className="row-title">{title}</span><span className="row-sub row-sub--dark">{sub}</span></span>
                {now && <span className="tag" style={{ background: 'var(--amber)', color: 'var(--night)' }}>NOW</span>}
              </div>
            ))}
            <Link to="/schedule" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontWeight: 600, fontSize: 14 }}>Full week schedule <ArrowIcon /></Link>
          </div>
          <div className="box box--red stack" style={{ gap: 10, padding: 22, borderRadius: 14 }}>
            <h2 className="display" style={{ fontSize: 26 }}>Take 1313 with you</h2>
            <p style={{ fontSize: 15, lineHeight: 1.5 }}>Watch TV and listen to radio live on the MEDIA 1313 app.</p>
            <a href="#" className="btn btn--ink" style={{ alignSelf: 'flex-start' }}>Get the app</a>
          </div>
        </aside>
      </div>
    </main>
  );
}
