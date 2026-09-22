import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, './app'),
      '@': resolve(import.meta.dirname, './app'),
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    fileParallelism: false,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,vue}'],
      exclude: ['app/plugins/**', 'app/assets/**', 'app/middleware/**']
    },
    // Mock Nuxt auto-imports and composables globally
    setupFiles: ['./tests/setup.ts']
  }
})
