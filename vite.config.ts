import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-oxc';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { host: 'localhost', port: 3000 },
  build: { outDir: 'dist' },
});
