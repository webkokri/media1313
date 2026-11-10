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

## Deploying to Hostinger (what is running on media1313.com)

One Passenger Node app serves everything on the domain:

| Piece | Location on the server |
|---|---|
| React build (static) | `~/domains/media1313.com/public_html` (deployed from this repo by Hostinger) |
| Backend app (this folder, built) | `~/media1313-app` — outside the web root |
| Private settings (DB password, keys) | `~/media1313.env`, permissions 600 — **never in git** |
| Passenger config | `public/.htaccess` (shipped in the React build) |

Request flow: files that exist in `public_html` are served directly; everything else (`/api/*`, `/dashboard`, and React routes like `/news`)
goes to `server.cjs` → `server.mjs`, which hands CMS/API routes to StudioCMS and falls back to the React `index.html`.

**Update the backend** (after `git pull` or uploading changed files into `~/media1313-app`):

```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
cd ~/media1313-app && set -a && . ~/media1313.env && set +a
export GOMAXPROCS=2 UV_THREADPOOL_SIZE=2 RAYON_NUM_THREADS=2 TOKIO_WORKER_THREADS=2   # the server reports 48 CPUs; without this the build aborts
npm install && npx astro build
touch tmp/restart.txt        # restart the app
```

Notes
- `~/media1313.env` keys: `DB_DIALECT=mysql`, `CMS_MYSQL_*`, `CMS_ENCRYPTION_KEY`, `ADMIN_TOKEN`, `CORS_ORIGIN`, `SITE_URL`, `WEB_ROOT`, `CMS_FIRST_RUN`.
- Passenger sets `HOME` to the domain folder, so `.htaccess` passes the env-file path explicitly (`SetEnv MEDIA1313_ENV ...`).
- `CMS_FIRST_RUN=true` turns the site into StudioCMS's setup wizard (it takes over `/`). Use it only to create the owner account, then set it back to `false` and rebuild.
- Build the React site for a separate API host with `VITE_API_URL=https://other-host/api npm run build`; on this setup the default `/api` is correct.

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
