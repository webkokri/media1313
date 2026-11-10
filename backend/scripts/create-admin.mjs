// Creates (or resets the password of) an admin account.
//   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='...' [ADMIN_ROLE=admin|editor] npm run create-admin
//   ADMIN_PREV_EMAIL=old@example.com renames that existing account to ADMIN_EMAIL.
//   ADMIN_ALLOW_SHORT=1 permits a password under 10 characters (not recommended).
import { one, run, uuid, now, ensureSchema } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

const { ADMIN_EMAIL: email, ADMIN_NAME: name, ADMIN_PASSWORD: password, ADMIN_ROLE: role = 'admin' } = process.env;
if (!email || !name || !password) { console.error('Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD.'); process.exit(1); }
if (password.length < 10 && !process.env.ADMIN_ALLOW_SHORT) { console.error('Password must be at least 10 characters.'); process.exit(1); }
await ensureSchema();
const existing = await one('SELECT id FROM m1313_admins WHERE email = ?', [(process.env.ADMIN_PREV_EMAIL || email).toLowerCase()]);
if (existing) { await run('UPDATE m1313_admins SET email = ?, password_hash = ?, name = ?, role = ? WHERE id = ?', [email.toLowerCase(), hashPassword(password), name, role, existing.id]); console.log(`Updated ${email}.`); }
else { await run('INSERT INTO m1313_admins (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uuid(), email.toLowerCase(), name, hashPassword(password), role, now()]); console.log(`Created ${role} ${email}.`); }
process.exit(0);
