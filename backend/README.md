# MEDIA 1313 — Backend (StudioCMS + Node.js)

[StudioCMS](https://studiocms.dev) (Astro, Node adapter) plus a small JSON API the React site calls.

| What | Where it lives |
|---|---|
| **News articles** | StudioCMS pages — edit in the dashboard (`/dashboard`), categories & tags included |
| **Shows, schedule, podcasts, nav, sports, on-air info** | table `m1313_content` (JSON blocks), served at `GET /api/content` |
| **Newsletter, contact form, song requests, member accounts, podcast follows** | tables `m1313_*` |

Requires **Node ≥ 22.23.4** (a StudioCMS/Astro 7 requirement).

## Local development

```bash
cd backend
npm install
cp .env.example .env            # then fill CMS_ENCRYPTION_KEY (openssl rand -base64 16) and ADMIN_TOKEN
npm run migrate                 # creates the StudioCMS tables
npm run seed                    # creates the m1313_* tables + starter content + 28 sample articles
npm run dev                     # http://localhost:4321
```

1. Open <http://localhost:4321/start> and complete the wizard — this creates **your owner account**.
2. Set `CMS_FIRST_RUN=false` in `.env`, then use <http://localhost:4321/dashboard> to write articles.
3. In another terminal, from the project root, run the React site: `npm run dev` (Vite proxies `/api` to port 4321).

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/home` | lead story, secondary stories, latest, per-category sections |
| GET | `/api/articles?category=&limit=&exclude=` | article list (+ category names) |
| GET | `/api/articles/:slug` | full article + related |
| GET | `/api/content` · `/api/content/:key` | site content blocks |
| PUT | `/api/content/:key` | replace a block (`Authorization: Bearer $ADMIN_TOKEN`) |
| POST | `/api/newsletter` · `/api/contact` · `/api/song-requests` | forms |
| POST | `/api/auth/register` · `/api/auth/login`, GET `/api/auth/me` | member accounts (signed token) |
| GET/POST | `/api/podcasts-follow` | follow podcasts (signed-in members) |

Editing a content block, e.g. the live-radio stream URL:

```bash
curl -X PUT https://YOUR-API/api/content/SITE \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"breaking":"…","radioStreamUrl":"https://stream.example.com/live","fm":"FM 98.1"}'
```

Form submissions (newsletter, contact messages, song requests, members) are stored in the database; read them with any SQL client / phpMyAdmin.

## Deploying to Hostinger Cloud + migrating to MySQL

1. **Create a MySQL database** in hPanel → Databases; note host, name, user, password.
2. **Node.js app**: hPanel → Websites → Add Website → *Node.js Apps*, choose Node **22.x (22.23.4 or newer)**. Upload/clone `backend/`, set the start command to `npm start`, build with `npm run build`.
3. **Environment variables** (hPanel, or `.env`):
   ```
   DB_DIALECT=mysql
   CMS_MYSQL_HOST=…  CMS_MYSQL_PORT=3306  CMS_MYSQL_DATABASE=…  CMS_MYSQL_USER=…  CMS_MYSQL_PASSWORD=…
   CMS_ENCRYPTION_KEY=…   ADMIN_TOKEN=…
   CORS_ORIGIN=https://your-site.com
   SITE_URL=https://cms.your-site.com
   CMS_FIRST_RUN=true      # for the first run only
   ```
4. Create the schema and content in MySQL: `npm run migrate && npm run seed`.
5. Visit `/start` once to create the owner account, then set `CMS_FIRST_RUN=false` and **rebuild** (`npm run build` refuses to build with the setup page on).
6. Build the React site with `VITE_API_URL=https://cms.your-site.com/api npm run build` and upload `dist/` (configure SPA fallback to `index.html`). Or serve both from one domain and proxy `/api` to the Node app.

**Moving existing local data** (articles you already wrote in SQLite): the easiest route is to re-create them in the MySQL-backed dashboard. For a bulk copy, export the StudioCMS tables and `m1313_*` tables from `data/media1313.db` (`sqlite3 data/media1313.db .dump`, data rows only) and import them into MySQL after step 4.

### MySQL compatibility patches (important)

StudioCMS 0.7.0 does not work on MySQL/MariaDB out of the box, so this project ships two small
[patch-package](https://github.com/ds300/patch-package) patches in `backend/patches/`. They are applied automatically by
`npm install` (`postinstall`) — **do not delete the `patches/` folder or skip `npm install` on the server.**

| Patch | Problem it fixes |
|---|---|
| `@withstudiocms/kysely` | `text` primary/foreign-key columns are rejected by MySQL (error 1170) → become `varchar(255)`; integer primary keys get `AUTO_INCREMENT` |
| `@withstudiocms/sdk` | `WHERE id IN ()` (pages with no tags/categories) is a syntax error on MySQL |

Tested against Hostinger's MariaDB 11.8: migrate, seed, article/home/content API, forms and member sign-up all work.
**Not yet tested on MySQL:** creating and editing articles from the StudioCMS dashboard (needs an owner account).
Re-check these patches when upgrading `studiocms`; they may no longer be needed.
