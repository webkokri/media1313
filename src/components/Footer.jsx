import { Link } from 'react-router-dom';
import { Logo } from './ui.jsx';
import { useContent } from '../content.jsx';

export default function Footer() {
  const { FOOTER_COLS, CHROME: C = {} } = useContent();
  const legal = C.legalLinks || [{ label: 'Privacy', to: '/' }, { label: 'Terms', to: '/' }, { label: 'Accessibility', to: '/' }];
  return (
    <footer className="site-footer" data-edit="FOOTER_COLS">
      <div className="container">
        <div className="footer-top">
          <div className="stack" style={{ flex: '1 1 260px', gap: 14 }}>
            <Logo />
            <p style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 300 }}>{C.footerTagline || 'TV, radio and news in one place.'}</p>
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
          <span>© {new Date().getFullYear()} {C.copyright || 'MEDIA 1313'}</span>
          <span style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {legal.map((l, i) => <Link key={l.label + i} to={l.to}>{l.label}</Link>)}
          </span>
        </div>
      </div>
    </footer>
  );
}
