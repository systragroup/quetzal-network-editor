/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  namespaced: true,
  state: {
    zones: {},
    mat: {},
    properties: [],
    selectedProperty: '',
  },

  mutations: {
    loadZones (state, payload) {
      state.zones = structuredClone(payload.zones)
      state.mat = payload.mat
      state.properties = Object.keys(state.mat)
      state.selectedProperty = state.properties[0]
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.zones.crs.properties.name)) {
        // if init with nothing, do nothing.
        if (state.zones.features.length > 0) {
        // init the property with the first zone index
          const initIndex = state.zones.features[0].properties.index
          // for each properties in matrix, init the zones to the fist value.

          state.properties.forEach(
            prop =>
              state.zones.features.forEach(
                zone => zone.properties[prop] = state.mat[prop][initIndex][zone.properties.index]),
          )
        }
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    changeZone (state, payload) {
      const index = payload.index
      const row = state.mat[state.selectedProperty][index]
      // apply new value to each zone. (zone_1 is selected, apply time to zone_1 to every zone)
      // if there is no data, put null (ex: sparse matrix)
      state.zones.features.forEach(
        zone => zone.properties[state.selectedProperty] = row ? row[zone.properties.index] : null)
    },

  },

  getters: {
    zones: (state) => state.zones,
    selectedProperty: (state) => state.selectedProperty,
  },
}
