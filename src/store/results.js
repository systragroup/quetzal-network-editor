/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

import chroma from 'chroma-js'

export default {
  namespaced: true,
  state: {
    links: {},
    visibleLinks: {},
    linksHeader: {},
    nodes: {},
    nodesHeader: {},
    lineAttributes: [],
    selectedFilter: '',
    selectedCategory: [],
    displaySettings: {
      selectedFeature: 'volume',
      maxWidth: 10,
      minWidth: 1,
      numStep: 100,
      scale: 'equal', // 'log'
      minVal: 0, // option to blocked them. so its an input and its not recompute
      maxVal: 1,
      cmap: 'OrRd',
      showNaN: true,
      reverseColor: false,
    },

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

        // set all trips visible
        // this.commit('results/changeSelectedTrips', state.tripId)
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
    changeSelectedFilter (state, payload) {
      state.selectedFilter = payload
      this.commit('results/refreshVisibleLinks')
    },
    changeSelectedCategory (state, payload) {
      state.selectedCategory = payload
      this.commit('results/refreshVisibleLinks')
    },

    getLinksProperties (state) {
      const header = new Set([])
      state.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      state.lineAttributes = Array.from(header)
      state.selectedFilter = header.has('route_type') ? 'route_type' : header.has('highway') ? 'highway' : state.lineAttributes[0]
      state.selectedCategory = Array.from(new Set(state.links.features.map(
        item => item.properties[state.selectedFilter])))
    },
    applySettings (state, payload) {
      state.displaySettings.selectedFeature = payload.selectedFeature
      state.displaySettings.maxWidth = payload.maxWidth
      state.displaySettings.minWidth = payload.minWidth
      state.displaySettings.numStep = payload.numStep
      state.displaySettings.scale = payload.scale
      state.displaySettings.cmap = payload.cmap
      state.displaySettings.showNaN = payload.showNaN
      state.displaySettings.reverseColor = payload.reverseColor
      this.commit('results/updateSelectedFeature')
      this.commit('results/refreshVisibleLinks')
    },

    updateSelectedFeature (state) {
      const key = state.displaySettings.selectedFeature
      const maxWidth = state.displaySettings.maxWidth
      const minWidth = state.displaySettings.minWidth
      const scale = state.displaySettings.scale
      const numStep = state.displaySettings.numStep
      const cmap = state.displaySettings.cmap
      const featureArr = state.visibleLinks.features.filter(
        link => link.properties[key]).map(
        link => link.properties[key])
      const minVal = Math.min.apply(Math, featureArr)
      const maxVal = Math.max.apply(Math, featureArr)
      state.displaySettings.minVal = minVal
      state.displaySettings.maxVal = maxVal

      state.visibleLinks.features.forEach(
        link => link.properties.display_width =
        ((maxWidth - minWidth) * ((link.properties[key] - minVal) /
         (maxVal - minVal))) + minWidth,
      )
      const domain = state.displaySettings.reverseColor ? [maxVal, minVal] : [minVal, maxVal]

      const colorScale = chroma.scale(cmap).padding([0.2, 0])
        .domain(domain, scale).classes(numStep)

      state.visibleLinks.features.forEach(
        // eslint-disable-next-line no-return-assign
        link => link.properties.display_color = colorScale(link.properties[key]).hex(),
      )
    },
    refreshVisibleLinks (state) {
      const group = new Set(state.selectedCategory)
      const cat = state.selectedFilter
      state.visibleLinks.features = state.links.features.filter(link => group.has(link.properties[cat]))
      if (!state.displaySettings.showNaN) {
        const key = state.displaySettings.selectedFeature
        state.visibleLinks.features = state.visibleLinks.features.filter(link => link.properties[key])
      }
    },
  },

  getters: {
    links: (state) => state.links,
    visibleLinks: (state) => state.visibleLinks,
    nodes: (state) => state.nodes,
    linksHeader: (state) => state.linksHeader,
    nodesHeader: (state) => state.nodesHeader,
    selectedTrips: (state) => state.selectedTrips,
    lineAttributes: (state) => state.lineAttributes,
    selectedFilter: (state) => state.selectedFilter,
    selectedCategory: (state) => state.selectedCategory,
    displaySettings: (state) => state.displaySettings,
    selectedFeature: (state) => state.displaySettings.selectedFeature,
    maxWidth: (state) => state.displaySettings.maxWidth,
    minWidth: (state) => state.displaySettings.minWidth,
    numStep: (state) => state.displaySettings.numStep,
    scale: (state) => state.displaySettings.scale,
    colorScale: (state) => {
      const arr = []
      const domain = state.displaySettings.reverseColor ? [100, 0] : [0, 100]
      const colorScale = chroma.scale(state.displaySettings.cmap).padding([0.2, 0])
        .domain(domain, state.displaySettings.scale).classes(state.displaySettings.numStep)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(i).hex())
      }
      return arr
    },
  },
}
