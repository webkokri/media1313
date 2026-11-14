// Portable DB layer. SQLite (libSQL file) for development, MySQL/MariaDB in production (DB_DIALECT=mysql).
// All SQL in this project is plain ANSI with `?` placeholders so it runs unchanged on both.
import { randomUUID } from 'node:crypto';

const env = (k, d) => process.env[k] ?? d;
export const dialect = () => env('DB_DIALECT', 'libsql');

let _conn;
async function connect() {
  if (_conn) return _conn;
  if (dialect() === 'mysql') {
    const mysql = await import('mysql2/promise');
    const pool = mysql.createPool({
      host: env('CMS_MYSQL_HOST', 'localhost'), port: Number(env('CMS_MYSQL_PORT', 3306)),
      user: env('CMS_MYSQL_USER'), password: env('CMS_MYSQL_PASSWORD'), database: env('CMS_MYSQL_DATABASE'),
      connectionLimit: 5, charset: 'utf8mb4',
    });
    _conn = {
      all: async (sql, args = []) => (await pool.query(sql, args))[0],
      run: async (sql, args = []) => { await pool.query(sql, args); },
    };
  } else {
    const { createClient } = await import('@libsql/client');
    const c = createClient({ url: env('CMS_LIBSQL_URL', 'file:./data/media1313.db'), authToken: env('CMS_LIBSQL_AUTH_TOKEN') });
    _conn = {
      all: async (sql, args = []) => (await c.execute({ sql, args })).rows.map((r) => ({ ...r })),
      run: async (sql, args = []) => { await c.execute({ sql, args }); },
    };
  }
  return _conn;
}

export const all = async (sql, args) => (await connect()).all(sql, args);
export const one = async (sql, args) => (await all(sql, args))[0] ?? null;
export const run = async (sql, args) => (await connect()).run(sql, args);
export const uuid = randomUUID;
export const now = () => new Date().toISOString();

