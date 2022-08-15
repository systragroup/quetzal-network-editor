import Vue from 'vue'
import Vuetify from 'vuetify'

Vue.use(Vuetify)

Vue.$flatEdges = (obj, recurse = false) => {
  let flatObj = obj
  if (obj.edges) {
    flatObj = obj.edges.map(edge => edge.node)
  }
  if (recurse) {
    for (const key in obj) {
      if (obj[key] !== null && typeof obj[key] === 'object') {
        obj[key] = Vue.$flatEdges(obj[key], true)
      }
    }
  }
  return flatObj
}
