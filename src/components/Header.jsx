import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo, PlayIcon, SearchIcon } from './ui.jsx';
import { TODAY_LABEL } from '../data.js';
import { useContent } from '../content.jsx';

const CHROME_DEFAULT = { tvLive: '1313 TV live now', radioLive: '1313 Radio on air', utilityLinks: [{ label: 'Newsletters', to: '/#newsletter' }, { label: 'About', to: '/about' }, { label: 'Sign in', to: '/signin' }], liveButton: { label: 'Watch & Listen Live', to: '/live' }, footerTagline: 'TV, radio and news in one place.', legalLinks: [{ label: 'Privacy', to: '/' }, { label: 'Terms', to: '/' }, { label: 'Accessibility', to: '/' }], copyright: 'MEDIA 1313' };

export default function Header() {
  const { NAV, CHROME: C = {} } = useContent();
  const chrome = { ...CHROME_DEFAULT, ...C };
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);                       // close after navigating
  useEffect(() => {                                                   // lock page scroll while the menu is open; Esc closes it
    document.documentElement.classList.toggle('menu-open', open);
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); document.documentElement.classList.remove('menu-open'); };
  }, [open]);

  return (
    <>
      <div className="utility" data-edit="CHROME">
        <div className="container">
          <div className="group">
            <span className="utility-date">{TODAY_LABEL}</span>
            <Link to="/live"><span className="dot dot--pulse" style={{ color: 'var(--red)' }} />{chrome.tvLive}</Link>
            <Link to="/live"><span className="dot" style={{ color: 'var(--amber)' }} />{chrome.radioLive}</Link>
          </div>
          <div className="group utility-links">
            {chrome.utilityLinks.map((l, i) => <Link key={l.label + i} to={l.to} style={i === chrome.utilityLinks.length - 1 ? { color: '#fff', fontWeight: 600 } : undefined}>{l.label}</Link>)}
          </div>
        </div>
      </div>

      <header className="site-header" data-edit="NAV">
        <div className="container site-header-bar">
          <Logo />
          <nav aria-label="Main" className="main-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button type="button" className="icon-btn header-search" aria-label="Search"><SearchIcon color="#111216" /></button>
            <Link to={chrome.liveButton.to} className="btn btn--red header-live"><PlayIcon />{chrome.liveButton.label}</Link>
            <button type="button" className={`burger ${open ? 'on' : ''}`} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className={`mobile-menu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <button type="button" className="mm-close" tabIndex={open ? 0 : -1} aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
        <nav aria-label="Mobile">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} tabIndex={open ? 0 : -1} className={({ isActive }) => `mm-link ${isActive ? 'active' : ''}`}>{n.label}</NavLink>)}
        </nav>
        <Link to={chrome.liveButton.to} tabIndex={open ? 0 : -1} className="btn btn--red btn--lg mm-live"><PlayIcon />{chrome.liveButton.label}</Link>
        <div className="mm-extra">
          {chrome.utilityLinks.map((l, i) => <Link key={l.label + i} to={l.to} tabIndex={open ? 0 : -1}>{l.label}</Link>)}
        </div>
      </div>
      {open && <button type="button" className="mm-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
    </>
  );
}
