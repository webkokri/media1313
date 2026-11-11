import { useEffect, useState } from 'react';
import { useContent } from '../content.jsx';

// Share a page to social networks. Uses the phone's native share sheet when the browser has one.
// Which networks show is set in the admin: Site content → Social media & sharing.
const I = ({ children, fill }) => <svg width="20" height="20" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const enc = encodeURIComponent;
const NETWORKS = {
  facebook: { label: 'Facebook', color: '#1877f2', popup: true, href: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, icon: <I fill><path d="M14 8.5V7c0-.7.3-1 1-1h2V3h-2.7C11.6 3 10 4.6 10 7v1.5H8V12h2v9h4v-9h2.6l.4-3.5H14z" /></I> },
  x: { label: 'X (Twitter)', color: '#111216', popup: true, href: ({ url, title, via }) => `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}${via ? `&via=${enc(via)}` : ''}`, icon: <I><path d="M4.5 4.5l15 15M19.5 4.5l-15 15" /></I> },
  whatsapp: { label: 'WhatsApp', color: '#25d366', href: ({ url, title }) => `https://wa.me/?text=${enc(`${title} ${url}`)}`, icon: <I><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" /><path d="M9 8.5c.3 2.5 3 5.2 5.5 5.5l1.2-1.4-2-1-.8.8c-.8-.3-1.9-1.4-2.2-2.2l.8-.8-1-2z" fill="currentColor" stroke="none" /></I> },
  linkedin: { label: 'LinkedIn', color: '#0a66c2', popup: true, href: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, icon: <I><path d="M6.5 10v8M6.5 6.5v.01M11 18v-8M11 13.5a3 3 0 0 1 6 0V18" /></I> },
  telegram: { label: 'Telegram', color: '#229ed9', href: ({ url, title }) => `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`, icon: <I><path d="M21 4L3 11l6 2.2L11 19l3-4 5 3.5z" /><path d="M9 13.2L21 4" /></I> },
  email: { label: 'Email', color: '#52525b', href: ({ url, title, text }) => `mailto:?subject=${enc(title)}&body=${enc(`${text ? `${text}\n\n` : ''}${url}`)}`, icon: <I><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></I> },
};
export const SHARE_DEFAULT = { facebook: true, x: true, whatsapp: true, linkedin: true, telegram: true, email: true, copy: true, native: true };

export default function ShareButtons({ url, title, text, label = 'Share', compact = false, align = 'left', networks }) {
  const { SOCIAL = {} } = useContent();
  const on = { ...SHARE_DEFAULT, ...(SOCIAL.share || {}), ...(networks || {}) };
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => setCanNative(typeof navigator !== 'undefined' && !!navigator.share), []);
  const data = { url: url || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''), title: title || (typeof document !== 'undefined' ? document.title : ''), text, via: String(SOCIAL.handle || '').replace(/^@/, '') };

  const open = (e, n) => { if (!n.popup || e.metaKey || e.ctrlKey || window.innerWidth < 700) return; e.preventDefault(); window.open(n.href(data), 'share', 'noopener,noreferrer,width=620,height=520'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(data.url); } catch { const t = document.createElement('textarea'); t.value = data.url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };
  const nativeShare = () => navigator.share({ title: data.title, text: data.text, url: data.url }).catch(() => {});

  return (
    <div className={`share ${compact ? 'share--compact' : ''}`} role="group" aria-label="Share this page" style={{ justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
      {!compact && label && <span className="share-label">{label}</span>}
      {on.native && canNative && <button type="button" className="share-btn share-native" onClick={nativeShare} aria-label="Share…" title="Share…"><I><path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5" /></I></button>}
      {Object.entries(NETWORKS).filter(([k]) => on[k]).map(([k, n]) => (
        <a key={k} className="share-btn" href={n.href(data)} target="_blank" rel="noopener noreferrer" onClick={(e) => open(e, n)} aria-label={`Share on ${n.label}`} title={`Share on ${n.label}`} style={{ '--c': n.color }}>{n.icon}</a>
      ))}
      {on.copy && <button type="button" className="share-btn" onClick={copy} aria-label="Copy link" title="Copy link" style={{ '--c': '#3f3f46' }}>{copied ? <I><path d="M5 12l4 4 10-10" /></I> : <I><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></I>}</button>}
      <span className="share-copied" role="status" aria-live="polite">{copied ? 'Link copied!' : ''}</span>
    </div>
  );
}
