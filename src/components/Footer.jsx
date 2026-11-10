import { Link } from 'react-router-dom';
import { Logo } from './ui.jsx';
import { useContent } from '../content.jsx';

export default function Footer() {
  const { FOOTER_COLS } = useContent();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="stack" style={{ flex: '1 1 260px', gap: 14 }}>
            <Logo />
            <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>TV, radio and news in one place.</p>
          </div>
          <div className="footer-cols">
            {FOOTER_COLS.map((c) => (
              <div key={c.title}>
                <strong>{c.title}</strong>
                {c.links.map((l) => <Link key={l.label} to={l.to}>{l.label}</Link>)}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} MEDIA 1313</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Accessibility</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
