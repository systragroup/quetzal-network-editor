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
    loadZones (state, payload) {
      state.type = 'zones'
      state.layer = structuredClone(payload.zones)
      Object.keys(payload.mat).forEach(
        key => { state.mat[key + ' (OD)'] = payload.mat[key] })
      state.properties = Object.keys(state.mat)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        // if init with nothing, do nothing.
        if (state.layer.features.length > 0) {
        // init the property with the first zone index
          const initIndex = state.layer.features[0].properties.index
          // for each properties in matrix, init the zones to the fist value.

          state.properties.forEach(
            prop =>
              state.layer.features.forEach(
                zone => zone.properties[prop] = state.mat[prop][initIndex][zone.properties.index]),
          )
        }
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadLinks (state, payload) {
      state.layer = structuredClone(payload.links)
      state.type = 'links'
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        state.layer.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    loadNodes (state, payload) {
      state.layer = structuredClone(payload.nodes)
      state.type = 'nodes'
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        state.layer.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        // this.commit('getNodesProperties')
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
  },
}
