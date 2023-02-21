/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

import chroma from 'chroma-js'

export default {
  namespaced: true,
  state: {
    links: {},
    visibleLinks: {},
    nodes: {},
    linksHeader: {},
    nodesHeader: {},
    tripId: [],
    selectedTrips: [],
    lineAttributes: [],

  },

  mutations: {
    loadLinks (state, payload) {
      state.links = structuredClone(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.links.crs.properties.name)) {
        const linksHeader = { ...state.links }
        linksHeader.features = []
        state.linksHeader = linksHeader
        state.visibleLinks = structuredClone(linksHeader)
        // limit geometry precision to 6 digit
        state.links.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        this.commit('results/getTripId')
        // set all trips visible
        this.commit('results/changeSelectedTrips', state.tripId)
        this.commit('results/getLinksProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    loadNodes (state, payload) {
      state.nodes = JSON.parse(JSON.stringify(payload))
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.nodes.crs.properties.name)) {
        const nodesHeader = { ...state.nodes }
        nodesHeader.features = []
        state.nodesHeader = nodesHeader
        // limit geometry precision to 6 digit
        state.nodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        // this.commit('getNodesProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    getTripId (state) {
      state.tripId = Array.from(new Set(state.links.features.map(item => item.properties.trip_id)))
    },
    changeSelectedTrips (state, payload) {
      // trips list of visible trip_id.
      state.selectedTrips = payload
      const tripSet = new Set(state.selectedTrips)
      state.visibleLinks.features = state.links.features.filter(link => tripSet.has(link.properties.trip_id))
    },
    getLinksProperties (state) {
      const header = new Set([])
      state.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      state.lineAttributes = Array.from(header)
    },
    updateSelectedFeature (state, payload) {
      const key = payload.selectedFeature
      const featureArr = state.visibleLinks.features.map(link => link.properties[key])
      const maxVal = Math.max.apply(Math, featureArr)
      const minVal = Math.min.apply(Math, featureArr)

      state.visibleLinks.features.forEach(
        link => link.properties.display_width =
        ((payload.maxWidth - payload.minWidth) * ((link.properties[key] - minVal) /
         (maxVal - minVal))) + payload.minWidth,
      )
      const colorScale = chroma.scale('OrRd').padding([0.2, 0])
        .domain([payload.minWidth, payload.maxWidth], payload.scale).classes(payload.numStep)

      state.visibleLinks.features.forEach(
        // eslint-disable-next-line no-return-assign
        link => link.properties.display_color = colorScale(link.properties.display_width).hex(),
      )
      this.commit('results/refreshVisibleLinks')
    },
    refreshVisibleLinks (state) {
      const tripSet = new Set(state.selectedTrips)
      state.visibleLinks.features = state.links.features.filter(link => tripSet.has(link.properties.trip_id))
    },
  },

  getters: {
    links: (state) => state.links,
    visibleLinks: (state) => state.visibleLinks,
    nodes: (state) => state.nodes,
    linksHeader: (state) => state.linksHeader,
    nodesHeader: (state) => state.nodesHeader,
    tripId: (state) => state.tripId,
    selectedTrips: (state) => state.selectedTrips,
    lineAttributes: (state) => state.lineAttributes,
  },
}
