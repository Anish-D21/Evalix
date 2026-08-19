import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Evalix frontend build configuration.
// The dev server proxies /api calls to the Node backend so the browser
// never needs to know the backend host during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
