import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'charts-vendor'
          }

          if (id.includes('node_modules/lucide-vue-next') || id.includes('node_modules/vue-sonner')) {
            return 'ui-vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.spec.js'],
  },
  server: {
    port: 5173,
    proxy: {
      '/links': 'http://localhost:8000',
      '/auth':  'http://localhost:8000',
    }
  }
})
