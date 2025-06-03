import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Flask backend proxy
      '/api': 'http://127.0.0.1:5000',
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
    },
  },
  define: {
    'process.env.HEPCAT_VERSION': JSON.stringify(
      process.env.npm_package_version
    ),
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1000, // double the default
  },
});
