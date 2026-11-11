# MEDIA 1313 — Backend (plain Node.js)

One small Node process serves the JSON API, the admin API, uploaded images and the React site.
No framework and no build step. **SQLite** for development, **MySQL/MariaDB** in production (same code, switch with `DB_DIALECT`).

| What | Where |
|---|---|
| News articles | table `m1313_articles` — edited in the admin (`/admin/articles`) |
| Builder pages (sections → columns → widgets) | table `m1313_pages` — edited in `/admin/pages` |
| Menus, schedule, shows, podcasts, sports, on-air info, **Live TV player (HLS link)** | table `m1313_content` (JSON blocks with **draft / publish**) — edited in the admin or the visual live editor |
| Uploaded images | `UPLOAD_DIR` (outside git and the web root), served at `/uploads/…`; listed in `m1313_media` |
| Contact messages, newsletter, song requests, members, podcast follows | `m1313_*` tables — read in the admin |
| Admin users + activity log | `m1313_admins`, `m1313_activity` |

Requires Node ≥ 20.

## Local development

```bash
cd backend
npm install
cp .env.example .env        # set APP_SECRET (openssl rand -base64 32)
npm run seed                # creates all tables, starter content and 28 sample articles
ADMIN_EMAIL=you@example.com ADMIN_NAME="You" ADMIN_PASSWORD='a-long-password' npm run create-admin
npm run dev                 # API on http://localhost:4321
```

Then, from the project root, `npm run dev` for the React site (Vite proxies `/api` and `/uploads` to port 4321).
The admin lives at **/admin**. To run everything from the backend alone, build the site (`npm run build` in the root) — the server serves `../dist`.

## The admin ("Studio")

- **Dashboard** – counts, recent enquiries, activity.
- **Live editor** (`/admin/live-edit`) – the real site in a preview frame. Click any outlined area, edit it in the side panel, see it change instantly. Device sizes, undo/redo, *Save draft*, *Publish*.
- **Pages** – the visual **page builder** (`/admin/pages`): drag widgets onto sections and columns, edit text right on the page, per-device settings, navigator, undo/redo, draft/publish. Pages are stored in `m1313_pages`; a published page replaces the built-in page at the same address (`home` = the homepage).
- **AI blog** (`/admin/autoblog`, administrators) – Claude writes articles on a schedule: on/off switch, **posts per day**, posting window + time zone, **topics** you choose (rotated, no repeats), model/effort/length/tone, save-as-draft or publish, "write one now", activity log. Works with **Google Gemini** (default) or **Anthropic Claude** — pick the provider in the page. Needs that provider's API key, pasted in the admin (or `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` in the env file).
- **Articles** – write in Markdown with a toolbar and preview, cover image, category, tags, draft/publish.
- **Site content** – every content block as a form (add/remove/reorder rows), with draft/publish.
- **Media**, **Enquiries**, **Subscribers** (CSV export), **Song requests**, **Members**, **Activity**, **Users** (administrators only), **Account** (change password).

Security: passwords are scrypt-hashed; the session is an HttpOnly, SameSite cookie; changing a password signs out other sessions; all admin writes need an `X-Requested-With` header (CSRF); login is rate-limited per IP; uploads are checked by file signature (JPG/PNG/WebP/GIF/PDF only, 10 MB).

## Public API v1 (for mobile apps and other websites)

Base address `https://YOUR-SITE/api/v1` · interactive docs **`/api/docs`** · OpenAPI 3 spec `/api/v1/openapi.json` (import into Postman or generate an app client).
Code: `routes/v1.js` (every endpoint is declared once there; the router, the spec and the docs are all built from that list), `lib/apiGate.js` (keys, CORS, rate limits), `lib/apiDocs.js`.

