// AI auto-blog: writes news-site articles with Claude on a daily schedule, from topics set in the admin.
//   - Settings live in m1313_settings ("autoblog"); the Anthropic API key in "autoblog_key" (or env ANTHROPIC_API_KEY).
//   - A timer ticks every few minutes (and /api/cron/autoblog can be hit by a real cron job). Each tick publishes at most one
//     post if the day's schedule says one is due: N posts/day are spread evenly across the posting window.
//   - Articles are saved as drafts for review (default) or published immediately.
import Anthropic from '@anthropic-ai/sdk';
import { all, one, run, uuid, now, getSetting, setSetting, getContent } from './db.js';
import { adminSave } from './articles.js';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 — best quality (default)', fallbacks: true },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 — fast, lower cost', fallbacks: true },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 — lowest cost', fallbacks: false },
];
export const DEFAULTS = {
  enabled: false, postsPerDay: 2, mode: 'draft', windowStart: 7, windowEnd: 22, timezone: 'America/Toronto',
  model: 'claude-opus-5-5', effort: 'low', language: 'English', wordCount: 700, author: '1313 Newsroom',
  tone: 'Clear, neutral and engaging, in the style of a trustworthy local news and media site.',
  topics: [],
};
const FALLBACK_CATEGORIES = ['Local', 'World', 'Politics', 'Business', 'Tech', 'Health', 'Entertainment'];

export async function loadSettings() { return { ...DEFAULTS, ...(await getSetting('autoblog', {})) }; }
export async function saveSettings(input) {
  const cur = await loadSettings(); const n = (v, lo, hi, d) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const s = {
    enabled: !!input.enabled, postsPerDay: n(input.postsPerDay, 1, 24, cur.postsPerDay), mode: input.mode === 'publish' ? 'publish' : 'draft',
    windowStart: n(input.windowStart, 0, 22, cur.windowStart), windowEnd: n(input.windowEnd, 1, 24, cur.windowEnd),
    timezone: validTz(input.timezone) ? input.timezone : cur.timezone,
    model: MODELS.some((m) => m.id === input.model) ? input.model : cur.model,
    effort: ['low', 'medium', 'high'].includes(input.effort) ? input.effort : cur.effort,
    language: String(input.language || 'English').slice(0, 40), tone: String(input.tone || DEFAULTS.tone).slice(0, 400),
    wordCount: n(input.wordCount, 300, 1800, cur.wordCount), author: String(input.author || DEFAULTS.author).slice(0, 100),
    topics: (Array.isArray(input.topics) ? input.topics : []).slice(0, 60).map((t) => ({
      id: String(t.id || uuid()).slice(0, 40), topic: String(t.topic || '').trim().slice(0, 240), category: String(t.category || '').slice(0, 60),
      notes: String(t.notes || '').slice(0, 400), enabled: t.enabled !== false,
    })).filter((t) => t.topic),
  };
  if (s.windowEnd <= s.windowStart) s.windowEnd = Math.min(24, s.windowStart + 1);
  await setSetting('autoblog', s); return s;
}
const validTz = (tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return !!tz; } catch { return false; } };

export async function getApiKey() { return process.env.ANTHROPIC_API_KEY || (await getSetting('autoblog_key', '')) || ''; }
export const keyHint = (k) => (k ? `…${k.slice(-4)}` : '');

/* ---------------------------------------------------------------- schedule ---------------------------------------------------------------- */
function localParts(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) + Number(p.minute) / 60 };
}
const fmtHour = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** Where are we in today's schedule? */
export function schedule(s, logRows, at = new Date()) {
  const lp = localParts(at, s.timezone);
  const postedToday = logRows.filter((r) => r.status === 'ok' && r.source === 'auto' && localParts(new Date(r.created_at), s.timezone).day === lp.day).length;
  const slots = Array.from({ length: s.postsPerDay }, (_, i) => s.windowStart + ((s.windowEnd - s.windowStart) * i) / s.postsPerDay);   // first post at the start of the window
  const dueSlots = slots.filter((t) => lp.hour >= t).length;
  const next = postedToday < s.postsPerDay ? { day: 'today', at: fmtHour(slots[postedToday]) } : { day: 'tomorrow', at: fmtHour(slots[0]) };
  return { postedToday, dueNow: postedToday < dueSlots, target: s.postsPerDay, next, localTime: fmtHour(lp.hour), timezone: s.timezone };
}

