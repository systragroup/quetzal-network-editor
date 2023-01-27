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
    anchorMode: false,
    showLeftPanel: true,
  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeLeftPanel (state) {
      state.showLeftPanel = !state.showLeftPanel
    },
    setAnchorMode (state, payload) {
      state.anchorMode = payload
    },
    changeAnchorMode (state) {
      state.anchorMode = !state.anchorMode
    },
  },
  getters: {
    notification: (state) => state.notification,
    anchorMode: (state) => state.anchorMode,
    showLeftPanel: (state) => state.showLeftPanel,
  },
})