- **Responses**: `{ "data": …, "meta": {page, per_page, total, total_pages}, "links": {self, next, prev} }`; errors `{ "error": { "code", "message" } }`.
- **News**: `/home`, `/articles` (filters: `category`, `tag`, `q`, `updated_since`, `sort`, `content=html|markdown`, pagination), `/articles/{slug}`, `/categories`, `/tags`, `/search`.
- **Live**: `/live` (TV HLS URL, radio stream URL, now/next, breaking banner), `/schedule`, `/shows`, `/podcasts`, `/episodes`, `/videos`, `/sports`.
- **Site**: `/site` (menu/footer/categories), `/pages`, `/pages/{slug}`.
- **Forms** (POST): `/newsletter`, `/contact`, `/song-requests`.
- **Accounts**: `/auth/register|login|refresh`, `/me`, `DELETE /me` (App Store / Play requirement), `/me/bookmarks`, `/me/follows`. Token: `Authorization: Bearer …` (30 days).
- **Controls** (Admin → Public API): turn the API on/off, require API keys (`X-API-Key` header or `?api_key=`), create/revoke keys with usage counters, allowed websites (CORS), requests/minute (writes capped at 20/min).
- **Efficiency**: `ETag` + `If-None-Match` → `304`, `Cache-Control`, `updated_since` for incremental sync, `X-RateLimit-*` headers.

The older unversioned `/api/…` routes below are used by the website itself and may change; apps should use `/api/v1`.

## API (used by the website)

`GET /api/pages/:slug` (published builder page) · `GET /api/home` · `GET /api/articles?category=&limit=&exclude=` · `GET /api/articles/:slug` · `GET /api/content` ·
`POST /api/newsletter` · `POST /api/contact` · `POST /api/song-requests` ·
`POST /api/auth/register|login`, `GET /api/auth/me` (site members) · `GET|POST /api/podcasts-follow`

## Production on Hostinger (what runs on media1313.com)

| Piece | Location on the server |
|---|---|
| React build (static) | `~/domains/media1313.com/public_html` — built from this repo by Hostinger on every push |
| Backend (this folder) | `~/media1313-app` — outside the web root, run by Passenger |
| Private settings | `~/media1313.env` (permissions 600, **never in git**) |
| Uploaded images | `~/media1313-uploads` |
| Passenger config | `public/.htaccess` (ships with the React build; contains no secrets) |

Files that exist in `public_html` are served directly; everything else (`/api/*`, `/uploads/*`, `/admin`, React routes) goes to `server.cjs`.

`~/media1313.env`:
```
DB_DIALECT=mysql
CMS_MYSQL_HOST=localhost  CMS_MYSQL_PORT=3306  CMS_MYSQL_DATABASE=…  CMS_MYSQL_USER=…  CMS_MYSQL_PASSWORD=…
APP_SECRET=…                      # signs login cookies
UPLOAD_DIR=/home/<user>/media1313-uploads
WEB_ROOT=/home/<user>/domains/media1313.com/public_html
```

Update the backend (no build needed):
```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
cd ~/media1313-app && set -a && . ~/media1313.env && set +a
npm install --omit=dev
node scripts/seed.mjs            # only if the schema changed — creates missing tables/columns
touch tmp/restart.txt            # restart
```
Passenger sets `HOME` to the domain folder, so `public/.htaccess` passes the env-file path explicitly (`SetEnv MEDIA1313_ENV …`). The host reports 48 CPUs; the `SetEnv … THREADS 2` lines in `.htaccess` stop native modules from over-allocating threads.

Add an admin: `ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… ADMIN_ROLE=admin node scripts/create-admin.mjs` (same command resets a password).


## AI blog — how it runs

- Settings are in `m1313_settings` (`autoblog`; the API key in `autoblog_key`), the activity log in `m1313_autoblog_log`. Code: `lib/autoblog.js`.
- The server checks every 5 minutes. N posts a day are spread evenly across the posting window (e.g. 4 posts, 07:00–22:00 → 07:00, 10:45, 14:30, 18:15); when it is late it catches up one post per check. A failed attempt backs off for 30 minutes.
- Because Passenger can put an idle Node process to sleep, also add a real cron job that calls the cron URL every 10 minutes — set `CRON_KEY` in the env file and run: `*/10 * * * * curl -s "https://YOUR-SITE/api/cron/autoblog?key=YOUR_CRON_KEY" >/dev/null`.
- Gemini articles use the Gemini REST API (`generateContent`, JSON response schema; the model list can be loaded from the key). Claude articles use the official `@anthropic-ai/sdk` (structured JSON output, server-side refusal fallback where the model supports it). The writer is told never to invent facts or quotes and to write explainers/guides, since it cannot see current news. Articles are tagged `ai-generated`.
