import { Link, NavLink } from 'react-router-dom';
import { Logo, PlayIcon, SearchIcon } from './ui.jsx';
import { TODAY_LABEL } from '../data.js';
import { useContent } from '../content.jsx';

export default function Header() {
  const { NAV } = useContent();
  return (
    <>
      <div className="utility">
        <div className="container">
          <div className="group">
            <span>{TODAY_LABEL}</span>
            <Link to="/live"><span className="dot dot--pulse" style={{ color: 'var(--red)' }} />1313 TV live now</Link>
            <Link to="/live"><span className="dot" style={{ color: 'var(--amber)' }} />1313 Radio on air</Link>
          </div>
          <div className="group">
            <Link to="/#newsletter">Newsletters</Link>
            <Link to="/about">About</Link>
            <Link to="/signin" style={{ color: '#fff', fontWeight: 600 }}>Sign in</Link>
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
            <Link to="/live" className="btn btn--red"><PlayIcon />Watch &amp; Listen Live</Link>
          </div>
        </div>
      </header>
    </>
  );
}
