import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5183, strictPort: true },
  preview: { port: 5183, strictPort: true },
});