// ---- content blocks (site data) with draft / publish ----
export async function getContent() {
  const rows = await all('SELECT content_key, content_value, draft_value, updated_at FROM m1313_content');
  return rows;
}
export async function setContent(key, value, { draft = false } = {}) {
  const json = JSON.stringify(value);
  const existing = await one('SELECT content_key FROM m1313_content WHERE content_key = ?', [key]);
  if (draft) {
    if (existing) await run('UPDATE m1313_content SET draft_value = ? WHERE content_key = ?', [json, key]);
    else await run('INSERT INTO m1313_content (content_key, content_value, draft_value, updated_at) VALUES (?, ?, ?, ?)', [key, 'null', json, now()]);
  } else if (existing) {
    await run('UPDATE m1313_content SET content_value = ?, draft_value = NULL, updated_at = ? WHERE content_key = ?', [json, now(), key]);
  } else {
    await run('INSERT INTO m1313_content (content_key, content_value, updated_at) VALUES (?, ?, ?)', [key, json, now()]);
  }
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS m1313_content (
     content_key VARCHAR(100) NOT NULL PRIMARY KEY,
     content_value LONGTEXT NOT NULL,
     updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_newsletter (
     id VARCHAR(36) NOT NULL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE,
     source VARCHAR(60) NOT NULL, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_contact_messages (
     id VARCHAR(36) NOT NULL PRIMARY KEY, name VARCHAR(200) NOT NULL, email VARCHAR(255) NOT NULL,
     topic VARCHAR(100) NOT NULL, message TEXT NOT NULL, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_shows (
     id VARCHAR(36) NOT NULL PRIMARY KEY, title VARCHAR(200) NOT NULL, type VARCHAR(12) NOT NULL DEFAULT 'TV',
     genre VARCHAR(120), host VARCHAR(200), description TEXT, schedule_text VARCHAR(200), image VARCHAR(500), color VARCHAR(20),
     sort_order INT NOT NULL DEFAULT 0, active INT NOT NULL DEFAULT 1, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_videos (
     id VARCHAR(36) NOT NULL PRIMARY KEY, title VARCHAR(300) NOT NULL, show_title VARCHAR(200), url VARCHAR(700), poster VARCHAR(500),
     duration VARCHAR(20), sort_order INT NOT NULL DEFAULT 0, active INT NOT NULL DEFAULT 1, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_push_subs (
     id VARCHAR(36) NOT NULL PRIMARY KEY, endpoint_hash VARCHAR(64) NOT NULL UNIQUE, endpoint TEXT NOT NULL, p256dh VARCHAR(255) NOT NULL, auth VARCHAR(120) NOT NULL,
     topics VARCHAR(300) NOT NULL, agent VARCHAR(200), created_at VARCHAR(40) NOT NULL, last_ok VARCHAR(40), fails INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS m1313_push_devices (
     id VARCHAR(36) NOT NULL PRIMARY KEY, token_hash VARCHAR(64) NOT NULL UNIQUE, token TEXT NOT NULL, platform VARCHAR(12) NOT NULL,
     topics VARCHAR(300) NOT NULL, created_at VARCHAR(40) NOT NULL, last_ok VARCHAR(40), fails INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS m1313_push_log (
     id VARCHAR(36) NOT NULL PRIMARY KEY, created_at VARCHAR(40) NOT NULL, source VARCHAR(30) NOT NULL, topic VARCHAR(30) NOT NULL,
     title VARCHAR(200) NOT NULL, body VARCHAR(500), url VARCHAR(500), sent INT NOT NULL DEFAULT 0, failed INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS m1313_song_requests (
     id VARCHAR(36) NOT NULL PRIMARY KEY, request_text VARCHAR(500) NOT NULL, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_members (
     id VARCHAR(36) NOT NULL PRIMARY KEY, name VARCHAR(200) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL, wants_briefing INT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_podcast_follows (
     id VARCHAR(36) NOT NULL PRIMARY KEY, member_id VARCHAR(36) NOT NULL,
     podcast VARCHAR(200) NOT NULL, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_admins (
     id VARCHAR(36) NOT NULL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL,
     password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'editor',
     created_at VARCHAR(40) NOT NULL, last_login VARCHAR(40))`,
  `CREATE TABLE IF NOT EXISTS m1313_articles (
     id VARCHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(190) NOT NULL UNIQUE, title VARCHAR(300) NOT NULL,
     dek TEXT, category VARCHAR(80) NOT NULL DEFAULT 'Local', tags TEXT, content LONGTEXT,
     hero_image VARCHAR(500), status VARCHAR(20) NOT NULL DEFAULT 'draft', author VARCHAR(200),
     published_at VARCHAR(40), created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_media (
     id VARCHAR(36) NOT NULL PRIMARY KEY, filename VARCHAR(255) NOT NULL, url VARCHAR(500) NOT NULL,
     mime VARCHAR(100) NOT NULL, size_bytes INT NOT NULL DEFAULT 0, alt VARCHAR(300), created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_pages (
     id VARCHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(120) NOT NULL UNIQUE, title VARCHAR(300) NOT NULL,
     status VARCHAR(20) NOT NULL DEFAULT 'draft', tree LONGTEXT, draft_tree LONGTEXT, settings TEXT,
     created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_api_keys (
     id VARCHAR(36) NOT NULL PRIMARY KEY, name VARCHAR(120) NOT NULL, key_hash VARCHAR(64) NOT NULL UNIQUE, key_prefix VARCHAR(16) NOT NULL,
     created_at VARCHAR(40) NOT NULL, last_used VARCHAR(40), requests INT NOT NULL DEFAULT 0, revoked INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS m1313_bookmarks (
     id VARCHAR(36) NOT NULL PRIMARY KEY, member_id VARCHAR(36) NOT NULL, article_id VARCHAR(36) NOT NULL, created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_settings (
     setting_key VARCHAR(100) NOT NULL PRIMARY KEY, setting_value LONGTEXT NOT NULL, updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_autoblog_log (
     id VARCHAR(36) NOT NULL PRIMARY KEY, created_at VARCHAR(40) NOT NULL, source VARCHAR(10) NOT NULL DEFAULT 'auto',
     topic VARCHAR(300), status VARCHAR(10) NOT NULL, title VARCHAR(300), article_id VARCHAR(36), message TEXT,
     model VARCHAR(60), input_tokens INT, output_tokens INT)`,
  `CREATE TABLE IF NOT EXISTS m1313_activity (
     id VARCHAR(36) NOT NULL PRIMARY KEY, admin_email VARCHAR(255) NOT NULL, action VARCHAR(60) NOT NULL,
     target VARCHAR(300), created_at VARCHAR(40) NOT NULL)`,
];
// Columns added after the first release. ALTER is attempted and "already exists" errors are ignored (works on SQLite and MySQL).
const ALTERS = [
  'ALTER TABLE m1313_content ADD COLUMN draft_value LONGTEXT',
  "ALTER TABLE m1313_contact_messages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'new'",
];

export async function ensureSchema() {
  for (const sql of SCHEMA) await run(sql);
  for (const sql of ALTERS) { try { await run(sql); } catch { /* column already exists */ } }
}

export async function logActivity(email, action, target = '') {
  try { await run('INSERT INTO m1313_activity (id, admin_email, action, target, created_at) VALUES (?, ?, ?, ?, ?)', [uuid(), email, action, String(target).slice(0, 300), now()]); } catch { /* never block on logging */ }
}

// ---- generic JSON settings (key → value) ----
export async function getSetting(key, fallback = null) {
  const r = await one('SELECT setting_value FROM m1313_settings WHERE setting_key = ?', [key]);
  if (!r) return fallback;
  try { return JSON.parse(r.setting_value); } catch { return fallback; }
}
export async function setSetting(key, value) {
  const json = JSON.stringify(value);
  if (await one('SELECT setting_key FROM m1313_settings WHERE setting_key = ?', [key])) await run('UPDATE m1313_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?', [json, now(), key]);
  else await run('INSERT INTO m1313_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)', [key, json, now()]);
}
export const delSetting = (key) => run('DELETE FROM m1313_settings WHERE setting_key = ?', [key]);
