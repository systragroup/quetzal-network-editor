import Vue from 'vue'
import Vuex from 'vuex'
import pkPoints from '@static/nodes_test.geojson'
import line from '@static/links_test.geojson'

Vue.use(Vuex)

export const store = new Vuex.Store({
  state: {
    route: null,
    notification: {},
    user: null,
    links: line, //links: {},
    nodes: pkPoints, //nodes: null
    route_id : Array.from(new Set(line.features.map(item => item.properties.route_id))),
    trip_id : Array.from(new Set(line.features.map(item => item.properties.trip_id)))
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
    nodes: state => state.nodes,
    links: state => state.links,
    route_id: state => state.route_id,
    trip_id: state => state.trip_id
  },
})
