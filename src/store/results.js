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
    lineAttributes: [],
    selectedGroup: {
      selectedFilter: '',
      selectedCategory: [],
    },
    displaySettings: {
      selectedFeature: 'volume',
      maxWidth: 10,
      minWidth: 1,
      numStep: 10,
      scale: 'equal', // 'log'
      minVal: 0,
      maxVal: 1,
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
    changeSelectedGroup (state, payload) {
      // trips list of visible trip_id.
      state.selectedGroup = payload
      this.commit('results/refreshVisibleLinks')
    },
    getLinksProperties (state) {
      const header = new Set([])
      state.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      state.lineAttributes = Array.from(header)
      const selectedFilter = header.has('route_type') ? 'route_type' : header[0]

      const val = Array.from(new Set(state.links.features.map(
        item => item.properties[selectedFilter])))

      this.commit('results/changeSelectedGroup', {
        selectedFilter: selectedFilter,
        selectedCategory: val,
      })
    },
    applySettings (state, payload) {
      state.displaySettings.selectedFeature = payload.selectedFeature
      state.displaySettings.maxWidth = payload.maxWidth
      state.displaySettings.minWidth = payload.minWidth
      state.displaySettings.numStep = payload.numStep
      state.displaySettings.scale = payload.scale
      this.commit('results/updateSelectedFeature')
      this.commit('results/refreshVisibleLinks')
    },

    updateSelectedFeature (state) {
      const key = state.displaySettings.selectedFeature
      const maxWidth = state.displaySettings.maxWidth
      const minWidth = state.displaySettings.minWidth
      const scale = state.displaySettings.scale
      const numStep = state.displaySettings.numStep

      const featureArr = state.visibleLinks.features.map(link => link.properties[key])
      const minVal = Math.min.apply(Math, featureArr)
      const maxVal = Math.max.apply(Math, featureArr)
      state.displaySettings.minVal = minVal
      state.displaySettings.maxVal = maxVal

      state.visibleLinks.features.forEach(
        link => link.properties.display_width =
        ((maxWidth - minWidth) * ((link.properties[key] - minVal) /
         (maxVal - minVal))) + minWidth,
      )
      const colorScale = chroma.scale('OrRd').padding([0.2, 0])
        .domain([minWidth, maxWidth], scale).classes(numStep)

      state.visibleLinks.features.forEach(
        // eslint-disable-next-line no-return-assign
        link => link.properties.display_color = colorScale(link.properties.display_width).hex(),
      )
    },
    refreshVisibleLinks (state) {
      const group = new Set(state.selectedGroup.selectedCategory)
      const cat = state.selectedGroup.selectedFilter
      state.visibleLinks.features = state.links.features.filter(link => group.has(link.properties[cat]))
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
    selectedGroup: (state) => state.selectedGroup,
    displaySettings: (state) => state.displaySettings,
    selectedFeature: (state) => state.displaySettings.selectedFeature,
    maxWidth: (state) => state.displaySettings.maxWidth,
    minWidth: (state) => state.displaySettings.minWidth,
    numStep: (state) => state.displaySettings.numStep,
    scale: (state) => state.displaySettings.scale,
    colorScale: (state) => {
      const arr = []
      const colorScale = chroma.scale('OrRd').padding([0.2, 0])
        .domain([0, 100], state.displaySettings.scale).classes(state.displaySettings.numStep)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(i).hex())
      }
      return arr
    },
  },
}
