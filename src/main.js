import '@fortawesome/fontawesome-free/css/all.css'
import 'vuetify/dist/vuetify.min.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@scss/app.scss'

import Vue from 'vue'
import GetTextPlugin from 'vue-gettext'
import { store } from './store'
import router from './router'
import Vuetify from 'vuetify'
import VueApexCharts from 'vue-apexcharts'

import 'promise-polyfill/src/polyfill'

import fr from 'vuetify/es5/locale/fr'
import en from 'vuetify/es5/locale/en'
import de from 'vuetify/es5/locale/de'
import es from 'vuetify/es5/locale/es'
import pt from 'vuetify/es5/locale/pt'

import translations from './translations.json'

import App from './App.vue'
const mapboxPublicKey = process.env.VUE_APP_MAPBOX_PUBLIC_KEY
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
Vue.component('Apexchart', VueApexCharts)

const bestLanguage = languageMixin.methods.$selectBestLanguage(navigator.languages, ['en', 'fr', 'es', 'de', 'pt'])
const darkMode = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)

Vue.use(Vuetify)
Vue.use(GetTextPlugin, {
  autoAddKeyAttributes: true,
  availableLanguages: {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    pt: 'Português',
  },
  defaultLanguage: bestLanguage,
  translations,
  silent: true,
})

Vue.config.productionTip = false
Vue.config.devtools = true
Vue.config.performance = false

const vuetify = new Vuetify({
  theme: {
    dark: !!darkMode,
    options: {
      customProperties: true,
    },
    themes: {

      light: {
        primary: '#B5E0D6',
        primarydark: '#7EBAAC',
        secondary: '#2C3E4E',
        secondarydark: '#1A242C',
        secondarydarkfix: '#1A242C',
        secondarylight: '#334453',
        background: '#808080',
        lightgrey: '#E3E4E6',
        white: '#fff',
        black: '#000000',
        mediumgrey: '#9E9E9E',
        darkgrey: '#5B5B5C',
        accent: '#2C3E4E',
        linksprimary: '#7EBAAC',
        linkssecondary: '#B5E0D6',
        chart: {
          lightgreen: '#CDDC39',
          darkgreen: '#4CAF50',
          lightblue: '#00BCD4',
          darkblue: '#2196F3',
          purple: '#673AB7',
          pink: '#E91E63',
          orange: '#FF7B30',
          yellow: '#FFC107',
        },
      },
      dark: {
        primary: '#2196F3',
        primarydark: '#191919',
        secondary: '#263238',
        secondarydark: '#fff',
        secondarydarkfix: '#1A242C',
        lightgrey: '#403f3f',
        mediumgrey: '#575757',
        darkgrey: '#d9d9db',
        background: '#000000',
        white: '#000000',
        black: '#fff',
        success: '#2196F3',
        accent: '#d3c1b1',
        linksprimary: '#2196F3',
        linkssecondary: '#90CAF9',
        chart: {
          lightgreen: '#CDDC39',
          darkgreen: '#4CAF50',
          lightblue: '#00BCD4',
          darkblue: '#2196F3',
          purple: '#673AB7',
          pink: '#E91E63',
          orange: '#FF7B30',
          yellow: '#FFC107',
        },

      },

    },
  },
  icons: {
    iconfont: 'fa',
  },
  lang: {
    locales: { fr, en, es, de, pt },
    current: bestLanguage,
  },
})

Vue.mixin(languageMixin)

Vue.mixin({
  methods: {
    $flatEdges (obj, recurse = false) {
      let flatObj = obj
      if (obj.edges) {
        flatObj = obj.edges.map(edge => edge.node)
      }
      if (recurse) {
        for (const key in obj) {
          if (obj[key] !== null && typeof obj[key] === 'object') {
            obj[key] = this.$flatEdges(obj[key], true)
          }
        }
      }
      return flatObj
    },
  },
})

const app = new Vue({

  router,
  store,
  vuetify,
  render: h => h(App),
  template: '<App/>',
})

app.$mount('#app')
