import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

<<<<<<< HEAD
// https://vitejs.dev/config/
export default defineConfig({
=======
export default defineConfig({
  base: '/mesaitakip-web/',
>>>>>>> a258f08 (pages)
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
