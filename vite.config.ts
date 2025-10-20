import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
