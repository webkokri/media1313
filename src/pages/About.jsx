import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SuccessIcon } from '../components/ui.jsx';
import { useContent } from '../content.jsx';
import { api } from '../api.jsx';

const EMPTY = { name: '', email: '', topic: 'News tip', message: '' };

export default function About() {
  const { FM, CONTACT_TOPICS } = useContent();
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await api.post('/contact', form); setSent(true); }
    catch (err) { setError(err.message); }
  };

  return (
    <main>
      <section aria-label="About MEDIA 1313" style={{ background: 'var(--night)', color: '#fff' }}>
        <div className="container stack" style={{ paddingTop: 72, paddingBottom: 72, gap: 20 }}>
          <span className="kicker kicker--amber" style={{ fontSize: 13, letterSpacing: 1.5 }}>ABOUT US</span>
          <h1 className="display" style={{ fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.92, maxWidth: 900 }}>One newsroom. TV, radio and news in one place.</h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--soft-dark)', maxWidth: 680 }}>[Mission statement: two or three sentences about who MEDIA 1313 serves, what it stands for and the community it covers.]</p>
        </div>
      </section>

      <div className="container stack" style={{ paddingTop: 56, paddingBottom: 64, gap: 64 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <Pillar to="/tv" color="var(--red)" title="1313 TV" text="Live news, originals, sports and documentaries on channel [##] and online." />
          <Pillar to="/radio" color="var(--amber)" title="1313 Radio" text={`News, talk and music on ${FM}, streaming live around the clock.`} />
          <Pillar to="/news" color="var(--ink)" title="1313 News" text="Local and world reporting, updated all day on the web and in the app." />
        </div>

        <section id="contact" aria-label="Contact" className="row" style={{ gap: 48 }}>
          <div className="stack" style={{ flex: '1 1 320px', gap: 18 }}>
            <h2 className="display" style={{ fontSize: 48, lineHeight: 1 }}>Contact us</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--body)' }}>Send a news tip, give feedback on a show or reach any department.</p>
            <div className="stack" style={{ gap: 14, fontSize: 15 }}>
              <Info label="Newsroom" value="[phone] · [email]" />
              <Info label="Radio studio line" value="[phone]" />
              <Info label="Address" value="[Street address, city, postal code]" />
            </div>
          </div>

          <div className="box box--line" style={{ flex: '2 1 520px', minWidth: 0, padding: 28 }}>
            {sent ? (
              <div className="stack" style={{ gap: 12, alignItems: 'flex-start' }}>
                <SuccessIcon />
                <h3 className="cond" style={{ fontWeight: 800, fontSize: 32 }}>Thanks — message sent</h3>
                <p style={{ fontSize: 15, color: 'var(--body)' }}>The right team will get back to you.</p>
                <button type="button" className="btn btn--outline" onClick={() => { setForm(EMPTY); setSent(false); }}>Send another</button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid two-col-form" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" className="input" required value={form.name} onChange={set('name')} /></div>
                <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" required value={form.email} onChange={set('email')} /></div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="c-topic">Topic</label>
                  <select id="c-topic" className="input" value={form.topic} onChange={set('topic')}>
                    {CONTACT_TOPICS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="input" rows={5} required value={form.message} onChange={set('message')} /></div>
                {error && <p role="alert" style={{ gridColumn: '1 / -1', color: 'var(--red-dark)', fontWeight: 600 }}>{error}</p>}
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn--red" style={{ minHeight: 48, padding: '0 28px' }}>Send message</button>
                  <span className="meta">Have photos or video? You can attach them after sending.</span>
                </div>
              </form>
            )}
          </div>
        </section>

        <div className="row" style={{ gap: 24 }}>
          <section id="advertise" aria-label="Advertise" className="box box--red stack" style={{ flex: '1 1 420px', padding: 32, gap: 12 }}>
            <h2 className="display" style={{ fontSize: 40, lineHeight: 1 }}>Advertise with 1313</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55 }}>Reach audiences across TV, radio, web and podcasts with one partner.</p>
            <Link to="/about#contact" className="btn btn--ink" style={{ alignSelf: 'flex-start', marginTop: 6 }}>Get the media kit</Link>
          </section>
          <section id="careers" aria-label="Careers" className="box box--ink stack" style={{ flex: '1 1 420px', padding: 32, gap: 12 }}>
            <h2 className="display" style={{ fontSize: 40, lineHeight: 1 }}>Work at 1313</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--soft-dark)' }}>Reporters, producers, hosts, engineers and more. See open roles in the newsroom and studios.</p>
            <a href="#" className="btn btn--amber" style={{ alignSelf: 'flex-start', marginTop: 6 }}>View open roles</a>
          </section>
        </div>
      </div>
    </main>
  );
}

const Pillar = ({ to, color, title, text }) => (
  <Link to={to} className="stack" style={{ borderTop: `6px solid ${color}`, background: 'var(--paper)', borderRadius: '0 0 10px 10px', padding: 24, gap: 10 }}>
    <h2 className="cond" style={{ fontWeight: 800, fontSize: 34 }}>{title}</h2>
    <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--body)' }}>{text}</p>
  </Link>
);

const Info = ({ label, value }) => (
  <div><p style={{ fontWeight: 700 }}>{label}</p><p style={{ marginTop: 2, color: 'var(--body)' }}>{value}</p></div>
);
