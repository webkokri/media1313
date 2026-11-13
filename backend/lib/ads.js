// AdSense ad slots placed by the site itself (works across page changes in the single-page app).
import { getSetting, setSetting } from './db.js';

export const DEFAULT_ADS = { enabled: false, client: '', top: '', article: '', bottom: '' };
export const getAds = async () => ({ ...DEFAULT_ADS, ...(await getSetting('ads', {})) });
export async function saveAds(b) {
  const client = String(b.client || '').trim(); const slot = (v) => String(v || '').trim();
  if (client && !/^ca-pub-\d{10,20}$/.test(client)) throw Object.assign(new Error('The publisher ID looks like ca-pub-1234567890123456.'), { status: 400 });
  const out = { enabled: !!b.enabled, client, top: slot(b.top), article: slot(b.article), bottom: slot(b.bottom) };
  for (const k of ['top', 'article', 'bottom']) if (out[k] && !/^\d{6,20}$/.test(out[k])) throw Object.assign(new Error('Ad slot IDs are numbers (for example 1234567890) — copy the data-ad-slot value from the AdSense code.'), { status: 400 });
  await setSetting('ads', out); return out;
}
