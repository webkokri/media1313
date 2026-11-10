import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../content.jsx';
import { api, articleMeta, articleTo, useApi, useNewsletter } from '../api.jsx';
import { PlayIcon, VideoCard } from '../components/ui.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { cleanCustomHtml, cleanHtml } from './sanitize.js';

const A = ({ href, children, ...p }) => (/^(https?:|mailto:|tel:)/.test(href || '') ? <a href={href} {...p}>{children}</a> : <Link to={href || '/'} {...p}>{children}</Link>);
const Hint = ({ children }) => <div className="pb-hint">{children}</div>;
const BTN = { red: 'btn btn--red', ink: 'btn btn--ink', amber: 'btn btn--amber', white: 'btn btn--white', outline: 'btn btn--outline' };

function Counter({ s, editor }) {
  const [n, setN] = useState(editor ? +s.number : 0);
  const ref = useRef();
  useEffect(() => {
    if (editor || !ref.current) { setN(+s.number); return undefined; }
    const target = +s.number || 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = (t) => { const k = Math.min(1, (t - t0) / 1400); setN(Math.round(target * (1 - (1 - k) ** 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(ref.current); return () => io.disconnect();
  }, [s.number, editor]);
  return (
    <div className="pb-in" ref={ref}>
      <div className="pb-ct-num">{s.prefix}{n.toLocaleString()}{s.suffix}</div>
      <div className="pb-ct-label" data-pb-edit="label">{s.label}</div>
    </div>
  );
}

function Accordion({ s, editor }) {
  const [open, setOpen] = useState(s.openFirst ? 0 : -1);
  return (
    <div className="pb-in pb-acc">
      {(s.items || []).map((it, i) => (
        <div key={i} className={`pb-acc-item ${open === i || editor ? 'open' : ''}`}>
          <button type="button" className="pb-acc-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{it.title}<span aria-hidden="true">{open === i ? '−' : '+'}</span></button>
          {(open === i || editor) && <div className="pb-acc-body">{it.body}</div>}
        </div>
      ))}
    </div>
  );
}

function Articles({ s, editor }) {
  const { NEWS_CATEGORIES } = useContent();
  const q = useApi(`/articles?category=${encodeURIComponent(s.category || 'All')}&limit=${Math.min(+s.count || 6, 24)}`);
  const list = q.data?.articles || [];
  return (
    <div className="pb-in">
      {(s.heading || s.linkText) && <div className="section-head"><h2 data-pb-edit="heading">{s.heading}</h2>{s.linkText && <Link to="/news">{s.linkText}</Link>}</div>}
      {q.error && <Hint>Articles could not be loaded.</Hint>}
      {q.data && list.length === 0 && <Hint>No articles in “{s.category || 'All'}” yet.</Hint>}
      <div className={`pb-grid pb-articles ${s.layout === 'list' ? 'pb-list' : ''}`}>
        {list.map((a) => (
          <Link key={a.slug} to={articleTo(a)} className="pb-card" onClick={(e) => editor && e.preventDefault()}>
            {s.showImage && (a.heroImage ? <img src={a.heroImage} alt="" loading="lazy" /> : <div className="ph r-16-10" />)}
            <div className="pb-card-body">
              <span className="kicker kicker--red" style={{ fontSize: 11 }}>{a.kicker}</span>
              <span className="headline">{a.title}</span>
              {s.showExcerpt && a.dek && <span className="pb-excerpt">{a.dek}</span>}
              {s.showMeta && <span className="meta">{articleMeta(a)}</span>}
            </div>
          </Link>
        ))}
      </div>
      {!NEWS_CATEGORIES ? null : null}
    </div>
  );
}

function ContactForm({ s }) {
  const { CONTACT_TOPICS } = useContent();
  const [f, setF] = useState({ name: '', email: '', topic: CONTACT_TOPICS?.[0] || 'Something else', message: '' });
  const [state, setState] = useState({ sent: false, error: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); try { await api.post('/contact', f); setState({ sent: true, error: '' }); } catch (x) { setState({ sent: false, error: x.message }); } };
  if (state.sent) return <div className="pb-in"><p style={{ fontWeight: 700 }}>Thank you — your message is on its way to the newsroom.</p></div>;
  return (
    <form className="pb-in pb-form" onSubmit={submit}>
      <input className="input" placeholder="Your name" required value={f.name} onChange={set('name')} />
      <input className="input" type="email" placeholder="Email" required value={f.email} onChange={set('email')} />
      <select className="input" value={f.topic} onChange={set('topic')}>{(CONTACT_TOPICS || []).map((t) => <option key={t}>{t}</option>)}</select>
      <textarea className="input" rows={5} placeholder="Message" required value={f.message} onChange={set('message')} />
      {state.error && <p role="alert" style={{ color: 'var(--red-dark)', fontWeight: 600 }}>{state.error}</p>}
      <button className="btn btn--red" type="submit" data-pb-edit="button">{s.button}</button>
    </form>
  );
}

function Newsletter({ s }) {
  const nl = useNewsletter('builder');
  return (
    <div className="pb-in">
      <h2 className="display pb-nl-title" data-pb-edit="title">{s.title}</h2>
      <p className="pb-nl-text" data-pb-edit="text">{s.text}</p>
      <form onSubmit={nl.submit} className="pb-nl-form">
        <input type="email" required placeholder={s.placeholder} value={nl.email} onChange={(e) => nl.setEmail(e.target.value)} aria-label="Email address" />
        <button type="submit" className="btn btn--ink btn--lg" disabled={nl.status.state === 'busy'}>{s.button}</button>
      </form>
      {nl.status.message && <p role="status" style={{ fontWeight: 600, marginTop: 8 }}>{nl.status.message}</p>}
    </div>
  );
}

function OnAir({ s }) {
  const c = useContent(); const tv = s.channel !== 'radio';
  const now = tv ? c.NOW_ON_TV : c.NOW_ON_RADIO; const next = (tv ? c.TV_UP_NEXT : c.RADIO_UP_NEXT) || [];
  return (
    <div className="pb-in box box--panel stack" style={{ gap: 12, padding: 20, color: '#fff' }}>
      <p className="kicker kicker--amber">{tv ? 'ON 1313 TV NOW' : `ON 1313 RADIO · ${c.FM}`}</p>
      <h3 className="headline" style={{ fontSize: 30, lineHeight: 1.05 }}>{now?.title}</h3>
      {now?.sub && <p className="muted-dark" style={{ fontSize: 14 }}>{now.sub}</p>}
      <div className="stack" style={{ gap: 0 }}>{next.slice(0, 5).map((r) => <div key={r.time + r.title} className="list-row list-row--dark"><span className="time-col time-col--dark">{r.time}</span><span><span className="row-title">{r.title}</span><span className="row-sub row-sub--dark">{r.sub}</span></span></div>)}</div>
      <Link to="/schedule" style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Full schedule →</Link>
    </div>
  );
}

function Schedule({ s }) {
  const c = useContent(); const rows = (c.SCHEDULE?.[`${s.channel === 'radio' ? 'radio' : 'tv'}${s.day === 'weekend' ? 'Weekend' : 'Weekday'}`] || []).slice(0, +s.rows || 6);
  return <div className="pb-in">{rows.map((r) => <div key={r[0] + r[1]} className="list-row list-row--paper"><span className="time-col" style={{ width: 84 }}>{r[0]}</span><span><span className="row-title">{r[1]}</span><span className="row-sub">{r[2]}</span></span></div>)}</div>;
}

function Shows({ s }) {
  const { SHOWS } = useContent(); const HREF = { TV: '/tv', RADIO: '/radio', PODCAST: '/podcasts' };
  const list = (SHOWS || []).filter((x) => s.type === 'All' || x.type === s.type);
  return <div className="pb-in"><div className="pb-grid">{list.map((x) => <Link key={x.title} to={HREF[x.type]} className="pb-show" style={{ background: x.bg }}><span className="kicker">{x.type}</span><strong className="display">{x.title}</strong><span>{x.when}</span></Link>)}</div></div>;
}

/** The inner content of one widget. The wrapper (class, data attributes) is added by Render.jsx. */
export function WidgetBody({ node, editor }) {
  const s = node.s; const c = useContent();
  switch (node.type) {
    case 'heading': { const Tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'].includes(s.tag) ? s.tag : 'h2'; const el = <Tag className="pb-in" data-pb-edit="text">{s.text}</Tag>; return s.link && !editor ? <A href={s.link} className="pb-linkwrap">{el}</A> : el; }
    case 'text': return <div className="pb-in pb-text" data-pb-edit="html" data-pb-rich="1" dangerouslySetInnerHTML={{ __html: cleanHtml(s.html) }} />;
    case 'image': {
      if (!s.src) return editor ? <div className="pb-in"><Hint>🖼 Choose an image in the settings panel</Hint></div> : null;
      const img = <img src={s.src} alt={s.alt || ''} loading="lazy" />;
      return <figure className="pb-in" style={{ margin: 0 }}>{s.link && !editor ? <A href={s.link}>{img}</A> : img}{s.caption && <figcaption className="meta" data-pb-edit="caption">{s.caption}</figcaption>}</figure>;
    }
    case 'button': { const ic = s.icon === 'play' ? <PlayIcon size={14} /> : s.icon === 'arrow' ? <span aria-hidden="true">→</span> : null; const cls = `pb-in ${BTN[s.variant] || BTN.red} ${s.size === 'lg' ? 'btn--lg' : s.size === 'sm' ? 'pb-btn-sm' : ''}`; const body = <>{ic}<span data-pb-edit="text">{s.text}</span></>;
      return editor ? <span className={cls} role="button">{body}</span> : <A href={s.link || '#'} className={cls} {...(s.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</A>; }
    case 'spacer': return <div className="pb-in" aria-hidden="true" />;
    case 'divider': return <hr className="pb-in" />;
    case 'video': return <div className="pb-in"><VideoPlayer src={s.url} poster={s.poster} autoPlay={!!s.autoplay && !editor} muted={!!s.autoplay} emptyMessage="Add a video link in the settings panel." /></div>;
    case 'player': return <div className="pb-in"><VideoPlayer src={s.url || c.PLAYER?.streamUrl} poster={s.poster || c.PLAYER?.poster} autoPlay={!editor && !!c.PLAYER?.autoplay} muted={!!c.PLAYER?.autoplay} /></div>;
    case 'gallery': return <div className="pb-in">{(s.images || []).filter((i) => i.src).map((i, n) => <img key={n} src={i.src} alt={i.alt || ''} loading="lazy" />)}{!(s.images || []).some((i) => i.src) && editor && <Hint>Add images in the settings panel</Hint>}</div>;
    case 'hero': {
      const bg = s.bgImage ? `linear-gradient(rgba(14,16,20,${(+s.overlay || 0) / 100}), rgba(14,16,20,${(+s.overlay || 0) / 100})), url("${s.bgImage}") center/cover` : `linear-gradient(rgba(14,16,20,${Math.max(0.2, (+s.overlay || 0) / 100)}), rgba(14,16,20,.95)), #23262e`;
      return (
        <div className="pb-in pb-hero" style={{ background: bg }}>
          <div className="pb-hero-inner">
            {s.eyebrow && <span className="kicker kicker--amber" data-pb-edit="eyebrow">{s.eyebrow}</span>}
            <h1 className="pb-hero-title display" data-pb-edit="title">{s.title}</h1>
            {s.subtitle && <p className="pb-hero-sub" data-pb-edit="subtitle">{s.subtitle}</p>}
            <div className="pb-hero-btns">
              {s.btn1Text && (editor ? <span className="btn btn--red btn--lg">{s.btn1Text}</span> : <A href={s.btn1Link} className="btn btn--red btn--lg">{s.btn1Text}</A>)}
              {s.btn2Text && (editor ? <span className="btn btn--outline btn--lg" style={{ color: '#fff' }}>{s.btn2Text}</span> : <A href={s.btn2Link} className="btn btn--outline btn--lg" style={{ color: '#fff' }}>{s.btn2Text}</A>)}
            </div>
          </div>
        </div>
      );
    }
    case 'iconbox': { const inner = <><div className="pb-ib-icon">{s.icon}</div><h3 className="pb-ib-title" data-pb-edit="title">{s.title}</h3><p data-pb-edit="text">{s.text}</p></>; return <div className="pb-in pb-ib">{s.link && !editor ? <A href={s.link}>{inner}</A> : inner}</div>; }
    case 'iconlist': return <ul className="pb-in pb-il">{(s.items || []).map((it, i) => <li key={i}><span className="pb-il-icon">{it.icon}</span><span>{it.text}</span></li>)}</ul>;
    case 'counter': return <Counter s={s} editor={editor} />;
    case 'accordion': return <Accordion s={s} editor={editor} />;
    case 'testimonial': return <figure className="pb-in pb-tm">{s.image && <img className="pb-tm-img" src={s.image} alt="" />}<blockquote className="pb-tm-quote" data-pb-edit="quote">{s.quote}</blockquote><figcaption><strong data-pb-edit="name">{s.name}</strong><span> {s.role}</span></figcaption></figure>;
    case 'html': return <div className="pb-in" dangerouslySetInnerHTML={{ __html: cleanCustomHtml(s.code) }} />;
    case 'ticker': return <div className="pb-in ticker"><div className="container"><strong>{s.label || 'BREAKING'}</strong><p>{c.SITE?.breaking}</p></div></div>;
    case 'onair': return <OnAir s={s} />;
    case 'schedule': return <Schedule s={s} />;
    case 'articles': return <Articles s={s} editor={editor} />;
    case 'shows': return <Shows s={s} />;
    case 'podcasts': return <div className="pb-in"><div className="pb-grid">{(c.PODCASTS || []).slice(0, +s.count || 3).map((p) => <Link key={p.title} to="/podcasts" className="pb-show" style={{ background: p.bg }}><span className="kicker">PODCAST</span><strong className="display">{p.title}</strong><span>{p.desc}</span></Link>)}</div></div>;
    case 'videos': return <div className="pb-in"><div className="pb-grid">{(c.VIDEOS || []).slice(0, +s.count || 4).map((v) => <VideoCard key={v.title} title={v.title} kicker={v.show} duration={v.dur} />)}</div></div>;
    case 'newsletter': return <Newsletter s={s} />;
    case 'contact': return <ContactForm s={s} />;
    default: return <Hint>Unknown widget “{node.type}”</Hint>;
  }
}
