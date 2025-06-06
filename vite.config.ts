/* eslint-disable @typescript-eslint/naming-convention */
import { fileURLToPath, URL } from 'node:url'

/// <reference types="vitest" />
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
// import VueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  let basePath = '/quetzal-network-editor-dev/'
  let defineOption = {}
  if (mode === 'development') {
    defineOption = { global: 'window' }
  } else if (mode === 'staging') {
    basePath = '/quetzal-network-editor-dev/'
  } else if (mode === 'production') {
    basePath = '/quetzal-network-editor/'
  }

  return {
    server: {
      port: 8081,
    },
    preview: {
      port: 8081,
    },

    define: defineOption, // only for dev
    optimizeDeps: {
      include: ['map-promisified', // need all those vuetify for dev server not reloading every new page click
        'vuetify/components/VRangeSlider',
        'vuetify/components/VSlider',
        'vuetify/components/VBottomNavigation',
        'vuetify/components/VDataTable',
        'vuetify/components/VWindow',
        'vuetify/components/VChip',
        'vuetify/components/VDatePicker',
        'vuetify/components/VStepper',
        'vuetify/components/VExpansionPanel',
        'vuetify/components/VCheckbox',
        'vuetify/components/VVirtualScroll',
        'vuetify/components/VColorPicker',
        'vuetify/components/transitions',
        'vuetify/components/VToolbar'],
    },
    base: basePath,
    plugins: [
      vue(),
      vuetify(),
      // VueDevTools(),
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
          additionalData: '@use "@scss/sds-design-system/color-shades.scss" as *;',
          api: 'modern-compiler',
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
  }
})
