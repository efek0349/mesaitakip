import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/mesaitakip/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
