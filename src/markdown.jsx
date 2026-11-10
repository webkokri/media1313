import { Fragment } from 'react';

// Minimal markdown for article bodies written in the StudioCMS editor:
// paragraphs, "## " / "### " headings, "> " quotes, "- " lists, **bold**, *italic*, [links](url).
function inline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    let m;
    if ((m = p.match(/^\*\*([^*]+)\*\*$/))) return <strong key={i}>{m[1]}</strong>;
    if ((m = p.match(/^\*([^*]+)\*$/))) return <em key={i}>{m[1]}</em>;
    if ((m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) return /^(https?:|\/|mailto:)/.test(m[2]) ? <a key={i} href={m[2]}>{m[1]}</a> : <Fragment key={i}>{m[1]}</Fragment>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export default function Markdown({ source = '' }) {
  return source.split(/\n{2,}/).map((block, i) => {
    const b = block.trim();
    if (!b) return null;
    const img = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img && /^(https?:|\/)/.test(img[2])) return <figure key={i} style={{ margin: '24px 0' }}><img src={img[2]} alt={img[1]} style={{ width: '100%', borderRadius: 8 }} />{img[1] && <figcaption className="meta">{img[1]}</figcaption>}</figure>;
    if (b.startsWith('### ')) return <h3 key={i}>{inline(b.slice(4))}</h3>;
    if (b.startsWith('## ') || b.startsWith('# ')) return <h2 key={i}>{inline(b.replace(/^#+\s/, ''))}</h2>;
    if (b.startsWith('>')) {
      const [quote, cite] = b.replace(/^>\s?/gm, '').split(/\s+[—–-]\s+(?=[^—–-]+$)/);
      return <blockquote key={i} className="pull-quote">{inline(quote)}{cite && <cite>— {cite}</cite>}</blockquote>;
    }
    if (/^[-*] /.test(b)) return <ul key={i}>{b.split('\n').map((l, j) => <li key={j}>{inline(l.replace(/^[-*] /, ''))}</li>)}</ul>;
    return <p key={i}>{inline(b)}</p>;
  });
}
