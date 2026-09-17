import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for worker assets
  esbuild: {
    // Production builds drop console.log/debug chatter (errors and warnings are kept)
    pure: ['console.log', 'console.debug'],
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Split the heavy vendors so repeat visits and SW caching can load
        // them independently (hashed URLs are cache-forever safe)
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl')) return 'vendor-maplibre';
            if (id.includes('hls.js')) return 'vendor-hls';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
          }
          return undefined;
        },
      }
    }
  },
  server: {
    proxy: {
      '/api/radio': {
        target: 'https://all.api.radio-browser.info',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/radio/, ''),
        secure: false,
        headers: {
          'User-Agent': 'GlobeRadio/1.0'
        }
      }
    }
  }
})
