// Client for /api/admin/* (cookie session + CSRF header).
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '') + '/admin';

async function call(path, { method = 'GET', body, raw, headers = {} } = {}) {
  const h = { 'X-Requested-With': 'm1313', ...headers };
  let payload;
  if (raw !== undefined) payload = raw;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(BASE + path, { method, headers: h, body: payload, credentials: 'same-origin' }); }
  catch { throw new Error('Cannot reach the server. Check your connection and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/login')) window.dispatchEvent(new Event('m1313:signed-out'));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const adminApi = {
  get: (p) => call(p),
  post: (p, body) => call(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) => call(p, { method: 'PUT', body: body ?? {} }),
  del: (p) => call(p, { method: 'DELETE' }),
  upload: (file) => call(`/media?filename=${encodeURIComponent(file.name)}`, { method: 'POST', raw: file, headers: { 'Content-Type': 'application/octet-stream' } }),
};

// Friendly names for the site's content blocks (anything not listed appears under "Other").
export const BLOCKS = {
  SITE: { label: 'Banner & radio stream', group: 'Site', page: '/', desc: 'Breaking-news ticker, radio stream URL, FM label.' },
  FM: { label: 'Radio frequency', group: 'Site', page: '/radio', desc: 'The FM label shown across the site.' },
  NAV: { label: 'Header menu', group: 'Site', page: '/', desc: 'Links in the main navigation.' },
  FOOTER_COLS: { label: 'Footer links', group: 'Site', page: '/', desc: 'The four link columns in the footer.' },
  NEWS_CATEGORIES: { label: 'News categories', group: 'Site', page: '/news', desc: 'Category tabs on the News page and choices in the article editor.' },
  CONTACT_TOPICS: { label: 'Contact form topics', group: 'Site', page: '/about', desc: 'Options in the contact form’s Topic menu.' },
  NOW_ON_TV: { label: 'On now — TV', group: 'On air', page: '/', desc: 'The show highlighted as live on 1313 TV.' },
  TV_UP_NEXT: { label: 'TV up next', group: 'On air', page: '/', desc: 'The “On now” list on the home page.' },
  NOW_ON_RADIO: { label: 'On now — Radio', group: 'On air', page: '/radio', desc: 'The show highlighted as live on 1313 Radio.' },
  RADIO_UP_NEXT: { label: 'Radio up next', group: 'On air', page: '/', desc: 'Upcoming radio shows.' },
  RADIO_HOSTS: { label: 'Radio hosts & time slots', group: 'On air', page: '/radio', desc: 'Show blocks on the Radio page.' },
  LIVE_UPDATES: { label: 'Live updates', group: 'On air', page: '/live', desc: 'Short updates on the Live page.' },
  SCHEDULE: { label: 'Weekly schedule', group: 'Programming', page: '/schedule', desc: 'TV and radio line-ups for weekdays and weekends.' },
  SHOWS: { label: 'All shows', group: 'Programming', page: '/shows', desc: 'Every TV, radio and podcast program.' },
  TV_ROWS: { label: 'TV page rows', group: 'Programming', page: '/tv', desc: 'Shelves of shows on the TV page.' },
  VIDEOS: { label: 'Video carousel', group: 'Programming', page: '/', desc: 'Video cards on the home page.' },
  PODCASTS: { label: 'Podcasts', group: 'Programming', page: '/podcasts', desc: 'Podcast shows.' },
  EPISODES: { label: 'Podcast episodes', group: 'Programming', page: '/podcasts', desc: 'Latest episodes list.' },
  SPORTS: { label: 'Sports page', group: 'Sports', page: '/sports', desc: 'Scores strip, standings, lead story and clips.' },
};
export const GROUPS = ['Site', 'On air', 'Programming', 'Sports', 'Other'];
export const blockInfo = (k) => BLOCKS[k] || { label: k.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), group: 'Other', page: '/', desc: '' };

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24); return d < 30 ? `${d} day${d > 1 ? 's' : ''} ago` : fmtDate(iso);
};
