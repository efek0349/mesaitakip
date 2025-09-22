import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mesaitakip/',
  plugins: [react()],
  server: { host: 'localhost', port: 3000 },
  build: { outDir: 'dist' },
});
