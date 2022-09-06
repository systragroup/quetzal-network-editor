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
    user: null,
  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeUser (state, newUser) {
      state.user = newUser
    },
  },
  getters: {
    notification: (state) => state.notification,
    user: (state) => state.user,
    
  },
})
