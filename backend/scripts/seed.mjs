// Creates all tables and loads starter content + sample articles. Safe to re-run (never overwrites existing data).
//   npm run seed
import fs from 'node:fs';
import { one, run, uuid, now, ensureSchema, setContent, dialect } from '../lib/db.js';
import { slugify } from '../lib/http.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../seed/${f}`, import.meta.url), 'utf8'));
await ensureSchema();

for (const [key, value] of Object.entries(read('content.json'))) {
  if (!(await one('SELECT content_key FROM m1313_content WHERE content_key = ?', [key]))) await setContent(key, value);
}

let added = 0;
if (Number((await one('SELECT COUNT(*) AS n FROM m1313_articles')).n) === 0) {
  const base = Date.now();
  for (const [i, a] of read('articles.json').entries()) {
    const at = new Date(base - i * 3600e3).toISOString();
    await run('INSERT INTO m1313_articles (id, slug, title, dek, category, tags, content, hero_image, status, author, published_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(), slugify(a.title), a.title, a.dek, a.cat, JSON.stringify(a.tags || []), a.content, null, 'published', '1313 Newsroom', at, at, at]);
    added++;
  }
}
console.log(`Seed complete (${dialect()}): ${added} articles added.`);
process.exit(0);
