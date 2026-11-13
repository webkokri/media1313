// Radio / TV / podcast shows and videos, managed from the admin (Shows, Videos). Replaces the old SHOWS / VIDEOS content lists.
import { all, one, run, uuid, now, setContent, getSetting, setSetting } from './db.js';

const TYPES = ['TV', 'RADIO', 'PODCAST'];
const t = (v, n) => String(v ?? '').trim().slice(0, n);
const val = async (key) => { const r = await one('SELECT content_value FROM m1313_content WHERE content_key = ?', [key]); try { return r ? JSON.parse(r.content_value) : null; } catch { return null; } };
const url = (v) => { const s = t(v, 700); return /^(https?:\/\/|\/)/i.test(s) ? s : ''; };

export const showOut = (r) => ({ id: r.id, title: r.title, type: r.type, genre: r.genre || '', host: r.host || '', description: r.description || '', when: r.schedule_text || '', image: r.image || null, bg: r.color || '#2A3550', active: !!r.active, order: r.sort_order });
export const videoOut = (r) => ({ id: r.id, title: r.title, show: r.show_title || '', url: r.url || '', poster: r.poster || null, dur: r.duration || '', active: !!r.active, order: r.sort_order });

export async function listShows({ all: everything = false } = {}) {
  return (await all(`SELECT * FROM m1313_shows ${everything ? '' : 'WHERE active = 1'} ORDER BY sort_order, created_at`)).map(showOut);
}
export async function listVideos({ all: everything = false } = {}) {
  return (await all(`SELECT * FROM m1313_videos ${everything ? '' : 'WHERE active = 1'} ORDER BY sort_order, created_at DESC`)).map(videoOut);
}

export async function saveShow(id, b) {
  const title = t(b.title, 200); if (!title) throw Object.assign(new Error('Give the show a title.'), { status: 400 });
  const type = TYPES.includes(String(b.type).toUpperCase()) ? String(b.type).toUpperCase() : 'TV';
  const f = [title, type, t(b.genre, 120), t(b.host, 200), t(b.description, 2000), t(b.when, 200), url(b.image) || null, /^#[0-9a-f]{3,8}$/i.test(b.bg || '') ? b.bg : null, b.active === false ? 0 : 1];
  if (id) {
    await run('UPDATE m1313_shows SET title=?, type=?, genre=?, host=?, description=?, schedule_text=?, image=?, color=?, active=?, updated_at=? WHERE id=?', [...f, now(), id]); return id;
  }
  const nid = uuid(); const max = (await one('SELECT MAX(sort_order) AS m FROM m1313_shows'))?.m ?? 0;
  await run('INSERT INTO m1313_shows (id, title, type, genre, host, description, schedule_text, image, color, active, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [nid, ...f, Number(max) + 1, now(), now()]); return nid;
}
export async function saveVideo(id, b) {
  const title = t(b.title, 300); if (!title) throw Object.assign(new Error('Give the video a title.'), { status: 400 });
  const u = url(b.url); if (b.url && !u) throw Object.assign(new Error('The video link must start with https:// (HLS .m3u8, MP4 or YouTube).'), { status: 400 });
  const f = [title, t(b.show, 200), u, url(b.poster) || null, t(b.dur, 20), b.active === false ? 0 : 1];
  if (id) { await run('UPDATE m1313_videos SET title=?, show_title=?, url=?, poster=?, duration=?, active=?, updated_at=? WHERE id=?', [...f, now(), id]); return id; }
  const nid = uuid(); const min = (await one('SELECT MIN(sort_order) AS m FROM m1313_videos'))?.m ?? 1;
  await run('INSERT INTO m1313_videos (id, title, show_title, url, poster, duration, active, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [nid, ...f, Number(min) - 1, now(), now()]); return nid;   // newest first
}
export const delRow = (table, id) => run(`DELETE FROM ${table === 'videos' ? 'm1313_videos' : 'm1313_shows'} WHERE id = ?`, [id]);
export async function reorder(table, ids) {
  const tb = table === 'videos' ? 'm1313_videos' : 'm1313_shows';
  for (let i = 0; i < ids.length; i++) await run(`UPDATE ${tb} SET sort_order = ? WHERE id = ?`, [i, String(ids[i])]);
}

/** One-time import of the old SHOWS / VIDEOS lists (so nothing disappears when this feature is switched on) + other one-off data fixes. */
export async function runMigrations() {
  if (!(await one('SELECT id FROM m1313_shows LIMIT 1')) && !(await getSetting('shows_imported', false))) {
    const old = await val('SHOWS'); const list = Array.isArray(old) ? old : [];
    let i = 0; for (const s of list) await run('INSERT INTO m1313_shows (id, title, type, genre, schedule_text, color, sort_order, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [uuid(), t(s.title, 200), TYPES.includes(s.type) ? s.type : 'TV', t(s.genre, 120), t(s.when, 200), /^#[0-9a-f]{3,8}$/i.test(s.bg || '') ? s.bg : null, i++, 1, now(), now()]);
    await setSetting('shows_imported', true);
  }
  if (!(await one('SELECT id FROM m1313_videos LIMIT 1')) && !(await getSetting('videos_imported', false))) {
    const old = await val('VIDEOS'); const list = Array.isArray(old) ? old : [];
    let i = 0; for (const v of list) await run('INSERT INTO m1313_videos (id, title, show_title, duration, sort_order, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)', [uuid(), t(v.title, 300), t(v.show, 200), t(v.dur, 20), i++, 1, now(), now()]);
    await setSetting('videos_imported', true);
  }
  if (!(await getSetting('migr_player_autoplay', false))) {          // the home-page video now starts by itself (muted until tapped); admins can still switch it off
    const p = await val('PLAYER'); if (p && typeof p === 'object') await setContent('PLAYER', { ...p, autoplay: true });
    await setSetting('migr_player_autoplay', true);
  }
}
