# MEDIA 1313 — React website

TV, Radio and News portal built with React 18, Vite and React Router.

## Run it

Start the backend first (see [backend/README.md](backend/README.md)), then:

```bash
npm install
npm run dev      # http://localhost:5173  (proxies /api to the backend on :4321)
VITE_API_URL=https://cms.example.com/api npm run build   # production files in /dist
```

## Pages (routes)

| Route | Page |
|---|---|
| `/` | Homepage |
| `/live` | Live TV & Radio player |
| `/news` | News index (category filter) |
| `/news/:slug` | Article (from StudioCMS) |
| `/sports` | Sports |
| `/schedule` | Weekly TV & radio schedule |
| `/tv` | TV hub |
| `/radio` | Radio hub |
| `/shows` | All shows (filter + search) |
| `/podcasts` | Podcasts |
| `/about` | About, Contact (`#contact`), Advertise, Careers |
| `/signin` | Sign in / Create account |
| `/admin` | **Studio** — admin, article editor, media library, visual live editor |

## Where things live

- `src/styles.css` — colours, fonts and all shared styles (edit the `:root` variables to re-brand)
- `src/api.jsx` / `src/content.jsx` — API client and site-wide content provider (all content comes from the backend)
- `src/data.js` — only non-content helpers; content now lives in the backend (`backend/seed/content.json`)
- `src/admin/` — the admin (loaded only at `/admin`)
- `backend/` — Node.js API + admin API (SQLite dev / MySQL prod), see [backend/README.md](backend/README.md)
- `src/components/` — `Header`, `Footer`, and shared UI (icons, tabs, players, placeholders) in `ui.jsx`
- `src/pages/` — one file per page

## To finish before launch

- Replace anything in `[brackets]` (FM frequency, host names, phone numbers, addresses, times).
- Grey boxes (`<Placeholder />`) are image slots — swap for `<img>` tags.
- Radio stream URL: set `radioStreamUrl` in the backend `SITE` content block.
- Video player (`Live.jsx`): drop in your HLS / `<video>` player where marked.
- Forms (newsletter, contact, song request, sign in/up) are connected to the backend. "Forgot password" and "one-time email link" are not built yet (they need an email service).
- When hosting, configure the server to send all routes to `index.html` (single-page app).
# media1313
