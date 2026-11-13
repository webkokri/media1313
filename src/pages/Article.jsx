import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookmarkIcon, LinkIcon, PauseIcon, Placeholder, PlayIcon, ShareIcon } from '../components/ui.jsx';
import Markdown from '../markdown.jsx';
import AdSlot from '../components/AdSlot.jsx';
import ShareButtons from '../components/ShareButtons.jsx';
import { Loaded, articleTo, clock, timeAgo, useApi, useNewsletter } from '../api.jsx';

export default function Article() {
  const { slug } = useParams();
  const state = useApi(`/articles/${encodeURIComponent(slug)}`);
  const recent = useApi('/articles?limit=6');
  if (state.error) {
    return (
      <main className="container stack" style={{ padding: '80px 0', gap: 16 }}>
        <h1 className="page-title">Story not found</h1>
        <p className="meta">We couldn’t find that story. <Link to="/news" style={{ fontWeight: 700 }}>Back to News</Link></p>
      </main>
    );
  }
  return <Loaded state={state}>{({ article, related }) => <ArticleBody article={article} related={related} latest={(recent.data?.articles ?? []).filter((a) => a.slug !== article.slug).slice(0, 5)} />}</Loaded>;
}

function ArticleBody({ article: a, related, latest }) {
  const [playing, setPlaying] = useState(false);
  const nl = useNewsletter('article');
  useEffect(() => { const t = document.title; document.title = `${a.title} — MEDIA 1313`; return () => { document.title = t; }; }, [a.title]);

  return (
    <main className="container row" style={{ paddingTop: 32, paddingBottom: 64, gap: 56 }}>
      <article className="stack" style={{ flex: '999 1 640px', minWidth: 0, gap: 22 }}>
        <nav aria-label="Breadcrumb" className="meta" style={{ display: 'flex', gap: 8 }}>
          <Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/news">News</Link><span aria-hidden="true">/</span><span>{a.category}</span>
        </nav>
        <span className="kicker kicker--red">{a.kicker}</span>
        <h1 className="cond" style={{ fontWeight: 800, fontSize: 'clamp(40px, 6vw, 64px)', lineHeight: 0.98 }}>{a.title}</h1>
        <p style={{ fontSize: 21, lineHeight: 1.5, color: 'var(--body)' }}>{a.dek}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '14px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--img)' }} />
            <div><p style={{ fontWeight: 700, fontSize: 15 }}>{a.author ? `By ${a.author}` : 'MEDIA 1313'}</p><p className="meta">Published {new Date(a.publishedAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })} · Updated {timeAgo(a.updatedAt)}</p></div>
          </div>
          <ShareButtons compact title={a.title} text={a.dek} />
        </div>

        {/* Listen bar — connect to a text-to-speech or recorded audio file */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--ink)', color: '#fff', borderRadius: 999, padding: '8px 20px 8px 8px' }}>
          <button type="button" aria-label={playing ? 'Pause audio' : 'Listen to this article'} className="play-circle" style={{ width: 44, height: 44, background: 'var(--amber)' }} onClick={() => setPlaying(!playing)}>
            {playing ? <PauseIcon color="#111216" /> : <PlayIcon color="#111216" />}
          </button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{playing ? 'Playing · read by a 1313 Radio host' : 'Listen to this article'}</span>
          <span className="muted-dark" style={{ marginLeft: 'auto', fontSize: 13 }}>{a.readMinutes} min</span>
        </div>

        <figure className="stack" style={{ margin: 0, gap: 8 }}>
          {a.heroImage
            ? <img src={a.heroImage} alt="" style={{ width: '100%', borderRadius: 8 }} />
            : <Placeholder label="Hero image 16:9" />}
        </figure>

        <div className="prose">
          <Markdown source={a.content} />
          <Link to="/live" style={{ fontFamily: 'var(--font)', background: 'var(--night)', color: '#fff', borderRadius: 10, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
            <div className="thumb-play r-16-9" style={{ flex: '1 1 260px', borderRadius: 0 }}>
              <span className="play-circle" style={{ width: 52, height: 52 }}><PlayIcon size={18} color="#111216" /></span>
            </div>
            <div className="stack" style={{ flex: '1 1 240px', padding: 20, gap: 8, justifyContent: 'center' }}>
              <span className="kicker kicker--amber">WATCH · THE EVENING REPORT</span>
              <span className="headline" style={{ fontSize: 26, lineHeight: 1.05 }}>What the transit plan means for commuters</span>
              <span className="muted-dark" style={{ fontSize: 13 }}>12:40</span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12 }}>
          {a.tags.map((t) => (
            <Link key={t} to="/news" style={{ fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 999, background: 'var(--paper)' }}>{t}</Link>
          ))}
        </div>

        <AdSlot place="article" />
        <section aria-label="Share this story" style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          <h2 className="display" style={{ fontSize: 24, marginBottom: 12 }}>Share this story</h2>
          <ShareButtons label="" title={a.title} text={a.dek} />
        </section>

        <section aria-label="Related stories" style={{ borderTop: '3px solid var(--ink)', paddingTop: 16, marginTop: 20 }}>
          <h2 className="display" style={{ fontSize: 30, marginBottom: 20 }}>Related</h2>
          <div className="grid grid-200">
            {related.map((r) => (
              <Link key={r.slug} to={articleTo(r)} className="card-link">
                <Placeholder ratio="16-10" src={r.heroImage} />
                <span className="headline" style={{ fontSize: 22, lineHeight: 1.1 }}>{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      </article>

      <aside className="side-col stack" style={{ gap: 28 }}>
        <div className="box box--paper" style={{ borderRadius: 8, padding: 22 }}>
          <h2 className="box-title">Latest</h2>
          {latest.map((l) => (
            <Link key={l.slug} to={articleTo(l)} className="list-row list-row--paper" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>
              <span className="time-col" style={{ width: 48, fontSize: 12, fontWeight: 500 }}>{clock(l.publishedAt)}</span>{l.title}
            </Link>
          ))}
        </div>
        <div className="box box--red stack" style={{ gap: 10, borderRadius: 8, padding: 22 }}>
          <span className="kicker">LIVE ON 1313 TV</span>
          <h2 className="headline" style={{ fontSize: 28, lineHeight: 1.05 }}>Watch the council vote live tonight</h2>
          <Link to="/live" className="btn btn--ink" style={{ alignSelf: 'flex-start' }}>Watch live</Link>
        </div>
        <form className="box box--line stack" style={{ gap: 12, borderRadius: 8, padding: 22 }} onSubmit={nl.submit}>
          <h2 className="display" style={{ fontSize: 24 }}>The 1313 Briefing</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--body)' }}>Top stories in your inbox every morning.</p>
          <div className="field">
            <label htmlFor="art-email">Email address</label>
            <input id="art-email" className="input" type="email" required placeholder="you@example.com" value={nl.email} onChange={(e) => nl.setEmail(e.target.value)} />
          </div>
          {nl.status.message && <p role="status" style={{ fontSize: 14, fontWeight: 600 }}>{nl.status.message}</p>}
          <button type="submit" disabled={nl.status.state === 'busy'} className="btn btn--ink" style={{ borderRadius: 6 }}>Subscribe</button>
        </form>
      </aside>
    </main>
  );
}
