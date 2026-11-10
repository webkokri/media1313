import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, Segmented } from '../components/ui.jsx';
import { api, setToken } from '../api.jsx';

export default function SignIn() {
  const [mode, setMode] = useState('in');
  const navigate = useNavigate();
  const isIn = mode === 'in';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(''); setBusy(true);
    try {
      const res = isIn
        ? await api.post('/auth/login', { email: f.get('email'), password: f.get('password') })
        : await api.post('/auth/register', { name: f.get('name'), email: f.get('email'), password: f.get('password'), briefing: f.get('briefing') === 'on' });
      setToken(res.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ background: 'var(--paper)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 80px', display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '1 1 360px', gap: 20, paddingTop: 12 }}>
          <h1 className="display" style={{ fontSize: 64 }}>{isIn ? 'Welcome back' : 'Join MEDIA 1313'}</h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--body)' }}>One free MEDIA 1313 account for TV, radio and news on every device.</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Save shows and episodes to My list', 'Pick up where you left off on any screen', 'Breaking news alerts and The 1313 Briefing'].map((b) => (
              <li key={b} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 16, fontWeight: 500 }}><CheckIcon color="var(--red)" />{b}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="stack" style={{ flex: '1 1 400px', background: '#fff', borderRadius: 14, padding: 32, gap: 20, boxShadow: '0 1px 0 var(--line)' }}>
          <div style={{ display: 'grid' }}>
            <Segmented light label="Account" value={mode} onChange={setMode}
              options={[{ value: 'in', label: 'Sign in' }, { value: 'up', label: 'Create account' }]} />
          </div>
          {!isIn && (
            <div className="field"><label htmlFor="s-name">Full name</label><input id="s-name" name="name" className="input" autoComplete="name" required style={{ minHeight: 48 }} /></div>
          )}
          <div className="field"><label htmlFor="s-email">Email</label><input id="s-email" name="email" type="email" className="input" autoComplete="email" required style={{ minHeight: 48 }} /></div>
          <div className="field"><label htmlFor="s-pass">Password</label><input id="s-pass" name="password" minLength={isIn ? undefined : 8} type="password" className="input" autoComplete={isIn ? 'current-password' : 'new-password'} required style={{ minHeight: 48 }} /></div>
          {isIn ? (
            <a href="#" style={{ alignSelf: 'flex-end', fontSize: 14, fontWeight: 600, color: 'var(--red-dark)' }}>Forgot password?</a>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input id="s-news" name="briefing" type="checkbox" defaultChecked style={{ width: 20, height: 20, margin: '2px 0 0', accentColor: 'var(--red)' }} />
              <label htmlFor="s-news" style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--body)' }}>Send me The 1313 Briefing each morning</label>
            </div>
          )}
          {error && <p role="alert" style={{ color: 'var(--red-dark)', fontWeight: 600, fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={busy} className="btn btn--red btn--lg">{isIn ? 'Sign in' : 'Create free account'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />or<span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <button type="button" className="btn btn--lg" style={{ border: '1px solid #c9c7c0', background: '#fff', fontWeight: 600 }}>Continue with a one-time email link</button>
          <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)' }}>
            By continuing you agree to the MEDIA 1313 <a href="#" style={{ textDecoration: 'underline' }}>Terms</a> and <a href="#" style={{ textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </form>
      </div>
    </main>
  );
}
