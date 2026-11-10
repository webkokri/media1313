import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Equalizer, MonitorIcon, PauseIcon, PhoneIcon, PlayIcon, RadioIcon, SectionHead, SpeakerIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import { api } from '../api.jsx';
import { useRadio } from '../radio.jsx';

export default function Radio() {
  const { FM, NOW_ON_RADIO, RADIO_HOSTS, SITE } = useContent();
  const radio = useRadio();
  const playing = radio.playing || radio.loading;
  const [request, setRequest] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const sendRequest = async (e) => {
    e.preventDefault();
    setError('');
    try { await api.post('/song-requests', { request }); setSent(true); }
    catch (err) { setError(err.message); }
  };

  return (
    <main>
      <section data-edit="NOW_ON_RADIO" aria-label="1313 Radio live" style={{ background: 'var(--amber)' }}>
        <div className="container row" style={{ paddingTop: 56, paddingBottom: 56, gap: 40, alignItems: 'center' }}>
          <div className="stack" style={{ flex: '2 1 520px', gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5 }}>1313 RADIO · {FM} · ON AIR</span>
            <h1 className="display" style={{ fontSize: 'clamp(56px, 8vw, 88px)', lineHeight: 0.9 }}>{NOW_ON_RADIO.title}</h1>
            <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: 560 }}>With [Host name] until 7:00 PM — news on the hour, traffic every 15 minutes and music for the ride home.</p>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" aria-label={playing ? 'Pause 1313 Radio' : 'Play 1313 Radio'} onClick={radio.toggle} className="play-circle" style={{ width: 84, height: 84, background: 'var(--ink)' }}>
                {playing ? <PauseIcon size={28} color="#F2A900" /> : <PlayIcon size={30} color="#F2A900" />}
              </button>
              <div className="stack" style={{ gap: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{radio.loading ? 'Connecting…' : radio.playing ? 'Listening live' : 'Tap to listen live'}</span>
                <span style={{ fontSize: 14 }}>{radio.status === 'error' ? radio.error : radio.hasStream ? NOW_ON_RADIO.title : 'The live stream will be available soon.'}</span>
              </div>
              {radio.playing && <Equalizer height={40} color="var(--ink)" />}
              <label className="radio-vol" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>Volume<input type="range" min="0" max="100" value={radio.volume} onChange={(e) => radio.setVolume(+e.target.value)} style={{ width: 120, accentColor: 'var(--ink)' }} /></label>
            </div>
          </div>
          <div className="box box--ink" style={{ flex: '1 1 300px', padding: 22 }}>
            <h2 className="headline" style={{ fontSize: 24, marginBottom: 6 }}>Recently played</h2>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="list-row list-row--dark" style={{ alignItems: 'center', padding: '10px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#3a3e47', flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0 }}><span className="row-title" style={{ fontSize: 14 }}>[Track title]</span><span className="row-sub row-sub--dark">[Artist]</span></span>
                <span className="muted-dark" style={{ fontSize: 12 }}>[time]</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container stack" style={{ paddingTop: 48, paddingBottom: 64, gap: 48 }}>
        <section data-edit="RADIO_HOSTS" aria-label="On-air lineup">
          <SectionHead title="The weekday lineup" linkText="Full radio schedule" to="/schedule" />
          <div className="grid grid-220">
            {RADIO_HOSTS.map((h) => (
              <Link key={h.show} to="/shows" className="card-link">
                <div className="ph r-1-1" style={{ borderRadius: 10 }}>Host photo</div>
                <span className="kicker kicker--red">{h.time}</span>
                <span className="headline" style={{ fontSize: 26, lineHeight: 1 }}>{h.show}</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>with [Host name]</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="row" style={{ gap: 24 }}>
          <section aria-label="Studio line" className="box box--ink stack" style={{ flex: '1 1 380px', padding: 28, gap: 12 }}>
            <span className="kicker kicker--amber">TALK TO THE STUDIO</span>
            <h2 className="cond" style={{ fontWeight: 800, fontSize: 36, lineHeight: 1 }}>Call, text or send a request</h2>
            <p style={{ color: 'var(--soft-dark)', fontSize: 15, lineHeight: 1.5 }}>Studio line [phone number] · Text [short code]</p>
            {sent ? (
              <p style={{ fontWeight: 600, color: 'var(--amber)' }}>Thanks — your request is on its way to the studio.</p>
            ) : (
              <form className="stack" style={{ gap: 10, marginTop: 6 }} onSubmit={sendRequest}>
                <label htmlFor="req" style={{ fontSize: 13, fontWeight: 600 }}>Song request or message</label>
                <textarea id="req" className="input" rows={3} required placeholder="Type your request…" value={request} onChange={(e) => setRequest(e.target.value)} style={{ border: 0, borderRadius: 8 }} />
                {error && <p role="alert" style={{ color: '#FF6B70', fontSize: 14 }}>{error}</p>}
                <button type="submit" className="btn btn--amber" style={{ alignSelf: 'flex-start' }}>Send to studio</button>
              </form>
            )}
          </section>
          <section aria-label="Ways to listen" className="box box--line stack" style={{ flex: '1 1 380px', padding: 28, gap: 16 }}>
            <h2 className="display" style={{ fontSize: 32 }}>Ways to listen</h2>
            <Way icon={<RadioIcon size={28} color="var(--red-dark)" />} title="On the radio" text={`${FM} in [region]`} />
            <Way icon={<MonitorIcon color="var(--red-dark)" />} title="Online" text="Stream live right here on MEDIA 1313" />
            <Way icon={<PhoneIcon color="var(--red-dark)" />} title="MEDIA 1313 app" text="Live radio, TV and podcasts on your phone" />
            <Way icon={<SpeakerIcon color="var(--red-dark)" />} title="Smart speakers" text="Ask your speaker to play 1313 Radio" />
          </section>
        </div>

        <Link to="/podcasts" className="box box--paper" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px' }}>
          <span className="display" style={{ fontSize: 30 }}>Missed a show? Catch up on 1313 podcasts</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--red-dark)' }}>Browse podcasts</span>
        </Link>
      </div>
    </main>
  );
}

const Way = ({ icon, title, text }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
    {icon}
    <div><h3 style={{ fontSize: 17 }}>{title}</h3><p style={{ marginTop: 4, fontSize: 15, color: 'var(--body)' }}>{text}</p></div>
  </div>
);
