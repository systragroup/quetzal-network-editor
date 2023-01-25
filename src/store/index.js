import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
import rlinksModule from './rlinks.js'
Vue.use(Vuex)

export const store = new Vuex.Store({
  modules: {
    links: linksModule,
    rlinks: rlinksModule,
  },

  state: {
    notification: {},
    showLeftPanel: true,
  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeLeftPanel (state) {
      state.showLeftPanel = !state.showLeftPanel
    },
  },
  getters: {
    notification: (state) => state.notification,
    showLeftPanel: (state) => state.showLeftPanel,
  },
})
