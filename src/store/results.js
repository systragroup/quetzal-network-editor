/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

import chroma from 'chroma-js'

function remap (val, minVal, maxVal, reverse, scale) {
  let res = 0
  if (reverse) {
    res = (-val + maxVal) / (maxVal - minVal)
  } else {
    res = (val - minVal) / (maxVal - minVal)
  }
  if (scale === 'sqrt') {
    res = Math.sqrt(res)
  } else if (scale === 'log') {
    res = res >= 0 ? Math.log10(10 * res) : 0
  }
  return res
}
export default {
  namespaced: true,
  state: {
    type: 'links',
    links: {},
    visibleLinks: {},
    linksHeader: {},
    lineAttributes: [],
    selectedFilter: '',
    selectedCategory: [],
    displaySettings: {
      selectedFeature: 'volume',
      maxWidth: 10,
      minWidth: 1,
      numStep: 100,
      scale: 'linear', // 'log'
      minVal: 0, // option to blocked them. so its an input and its not recompute
      maxVal: 1,
      cmap: 'OrRd',
      opacity: 100,
      showNaN: true,
      reverseColor: false,
    },

  },

  mutations: {
    loadLinks (state, payload) {
      state.links = payload.geojson
      state.type = payload.type
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.links.crs.properties.name)) {
        const linksHeader = { ...state.links }
        linksHeader.features = []
        state.linksHeader = linksHeader
        state.visibleLinks = structuredClone(linksHeader)
        // set all trips visible
        // this.commit('results/changeSelectedTrips', state.tripId)
        this.commit('results/getLinksProperties')

        if (payload.selectedFeature) {
          state.displaySettings.selectedFeature = payload.selectedFeature
        }
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    updateLinks (state, payload) {
      state.links = payload
      this.commit('results/updateSelectedFeature')
      this.commit('results/refreshVisibleLinks')
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
      state.displaySettings.opacity = payload.opacity
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

      const arrayMinMax = (arr) =>
        arr.reduce(([min, max], val) => [Math.min(min, val), Math.max(max, val)], [
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        ])

      const [minVal, maxVal] = arrayMinMax(featureArr)
      state.displaySettings.minVal = minVal
      state.displaySettings.maxVal = maxVal

      state.visibleLinks.features.forEach(
        link => link.properties.display_width =
        ((maxWidth - minWidth) * ((link.properties[key] - minVal) /
         (maxVal - minVal))) + minWidth,
      )
      const colorScale = chroma.scale(cmap).padding([0.1, 0])
        .domain([0, 1], scale).classes(numStep)
      const reverse = state.displaySettings.reverseColor

      state.visibleLinks.features.forEach(
        link => link.properties.display_color = colorScale(
          remap(link.properties[key], minVal, maxVal, reverse, scale)).hex(),
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
    type: (state) => state.type,
    links: (state) => state.links,
    visibleLinks: (state) => state.visibleLinks,
    linksHeader: (state) => state.linksHeader,
    selectedTrips: (state) => state.selectedTrips,
    lineAttributes: (state) => state.lineAttributes.sort(),
    selectedFilter: (state) => state.selectedFilter,
    selectedCategory: (state) => state.selectedCategory,
    displaySettings: (state) => state.displaySettings,
    selectedFeature: (state) => state.displaySettings.selectedFeature,
    maxWidth: (state) => state.displaySettings.maxWidth,
    minWidth: (state) => state.displaySettings.minWidth,
    numStep: (state) => state.displaySettings.numStep,
    scale: (state) => state.displaySettings.scale,
    opacity: (state) => state.displaySettings.opacity,
    colorScale: (state) => {
      const arr = []
      const colorScale = chroma.scale(state.displaySettings.cmap).padding([0.1, 0])
        .domain([0, 1]).classes(state.displaySettings.numStep)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(remap(i, 0, 100, state.displaySettings.reverseColor, state.displaySettings.scale)))
      }
      return arr
    },
  },
}
