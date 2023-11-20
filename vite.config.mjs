import { fileURLToPath, URL } from 'node:url'

/// <reference types="vitest" />
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8081,
  },
  define: {
    global: {},
  },
  optimizeDeps: {
    include: ['map-promisified'],
  },
  plugins: [
    vue(),
    vuetify(),
  ],
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./src', import.meta.url)),
      '@comp': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
      '@page': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@lang': fileURLToPath(new URL('./src/languages', import.meta.url)),
      '@scss': fileURLToPath(new URL('./src/scss', import.meta.url)),
      '@static': fileURLToPath(new URL('./static', import.meta.url)),
      '@test': fileURLToPath(new URL('./test', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@scss/sds-design-system/color-shades.scss";',
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      customExportConditions: ['node', 'node-addons'],
    },
    server: { deps: { inline: ['vuetify', 'gettext'] } },
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*', 'src/**/**/*'],
      extension: ['js', 'vue'],
      reportsDirectory: './reports/coverage',
      reporter: 'html',
      reportOnFailure: true,
    },
  },
})
