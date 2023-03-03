/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  namespaced: true,
  state: {
    zones: {},
    mat: {},
  },

  mutations: {
    loadZones (state, payload) {
      state.zones = structuredClone(payload.zones)
      state.mat = payload.mat
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.zones.crs.properties.name)) {
        // state.zones.features.forEach(zone => zone.geometry.coordinates = zone.geometry.coordinates.map(
        //  points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        state.zones.features.forEach(zone => zone.properties.distance = state.mat.distance[1][zone.properties.index])
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    changeZone (state, payload) {
      const index = payload.index
      state.zones.features.forEach(zone => zone.properties.distance = state.mat.distance[index][zone.properties.index])
    },

  },

  getters: {
    zones: (state) => state.zones,
  },
}
