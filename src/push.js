import { api } from './api.jsx';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };

let cfg;
export const pushConfig = () => (cfg ||= api.get('/push/config').catch(() => ({ enabled: false })));

async function registration() { return (await navigator.serviceWorker.getRegistration('/')) || navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(() => navigator.serviceWorker.ready); }
export async function currentSubscription() {
  if (!pushSupported()) return null;
  try { const reg = await navigator.serviceWorker.getRegistration('/'); return reg ? await reg.pushManager.getSubscription() : null; } catch { return null; }
}
export async function savedTopics() { const s = await currentSubscription(); if (!s) return null; try { return (await api.post('/push/topics', { endpoint: s.endpoint })).topics; } catch { return null; } }

/** Ask permission (must be called from a click), subscribe, and tell the server which topics this visitor wants. */
export async function enablePush(topics) {
  const c = await pushConfig(); if (!c.enabled || !c.publicKey) throw new Error('Notifications are not available right now.');
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.' : 'Permission was not granted.');
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(c.publicKey) });
  await api.post('/push/subscribe', { subscription: sub.toJSON(), topics });
  return sub;
}
export async function disablePush() {
  const s = await currentSubscription(); if (!s) return;
  try { await api.post('/push/unsubscribe', { endpoint: s.endpoint }); } catch { /* the server cleans up dead endpoints itself */ }
  await s.unsubscribe();
}
