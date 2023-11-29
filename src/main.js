import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createGettext } from 'vue3-gettext'
import { createPinia } from 'pinia'

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

// import VueDatePicker from '@vuepic/vue-datepicker'
// import '@vuepic/vue-datepicker/dist/main.css'

import { fr, en } from 'vuetify/locale'
import translations from './translations.json'

import '@scss/main.scss'

// config

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
app.use(createPinia())
app.use(router)
// app.component('VueDatePicker', VueDatePicker)
app.component('FontAwesomeIcon', FontAwesomeIcon)
library.add(fas)

// const bestLanguage = languageMixin.methods.$selectBestLanguage(navigator.languages, ['en', 'fr'])
const bestLanguage = 'en'
const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const vuetify = createVuetify({
  // https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
  components: {
    ...components,
    ...labsComponents, // we need this to use v-data-table...
  },
  directives,
  theme: {
    // defaultTheme: darkMode ? 'dark' : 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#B5E0D6',
          primarydark: '#7EBAAC',
          secondary: '#2C3E4E',
          secondarydark: '#1A242C',
          secondarydarkfix: '#1A242C',
          secondarylight: '#334453',
          background: '#808080',
          lightergrey: '#fff',
          lightgrey: '#E3E4E6',
          white: '#FFFFFF',
          black: '#000000',
          mediumgrey: '#ededed',
          darkgrey: '#5B5B5C',
          accent: '#2C3E4E',
          linksprimary: '#7EBAAC',
          linkssecondary: '#B5E0D6',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#2196F3',
          primarydark: '#191919',
          secondary: '#263238',
          secondarydark: '#fff',
          secondarydarkfix: '#1A242C',
          lightergrey: '#1e1e1e',
          lightgrey: '#403f3f',
          mediumgrey: '#575757',
          darkgrey: '#d9d9db',
          background: '#000000',
          white: '#000000',
          black: '#FFFFFF',
          success: '#2196F3',
          accent: '#d3c1b1',
          linksprimary: '#2196F3',
          linkssecondary: '#90CAF9',

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
  silent: true,
}))

app.mount('#app')