async function recentLog(n = 200) { return all('SELECT id, created_at, source, topic, status, title, article_id, message, model, input_tokens, output_tokens FROM m1313_autoblog_log ORDER BY created_at DESC LIMIT ?', [n]); }

/* ---------------------------------------------------------------- generation ---------------------------------------------------------------- */
async function categories() {
  try { const r = (await getContent()).find((x) => x.content_key === 'NEWS_CATEGORIES'); const v = r && JSON.parse(r.content_value); const c = (v || []).filter((x) => x !== 'All'); return c.length ? c : FALLBACK_CATEGORIES; } catch { return FALLBACK_CATEGORIES; }
}

const SYSTEM = (s, cats) => `You are a staff writer for MEDIA 1313, a community TV, radio and news website. Write ONE original article in ${s.language}.

Voice: ${s.tone}

Rules you must follow:
- Be accurate. Do not invent facts, statistics, quotes, people, organisations, dates, or events. If you are not certain something is true, leave it out or speak in general terms.
- You do not have access to today's news. Do not report on "breaking" or very recent events. Write explainers, guides, background pieces, analysis and evergreen features on the topic instead.
- Do not claim to be a witness, to have interviewed anyone, or to quote anyone.
- Structure the story with short paragraphs and a few "##" subheadings. Plain Markdown only (no HTML, no top-level "#" heading, no images).
- Aim for roughly ${s.wordCount} words.
- Choose the single best category from this list: ${cats.join(', ')}.
- The "dek" is a one or two sentence standfirst (under 220 characters). Give 3 to 6 short, lower-case tags.`;

const SCHEMA = (cats) => ({
  type: 'object',
  properties: { title: { type: 'string' }, dek: { type: 'string' }, category: { type: 'string', enum: cats }, tags: { type: 'array', items: { type: 'string' } }, content: { type: 'string' } },
  required: ['title', 'dek', 'category', 'tags', 'content'], additionalProperties: false,
});

