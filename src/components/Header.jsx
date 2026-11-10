import { Link, NavLink } from 'react-router-dom';
import { Logo, PlayIcon, SearchIcon } from './ui.jsx';
import { TODAY_LABEL } from '../data.js';
import { useContent } from '../content.jsx';

const CHROME_DEFAULT = { tvLive: '1313 TV live now', radioLive: '1313 Radio on air', utilityLinks: [{ label: 'Newsletters', to: '/#newsletter' }, { label: 'About', to: '/about' }, { label: 'Sign in', to: '/signin' }], liveButton: { label: 'Watch & Listen Live', to: '/live' }, footerTagline: 'TV, radio and news in one place.', legalLinks: [{ label: 'Privacy', to: '/' }, { label: 'Terms', to: '/' }, { label: 'Accessibility', to: '/' }], copyright: 'MEDIA 1313' };

export default function Header() {
  const { NAV, CHROME: C = {} } = useContent();
  const chrome = { ...CHROME_DEFAULT, ...C };
  return (
    <>
      <div className="utility" data-edit="CHROME">
        <div className="container">
          <div className="group">
            <span>{TODAY_LABEL}</span>
            <Link to="/live"><span className="dot dot--pulse" style={{ color: 'var(--red)' }} />{chrome.tvLive}</Link>
            <Link to="/live"><span className="dot" style={{ color: 'var(--amber)' }} />{chrome.radioLive}</Link>
          </div>
          <div className="group">
            {chrome.utilityLinks.map((l, i) => <Link key={l.label + i} to={l.to} style={i === chrome.utilityLinks.length - 1 ? { color: '#fff', fontWeight: 600 } : undefined}>{l.label}</Link>)}
          </div>
        </div>
      </div>

      <header className="site-header" data-edit="NAV">
        <div className="container">
          <Logo />
          <nav aria-label="Main" className="main-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button type="button" className="icon-btn" aria-label="Search"><SearchIcon color="#111216" /></button>
            <Link to={chrome.liveButton.to} className="btn btn--red"><PlayIcon />{chrome.liveButton.label}</Link>
          </div>
        </div>
      </header>
    </>
  );
}
