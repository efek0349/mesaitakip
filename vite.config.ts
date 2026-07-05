import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  build: { outDir: 'dist' },
});