function parseArticle(text, cats) {
  let j; try { j = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('The model did not return an article.'); j = JSON.parse(m[0]); }
  const title = String(j.title || '').replace(/^#+\s*/, '').trim().slice(0, 280);
  let content = String(j.content || '').trim().replace(/^#\s+.*\n+/, '');                 // drop a repeated headline
  if (!title || content.length < 300) throw new Error('The article that came back was too short.');
  return { title, dek: String(j.dek || '').slice(0, 400), category: cats.includes(j.category) ? j.category : cats[0], tags: (Array.isArray(j.tags) ? j.tags : []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 6), content };
}

async function callClaude(client, s, topic, recentTitles, cats) {
  const base = {
    model: s.model, max_tokens: 8000, output_config: { effort: s.effort }, system: SYSTEM(s, cats),
    messages: [{ role: 'user', content: `Topic: ${topic.topic}${topic.notes ? `\nEditor's notes: ${topic.notes}` : ''}${topic.category ? `\nPreferred category: ${topic.category}` : ''}\n\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\nTitles we already published recently (do not repeat these angles):\n${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join('\n') : '(none yet)'}\n\nWrite the article now.` }],
  };
  const withFormat = (b) => ({ ...b, output_config: { ...b.output_config, format: { type: 'json_schema', schema: SCHEMA(cats) } } });
  const useFallback = MODELS.find((m) => m.id === s.model)?.fallbacks;
  const attempts = [
    ...(useFallback ? [() => client.beta.messages.create({ ...withFormat(base), betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })] : []),
    () => client.messages.create(withFormat(base)),
    () => client.messages.create({ ...base, system: `${base.system}\n\nReturn ONLY a JSON object with the keys title, dek, category, tags, content.` }),
  ];
  let last;
  for (const attempt of attempts) {
    try { return await attempt(); }
    catch (e) { last = e; if (!(e instanceof Anthropic.BadRequestError)) throw e; }                  // only a 400 (feature not accepted) moves on to the simpler request
  }
  throw last;
}

let running = false;
/** Write one article now. Returns { ok, title, articleId } or throws. */
export async function generateOne({ source = 'auto', topicId } = {}) {
  if (running) throw new Error('A post is already being written. Try again in a minute.');
  running = true;
  const s = await loadSettings(); const t0 = new Date().toISOString();
  let topic;
  try {
    const key = await getApiKey(); if (!key) throw new Error('Add your Anthropic API key first.');
    const log = await recentLog();
    const pool = s.topics.filter((t) => t.enabled);
    if (!pool.length) throw new Error('Add at least one topic first.');
    topic = pool.find((t) => t.id === topicId) || pool.slice().sort((a, b) => (log.find((r) => r.topic === a.topic)?.created_at || '').localeCompare(log.find((r) => r.topic === b.topic)?.created_at || ''))[0];   // least recently used
    const cats = await categories();
    const recent = (await all('SELECT title FROM m1313_articles ORDER BY created_at DESC LIMIT 40')).map((r) => r.title);
    const client = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 4 * 60e3 });
    const res = await callClaude(client, s, topic, recent, cats);
    if (res.stop_reason === 'refusal') throw new Error('Claude declined to write this topic. Try rewording it.');
    if (res.stop_reason === 'max_tokens') throw new Error('The article ran too long and was cut off. Lower the word count.');
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const a = parseArticle(text, cats);
    const status = s.mode === 'publish' ? 'published' : 'draft';
    const id = await adminSave({ title: a.title, dek: a.dek, category: topic.category && cats.includes(topic.category) ? topic.category : a.category, tags: [...new Set([...a.tags, 'ai-generated'])], content: a.content, status, author: s.author });
    await run('INSERT INTO m1313_autoblog_log (id, created_at, source, topic, status, title, article_id, message, model, input_tokens, output_tokens) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(), t0, source, topic.topic, 'ok', a.title, id, status === 'published' ? 'Published' : 'Saved as a draft for review', res.model || s.model, res.usage?.input_tokens ?? null, res.usage?.output_tokens ?? null]);
    return { ok: true, title: a.title, articleId: id, status };
  } catch (e) {
    const msg = friendly(e);
    await run('INSERT INTO m1313_autoblog_log (id, created_at, source, topic, status, title, article_id, message, model, input_tokens, output_tokens) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(), t0, source, topic?.topic ?? null, 'error', null, null, msg.slice(0, 900), s.model, null, null]).catch(() => {});
    throw Object.assign(new Error(msg), { logged: true });
  } finally { running = false; }
}

function friendly(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'The Anthropic API key was rejected. Check that it is correct and active.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use that model.';
  if (e instanceof Anthropic.RateLimitError) return 'Anthropic rate limit or credit limit reached. Check your plan and balance.';
  if (e instanceof Anthropic.NotFoundError) return 'That model is not available to this API key.';
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach the Anthropic API from the server.';
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status}: ${e.message}`.slice(0, 600);
  return e.message || 'Unknown error';
}

/** Called by the timer and by the cron URL. Writes at most one post, and only if one is due. */
export async function tick() {
  const s = await loadSettings();
  if (!s.enabled) return { skipped: 'disabled' };
  if (!(await getApiKey())) return { skipped: 'no api key' };
  const log = await recentLog();
  const sc = schedule(s, log);
  if (!sc.dueNow) return { skipped: 'nothing due', ...sc };
  const lastTry = log.find((r) => r.source === 'auto');
  if (lastTry && lastTry.status === 'error' && Date.now() - new Date(lastTry.created_at) < 30 * 60e3) return { skipped: 'backing off after an error' };   // don't hammer a failing API
  if (lastTry && Date.now() - new Date(lastTry.created_at) < 4 * 60e3) return { skipped: 'too soon' };
  try { return await generateOne({ source: 'auto' }); } catch (e) { return { error: e.message }; }
}

let timer;
export function startAutoblog() {
  if (timer) return;
  timer = setInterval(() => { tick().catch((e) => console.error('[autoblog]', e.message)); }, 5 * 60e3);
  timer.unref?.();
  setTimeout(() => tick().catch(() => {}), 45e3).unref?.();
}

export async function status() {
  const s = await loadSettings(); const log = await recentLog(40); const key = await getApiKey();
  return { settings: s, schedule: schedule(s, log), key: { set: !!key, hint: keyHint(key), source: process.env.ANTHROPIC_API_KEY ? 'server' : key ? 'saved' : 'none' }, log, categories: await categories(), models: MODELS };
}
