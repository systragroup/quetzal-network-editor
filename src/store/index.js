import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    route: null,
    notification: {},
    user: null,
  },
  mutations: {
    changeRoute (state, newRoute) {
      state.route = newRoute
    },
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeUser (state, newUser) {
      state.user = newUser
    },
  },
  getters: {
    route: state => state.route,
    notification: state => state.notification,
    user: state => state.user,
  },
})
