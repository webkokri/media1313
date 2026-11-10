export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
export const bad = (msg, status = 400) => json({ error: msg }, status);
export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
