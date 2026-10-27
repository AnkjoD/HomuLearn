import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy /api → Spring Boot dev server
      // ponytail: HTTPS/cookie domain — cần cấu hình thêm khi deploy production
      '/api': {
        target: process.env.HOMULEARN_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
  },
})
