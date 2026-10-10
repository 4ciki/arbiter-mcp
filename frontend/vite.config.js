import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    server: {
      host: true,
      port: 5173,
      // Allow Firebase Auth popups without COOP restrictions
      headers: {
        'Cross-Origin-Opener-Policy':   'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
      // Dev proxy: forward /api and /webhooks to the local backend.
      // In production, VITE_API_URL is baked in at build time — no proxy needed.
      proxy: env.VITE_API_URL
        ? {}  // Production build: no proxy, all requests go to VITE_API_URL
        : {
            '/api': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
            '/webhooks': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
            '/health': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
          },
    },

    build: {
      // Output to dist/ (default), which the Dockerfile picks up
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Chunk vendor libs separately for better caching
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor'
            }
            if (id.includes('node_modules/recharts')) {
              return 'charts'
            }
            if (id.includes('node_modules/firebase')) {
              return 'firebase'
            }
          },
        },
      },
    },
  }
})
