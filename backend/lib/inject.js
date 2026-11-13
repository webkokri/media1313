// Header / footer code injection (analytics, pixels, verification tags, chat widgets…). Stored as one setting; applied to every public page.
import { getSetting, setSetting } from './db.js';

const MAX = 100_000;
const clip = (v) => String(v ?? '').replace(/\r\n/g, '\n').slice(0, MAX);
export const DEFAULT_CODE = { enabled: true, head: '', bodyStart: '', footer: '', updatedAt: 0 };

export async function getCode() { return { ...DEFAULT_CODE, ...(await getSetting('code_injection', {})) }; }
export async function saveCode(input) {
  const cur = await getCode();
  const next = { enabled: input.enabled !== false, head: clip(input.head ?? cur.head), bodyStart: clip(input.bodyStart ?? cur.bodyStart), footer: clip(input.footer ?? cur.footer), updatedAt: Date.now() };
  await setSetting('code_injection', next); return next;
}
/** What the public site needs (nothing when switched off). */
export async function publicCode() {
  const c = await getCode();
  return c.enabled ? { enabled: true, head: c.head, bodyStart: c.bodyStart, footer: c.footer, version: c.updatedAt } : { enabled: false, head: '', bodyStart: '', footer: '', version: c.updatedAt };
}
/** Write the snippets into a server-rendered HTML page. A marker tells the browser it does not need to add them again. */
export async function injectCode(html) {
  const c = await publicCode(); if (!c.enabled || !(c.head || c.bodyStart || c.footer)) return html;
  let out = html.replace('</head>', () => `    <meta name="m1313-code" content="${c.version}" />\n${c.head ? `    <!-- header code -->\n${c.head}\n` : ''}  </head>`);
  if (c.bodyStart) out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${c.bodyStart}\n`);
  if (c.footer) out = out.replace('</body>', () => `${c.footer}\n</body>`);
  return out;
}
