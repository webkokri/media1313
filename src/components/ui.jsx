import { Link } from 'react-router-dom';

/* ---------- Icons (inline SVG, inherit currentColor) ---------- */
export const PlayIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M8 5l12 7-12 7z" /></svg>
);
export const PauseIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
);
const Stroke = ({ size = 20, color = 'currentColor', width = 2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const SearchIcon = (p) => <Stroke {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Stroke>;
export const ArrowIcon = (p) => <Stroke size={16} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Stroke>;
export const ShareIcon = (p) => <Stroke size={18} {...p}><path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5" /></Stroke>;
export const LinkIcon = (p) => <Stroke size={18} {...p}><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></Stroke>;
export const BookmarkIcon = (p) => <Stroke size={18} {...p}><path d="M6 3h12v18l-6-4-6 4z" /></Stroke>;
export const PlusIcon = (p) => <Stroke size={16} {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const CheckIcon = (p) => <Stroke size={22} width={2.5} {...p}><path d="M5 12l4 4 10-10" /></Stroke>;
export const TvIcon = (p) => <Stroke size={18} {...p}><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M8 21h8" /></Stroke>;
export const RadioIcon = (p) => <Stroke size={18} {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8l10-5" /><circle cx="15" cy="14" r="3" /></Stroke>;
export const PhoneIcon = (p) => <Stroke size={28} {...p}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Stroke>;
export const AntennaIcon = (p) => <Stroke size={32} {...p}><path d="M12 12l7-9M12 12L5 3M12 12v9M8 21h8" /></Stroke>;
export const MonitorIcon = (p) => <Stroke size={28} {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></Stroke>;
export const SpeakerIcon = (p) => <Stroke size={28} {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9h6v6H9z" /></Stroke>;
export const CaptionsIcon = (p) => <Stroke size={22} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3" /></Stroke>;
export const FullscreenIcon = (p) => <Stroke {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Stroke>;
export const VideoIcon = (p) => <Stroke size={14} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></Stroke>;
export const SuccessIcon = (p) => <Stroke size={40} color="#0F7A5A" {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Stroke>;

/* ---------- Bits ---------- */
export const Logo = ({ className = '' }) => (
  <Link to="/" className={`logo ${className}`} aria-label="MEDIA 1313 home">
    <span>MEDIA</span><span>1313</span>
  </Link>
);

export const LiveBadge = ({ label = 'LIVE' }) => (
  <span className="live-badge"><span className="dot dot--pulse" style={{ color: '#fff' }} />{label}</span>
);

export const Equalizer = ({ height = 24, bars = 4, color = 'var(--amber)' }) => (
  <div className="eq" aria-hidden="true" style={{ height, color }}>
    {Array.from({ length: bars }).map((_, i) => <span key={i} style={{ height }} />)}
  </div>
);

/** Grey image placeholder — replace with <img> when you have photos. */
export const Placeholder = ({ ratio = '16-9', label, dark = false, style, className = '' }) => (
  <div className={`ph r-${ratio} ${dark ? 'ph--dark' : ''} ${className}`} style={style}>{label}</div>
);

export const SectionHead = ({ title, linkText, to, dark = false }) => (
  <div className={`section-head ${dark ? 'section-head--dark' : ''}`}>
    <h2>{title}</h2>
    {linkText && <Link to={to}>{linkText}</Link>}
  </div>
);

/** Pill filter tabs. options: string[] */
export const PillTabs = ({ options, value, onChange, label }) => (
  <div role="tablist" aria-label={label} className="pills">
    {options.map((o) => (
      <button key={o} type="button" role="tab" aria-selected={o === value} className="pill" onClick={() => onChange(o)}>{o}</button>
    ))}
  </div>
);

/** Segmented control. options: [{ value, label, icon? }] */
export const Segmented = ({ options, value, onChange, label, light = false, large = false }) => (
  <div role="tablist" aria-label={label} className={`seg ${light ? 'seg--light' : ''} ${large ? 'seg--lg' : ''}`}>
    {options.map((o) => (
      <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
        {o.icon}{o.label}
      </button>
    ))}
  </div>
);

export const VideoCard = ({ title, kicker, duration, to = '/live', dark = false }) => (
  <Link to={to} className="card-link" style={dark ? { color: '#fff' } : undefined}>
    <div className="thumb-play r-16-9">
      <span className="play-circle" style={{ width: 48, height: 48 }}><PlayIcon size={18} color="#111216" /></span>
      {duration && <span className="duration">{duration}</span>}
    </div>
    {kicker && <span className="kicker kicker--muted">{kicker}</span>}
    <span className="headline" style={{ fontSize: 22 }}>{title}</span>
  </Link>
);
