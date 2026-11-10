import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export const UPLOAD_DIR = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
export const MAX_UPLOAD = 10 * 1024 * 1024;
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' };

// Check the real file signature, not just the declared type, so a renamed script can't be uploaded.
function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length > 6 && buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buf.length > 4 && buf.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
  return null;
}

export function saveUpload(buf, originalName) {
  const mime = sniff(buf);
  if (!mime) throw Object.assign(new Error('Only JPG, PNG, WebP, GIF images and PDFs can be uploaded.'), { status: 415 });
  const base = path.basename(String(originalName || 'file')).replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'file';
  const filename = `${Date.now().toString(36)}-${randomBytes(3).toString('hex')}-${base}${TYPES[mime]}`;
  fs.mkdirSync(UPLOAD_DIR(), { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR(), filename), buf);
  return { filename, mime, url: `/uploads/${filename}`, size: buf.length };
}
export const removeUpload = (filename) => { try { fs.unlinkSync(path.join(UPLOAD_DIR(), path.basename(filename))); } catch { /* already gone */ } };
