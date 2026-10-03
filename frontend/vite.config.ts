import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 5173,
    proxy: {
      // dev convenience: relative /api calls go to Django
      '/api': {
        target: process.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
