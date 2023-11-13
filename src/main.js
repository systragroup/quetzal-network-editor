import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createGettext } from 'vue3-gettext'
import store from './store'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as labsComponents from 'vuetify/labs/components'
import * as directives from 'vuetify/directives'
import { aliases, fa } from 'vuetify/iconsets/fa'

import 'promise-polyfill/src/polyfill'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import '@fortawesome/fontawesome-free/css/all.css'
import 'mapbox-gl/dist/mapbox-gl.css'

import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import VueApexCharts from 'vue3-apexcharts'

import { fr, en } from 'vuetify/locale'
import translations from './translations.json'

import '@scss/main.scss'

// config
import { mapboxPublicKey } from '@src/config.js'
console.assert(mapboxPublicKey)

const languageMixin = {
  methods: {
    $selectBestLanguage (browserLangs, supportedLangs) {
      if (browserLangs.length) {
        for (const lang of browserLangs) {
          const parts = lang.toLowerCase().split('-')
          if (parts.length > 1) {
            parts[1] = parts[1].toUpperCase()
          }
          const normLang = parts.join('-')
          if (supportedLangs.includes(normLang)) {
            return normLang
          } else if (parts.length > 1 && supportedLangs.includes(parts[0])) {
            return parts[0]
          }
        }
        return supportedLangs[0]
      } else {
        return supportedLangs[0]
      }
    },
  },
}

const app = createApp(App)
app.mixin(languageMixin)
app.use(store)
app.use(router)
app.component('Apexchart', VueApexCharts)
app.component('VueDatePicker', VueDatePicker)
app.component('FontAwesomeIcon', FontAwesomeIcon)
library.add(fas)

const bestLanguage = languageMixin.methods.$selectBestLanguage(navigator.languages, ['en', 'fr'])

const vuetify = createVuetify({
  // https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
  components: {
    ...components,
    ...labsComponents, // we need this to use v-data-table...
  },
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          main: '#003C4B', // $transversal-main
          primary: '#B5E0D6', // $primary
          primarylight: '#B5E0D6', // $primary-light
          primarydark: '#7EBAAC', // $primary-dark
          secondary: '#2C3E4E', // $secondary
          secondarylight: '#2C3E4E', // $secondary-light
          secondarydark: '#0F1C27', // $secondary-dark
          lightgrey: '#E3E3E3', // $grey-light
          mediumgrey: '#9E9E9E', // $grey-medium
          darkgrey: '#5B5B5B', // $grey-dark
          success: '#4CAF50', // $4CAF50
          warning: '#FF7B30', // $warning-orange
          error: '#E42626', // $error-red
        },
      },
    },
  },
  icons: {
    aliases,
    sets: {
      fa,
    },
  },
  locale: {
    locale: bestLanguage,
    fallback: 'translations',
    messages: { fr, en, translations },
  },
})
app.use(vuetify)

app.use(createGettext({
  availableLanguages: {
    en: 'English',
    fr: 'Français',
  },
  defaultLanguage: bestLanguage,
  translations,
}))

app.mount('#app')
