// Firebase Cloud Messaging (HTTP v1) for the mobile apps. Talks to Google directly with the service-account key — no Firebase SDK needed.
// The key is pasted in Admin → Notifications (stored in the settings table) or provided on the server with FIREBASE_SERVICE_ACCOUNT_FILE.
import { createSign } from 'node:crypto';
import fs from 'node:fs';
import { getSetting, setSetting, delSetting } from './db.js';

const FCM = () => (process.env.FCM_BASE_URL || 'https://fcm.googleapis.com').replace(/\/$/, '');
let tokenCache = { key: '', value: '', exp: 0 };

function check(a) {
  if (!a || a.type !== 'service_account' || !a.project_id || !a.client_email || !/BEGIN PRIVATE KEY/.test(a.private_key || '')) throw Object.assign(new Error('That is not a Firebase service-account key. In Firebase: Project settings → Service accounts → Generate new private key, then paste the whole JSON file.'), { status: 400 });
  return { type: a.type, project_id: String(a.project_id), private_key_id: a.private_key_id || '', private_key: a.private_key, client_email: String(a.client_email), token_uri: a.token_uri || 'https://oauth2.googleapis.com/token' };
}
export async function getAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) { try { return check(JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8'))); } catch { /* fall through to the saved key */ } }
  const a = await getSetting('fcm_account', null); if (!a) return null;
  try { return check(a); } catch { return null; }
}
export async function saveAccount(json) {
  let a; try { a = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw Object.assign(new Error('That is not valid JSON. Paste the whole service-account file.'), { status: 400 }); }
  const acc = check(a); await setSetting('fcm_account', acc); tokenCache = { key: '', value: '', exp: 0 }; return info(acc);
}
export async function removeAccount() { await delSetting('fcm_account'); tokenCache = { key: '', value: '', exp: 0 }; }
export const info = (a) => (a ? { connected: true, projectId: a.project_id, clientEmail: a.client_email, keyId: String(a.private_key_id || '').slice(0, 6) } : { connected: false });
export async function status() { const a = await getAccount(); return { ...info(a), source: process.env.FIREBASE_SERVICE_ACCOUNT_FILE && a ? 'server' : 'saved' }; }

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
async function accessToken(a) {
  if (tokenCache.key === a.private_key_id && tokenCache.exp > Date.now() + 60e3) return tokenCache.value;
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({ iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: a.token_uri, iat, exp: iat + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(a.private_key).toString('base64url');
  const r = await fetch(a.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }), signal: AbortSignal.timeout(20e3) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google rejected the Firebase key (${j.error_description || j.error || r.status}). Generate a new private key in Firebase and paste it again.`);
  tokenCache = { key: a.private_key_id, value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return j.access_token;
}

/** Send one message to one device. Returns { ok } or { invalid } (token no longer valid) or { error }. */
export async function sendTo(account, token, { title, body, url, image, topic, urgent }, validateOnly = false) {
  const at = await accessToken(account);
  const message = {
    token,
    notification: { title, body: body || '', ...(image && /^https:\/\//.test(image) ? { image } : {}) },
    data: { url: String(url || '/'), topic: String(topic || '') },
    android: { priority: urgent ? 'HIGH' : 'NORMAL', ttl: '86400s', notification: { click_action: 'OPEN_URL' } },
    apns: { headers: { 'apns-priority': urgent ? '10' : '5' }, payload: { aps: { sound: 'default' } } },
  };
  const r = await fetch(`${FCM()}/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ validate_only: validateOnly, message }), signal: AbortSignal.timeout(20e3) });
  if (r.ok) return { ok: true };
  const j = await r.json().catch(() => ({})); const st = j?.error?.status || ''; const detail = JSON.stringify(j?.error?.details || '');
  if (r.status === 404 || st === 'NOT_FOUND' || /UNREGISTERED/.test(detail)) return { invalid: true };
  if (st === 'INVALID_ARGUMENT' && /registration token|Invalid.*token/i.test(j?.error?.message || '')) return { invalid: true };
  return { error: j?.error?.message || `FCM error ${r.status}`, status: r.status, code: st };
}
/** Check the key really works (gets a token from Google and asks FCM to validate a message — nothing is delivered). */
export async function test() {
  const a = await getAccount(); if (!a) throw Object.assign(new Error('Paste the Firebase service-account key first.'), { status: 400 });
  await accessToken(a);                                              // proves the private key is accepted by Google
  const r = await sendTo(a, 'test-token-not-a-real-device', { title: 'Test', body: '' }, true);
  if (r.error && r.status !== 400) throw new Error(r.error);        // 400 = "that token is invalid", which is expected: the key itself was accepted
  return { ok: true, projectId: a.project_id };
}
