/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  namespaced: true,
  state: {
    zones: {},
    features: {},
  },

  mutations: {
    loadZones (state, payload) {
      state.zones = structuredClone(payload.zones)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.zones.crs.properties.name)) {
        // state.zones.features.forEach(zone => zone.geometry.coordinates = zone.geometry.coordinates.map(
        //  points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        state.zones.features.forEach(zone => zone.properties.distance = payload.mat.distance[2][zone.properties.index])
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

  },

  getters: {
    zones: (state) => state.zones,
  },
}
