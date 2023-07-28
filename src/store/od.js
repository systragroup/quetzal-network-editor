/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import Point from 'turf-point'
const short = require('short-uuid')

export default {
  namespaced: true,
  state: {
    layer: {},
    visibleLayer: {},
    layerHeader: {}, // empty geojson
    layerAttributes: [], // all the available attributes (columns in pandas)
    selectedFilter: '', // ex: highway
    selectedCategory: [], // ex: [motorway, residential] visible one.

  },

  mutations: {
    loadLayer (state, payload) {
      state.layer = payload
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        const layerHeader = { ...state.layer }
        layerHeader.features = []
        state.layerHeader = layerHeader
        state.visibleLayer = structuredClone(layerHeader)
        // set all trips visible
        // this.commit('results/changeSelectedTrips', state.tripId)
        this.commit('od/getProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    updateLinks (state, payload) {
      state.links = payload
      this.commit('od/refreshVisibleLayer')
      this.commit('od/updateSelectedFeature')
    },
    changeSelectedFilter (state, payload) {
      state.selectedFilter = payload
      this.commit('od/refreshVisibleLayer')
    },
    changeSelectedCategory (state, payload) {
      state.selectedCategory = payload
      this.commit('od/refreshVisibleLayer')
    },

    getProperties (state) {
      const header = new Set([])
      state.layer.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      state.layerAttributes = Array.from(header)
      state.selectedFilter = state.layerAttributes[0]
      state.selectedCategory = Array.from(new Set(state.layer.features.map(
        item => item.properties[state.selectedFilter])))
    },

    refreshVisibleLayer (state) {
      const group = new Set(state.selectedCategory)
      const cat = state.selectedFilter
      state.visibleLayer.features = state.layer.features.filter(link => group.has(link.properties[cat]))
    },

    // actions

    moveNode (state, payload) {
      const linkIndex = payload.selectedFeature.properties.linkIndex
      const coordinatedIndex = payload.selectedFeature.properties.coordinatedIndex

      const link = state.visibleLayer.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },

  },

  getters: {
    layer: (state) => state.layer,
    visibleLayer: (state) => state.visibleLayer,
    layerHeader: (state) => state.layerHeader,
    selectedTrips: (state) => state.selectedTrips,
    layerAttributes: (state) => state.layerAttributes.sort(),
    selectedFilter: (state) => state.selectedFilter,
    selectedCategory: (state) => state.selectedCategory,
    nodes: (state) => (layer) => {
      const nodes = structuredClone(state.layerHeader)
      layer.features.forEach(
        feature => {
          const Index = feature.properties.index
          feature.geometry.coordinates.forEach(
            (point, idx) => nodes.features.push(Point(
              point,
              { index: short.generate(), linkIndex: Index, coordinatedIndex: idx },
            ),
            ),

          )
        },
      )

      return nodes
    },

  },
}
