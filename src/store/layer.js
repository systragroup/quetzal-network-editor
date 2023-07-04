/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  namespaced: true,
  state: () => ({
    layer: {},
    mat: {},
    properties: [],
    type: null,
  }),

  mutations: {
    createLayer (state, payload) {
      state.layer = structuredClone(payload.data)
      state.type = state.layer.features[0].geometry.type
      // change Multipolygon to polygon type. just as they the same for mapbox and the app.
      state.type = state.type === 'MultiPolygon' ? 'Polygon' : state.type
      Object.keys(payload.mat).forEach(
        key => { state.mat[key + ' (OD)'] = payload.mat[key] })
      state.properties = Object.keys(state.mat)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        // if init with nothing, do nothing.
        if (state.layer.features.length > 0) {
          // for each properties in matrix, init the zones to null.
          state.properties.forEach(
            prop =>
              state.layer.features.forEach(
                zone => zone.properties[prop] = null,
              ),
          )
        }
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    changeZone (state, payload) {
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
