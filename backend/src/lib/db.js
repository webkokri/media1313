// Portable DB layer for MEDIA 1313's own tables (content, forms, members).
// Works on libSQL/SQLite (dev) and MySQL (Hostinger). Switch with DB_DIALECT=mysql.
// All SQL here is deliberately plain ANSI with `?` placeholders so it runs on both.
import { randomUUID } from 'node:crypto';

const env = (k, d) => process.env[k] ?? import.meta.env?.[k] ?? d;
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

// Portable upsert: UPDATE, then INSERT if the row did not exist.
export async function upsertContent(key, value) {
  const json = JSON.stringify(value);
  const existing = await one('SELECT content_key FROM m1313_content WHERE content_key = ?', [key]);
  if (existing) await run('UPDATE m1313_content SET content_value = ?, updated_at = ? WHERE content_key = ?', [json, now(), key]);
  else await run('INSERT INTO m1313_content (content_key, content_value, updated_at) VALUES (?, ?, ?)', [key, json, now()]);
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS m1313_content (
     content_key VARCHAR(100) NOT NULL PRIMARY KEY,
     content_value LONGTEXT NOT NULL,
     updated_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_newsletter (
     id VARCHAR(36) NOT NULL PRIMARY KEY,
     email VARCHAR(255) NOT NULL UNIQUE,
     source VARCHAR(60) NOT NULL,
     created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_contact_messages (
     id VARCHAR(36) NOT NULL PRIMARY KEY,
     name VARCHAR(200) NOT NULL,
     email VARCHAR(255) NOT NULL,
     topic VARCHAR(100) NOT NULL,
     message TEXT NOT NULL,
     created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_song_requests (
     id VARCHAR(36) NOT NULL PRIMARY KEY,
     request_text VARCHAR(500) NOT NULL,
     created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_members (
     id VARCHAR(36) NOT NULL PRIMARY KEY,
     name VARCHAR(200) NOT NULL,
     email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     wants_briefing INT NOT NULL DEFAULT 0,
     created_at VARCHAR(40) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS m1313_podcast_follows (
     id VARCHAR(36) NOT NULL PRIMARY KEY,
     member_id VARCHAR(36) NOT NULL,
     podcast VARCHAR(200) NOT NULL,
     created_at VARCHAR(40) NOT NULL)`,
];

export async function ensureSchema() {
  for (const sql of SCHEMA) await run(sql);
}
