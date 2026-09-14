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
        manualChunks: undefined, // Single bundle for simplicity in worker deployment
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
