import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
Vue.use(Vuex)



export const store = new Vuex.Store({
  modules: {
    links : linksModule,
  },

  state: {
    notification: {},
    showLeftPanel: true,
  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeLeftPanel (state, newUser) {
      state.showLeftPanel = !state.showLeftPanel
    },
  },
  getters: {
    notification: (state) => state.notification,
    showLeftPanel: (state) => state.showLeftPanel,
    
  },
})
