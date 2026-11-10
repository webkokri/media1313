import html from '@studiocms/html';
import md from '@studiocms/md';
import { defineStudioCMSConfig } from 'studiocms/config';

// DB_DIALECT=libsql (local dev, default) or mysql (Hostinger). See .env.example.
const dialect = process.env.DB_DIALECT === 'mysql' ? 'mysql' : 'libsql';

export default defineStudioCMSConfig({
  // First-run setup wizard (/start) creates the owner account. After setup, set CMS_FIRST_RUN=false.
  dbStartPage: process.env.CMS_FIRST_RUN !== 'false',
  db: { dialect },
  plugins: [md(), html()],
});
