/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

export default {
  state: {
    rlinks: {},
    rnodes: {},
    rlinksHeader: {},
    rnodesHeader: {},
    rindexList: [],
    selectedrIndex: [],
    rlineAttributes: [],
    rnodeAttributes: [],
    visiblerLinks: {},
    visiblerNodes: {},
    roadPopupContent: 'highway',
  },

  mutations: {
    loadrLinks (state, payload) {
      state.rlinks = structuredClone(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.rlinks.crs.properties.name)) {
        const rlinksHeader = { ...state.rlinks }
        rlinksHeader.features = []
        state.rlinksHeader = rlinksHeader
        state.visiblerLinks = rlinksHeader
        // limit geometry precision to 6 digit
        state.rlinks.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        this.commit('getrLinksProperties')
        this.commit('getrIndexList')
        // set all trips visible
        // this.commit('addVisible', state.rindexList)
        // state.filesAreLoaded.links = true
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadrNodes (state, payload) {
      state.rnodes = JSON.parse(JSON.stringify(payload))
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.rnodes.crs.properties.name)) {
        const rnodesHeader = { ...state.rnodes }
        rnodesHeader.features = []
        state.rnodesHeader = rnodesHeader
        state.visiblerNodes = rnodesHeader
        // limit geometry precision to 6 digit
        state.rnodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        this.commit('getrNodesProperties')
        // state.filesAreLoaded.nodes = true
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    getrLinksProperties (state) {
      let header = new Set([])
      state.rlinks.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // header.delete('index')
      // add all default attributes
      const defaultAttributes = [
        'index', 'a', 'b']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.rlineAttributes = header
    },
    getrNodesProperties (state) {
      let header = new Set([])
      state.rnodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.rnodeAttributes = header
    },
    getrIndexList (state) {
      state.rindexList = Array.from(new Set(state.rlinks.features.map(item => item.properties.index)))
    },
    changeVisibleRoads (state, payload) {
      // trips list of visible trip_id.
      state.selectedrIndex = payload.data
      const cat = payload.category
      // eslint-disable-next-line max-len
      console.log('in func')
      state.visiblerLinks.features = state.rlinks.features.filter(link => state.selectedrIndex.includes(link.properties[cat]))
      console.log('links updated')
      this.commit('getVisiblerNodes')

      console.log('nodes updadted')
    },
    getVisiblerNodes (state) {
      // payload contain nodes. state.nodes or state.editorNodes
      // find the nodes in the editor links
      const a = state.visiblerLinks.features.map(item => item.properties.a)
      const b = state.visiblerLinks.features.map(item => item.properties.b)
      const rNodesList = Array.from(new Set([...a, ...b]))
      // set nodes corresponding to trip id
      state.visiblerNodes.features = state.rnodes.features.filter(node => rNodesList.includes(node.properties.index))
    },

  },

  getters: {
    rlinks: (state) => state.rlinks,
    rnodes: (state) => state.rnodes,
    rlineAttributes: (state) => state.rlineAttributes,
    rindexList: (state) => state.rindexList,
    selectedrIndex: (state) => state.selectedrIndex,
    visiblerLinks: (state) => state.visiblerLinks,
    visiblerNodes: (state) => state.visiblerNodes,
    roadPopupContent: (state) => state.roadPopupContent,
  },
}
