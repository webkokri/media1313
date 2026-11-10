import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is proxied to the StudioCMS backend (cd backend && npm run dev).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4321', '/uploads': 'http://localhost:4321' } },
});
