/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  namespaced: true,
  state: () => ({
    layer: {},
    mat: {},
    properties: [],
    type: null,
    matAvailableIndex: {},
  }),

  mutations: {
    createLayer (state, payload) {
      state.layer = structuredClone(payload.data)
      state.type = state.layer.features[0].geometry.type
      // change Multipolygon to polygon type. just as they the same for mapbox and the app.
      state.type = state.type === 'MultiPolygon' ? 'Polygon' : state.type
    },
    addMatrix (state, payload) {
      // payload is a matrix
      Object.keys(payload).forEach(key => { state.mat[key + ' (OD)'] = payload[key] })
      state.properties = Object.keys(state.mat)
      // force index to string
      state.layer.features.forEach(zone => zone.properties.index = String(zone.properties.index))
      // if init with nothing, do nothing.
      if (state.layer.features.length > 0) {
        state.properties.forEach(
          prop => {
            // get all clickable indexes
            state.matAvailableIndex[prop] = Object.keys(state.mat[prop])
            // for each properties in matrix, init the zones to null.
            state.layer.features.forEach(
              zone => zone.properties[prop] = null,
            )
          },

        )
      }
    },

    changeOD (state, payload) {
      const selectedProperty = payload.selectedProperty
      if (state.properties.includes(selectedProperty)) {
        const index = payload.index
        const row = state.mat[selectedProperty][index]
        // apply new value to each zone. (zone_1 is selected, apply time to zone_1 to every zone)
        // if there is no data, put null (ex: sparse matrix)
        state.layer.features.forEach(
          zone => zone.properties[selectedProperty] = row ? row[zone.properties.index] : null)
      }
    },

  },

  getters: {
    layer: (state) => state.layer,
    type: (state) => state.type,
    properties: (state) => state.properties,
    matAvailableIndex: (state) => state.matAvailableIndex,
    hasOD: (state) => state.properties.length > 0,
    mat: (state) => {
      // remove OD in matrix names.
      // return null if there is no od.
      const keys = Object.keys(state.mat)
      if (keys.length > 0) {
        const res = {}
        keys.forEach(
          key => { res[key.slice(0, -5)] = state.mat[key] })
        return res
      } else return null
    },
  },
}
