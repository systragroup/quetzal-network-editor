/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'

const short = require('short-uuid')

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
    newrNode: {},
    visiblerLinks: {},
    visiblerNodes: {},
    connectedLinks: [],
    roadPopupContent: 'highway',
    roadEditionMode: false,
    speed: 20,
  },

  mutations: {
    loadrLinks (state, payload) {
      state.rlinks = structuredClone(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.rlinks.crs.properties.name)) {
        const rlinksHeader = { ...state.rlinks }
        rlinksHeader.features = []
        state.rlinksHeader = rlinksHeader
        state.visiblerLinks = structuredClone(rlinksHeader)
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
        state.visiblerNodes = structuredClone(rnodesHeader)
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

    createNewrNode (state, payload) {
      const newNode = structuredClone(state.rnodesHeader)
      const nodeProperties = {}
      state.rnodeAttributes.forEach(key => {
        nodeProperties[key] = null
      })
      nodeProperties.index = 'rnode_' + short.generate()
      const nodeGeometry = {
        coordinates: payload,
        type: 'Point',
      }
      // Copy specified node
      const nodeFeatures = { geometry: nodeGeometry, properties: nodeProperties, type: 'Feature' }
      newNode.features = [nodeFeatures]
      state.newrNode = newNode
    },
    splitrLink (state, payload) {
      // changing link1 change editorLinks as it is an observer.
      const link1 = payload.selectedFeature
      const link2 = structuredClone(link1)
      // distance du point (entre 0 et 1) sur le lien original
      const ratio = payload.offset

      link1.properties.b = state.newrNode.features[0].properties.index
      link1.geometry.coordinates = [
        ...link1.geometry.coordinates.slice(0, payload.sliceIndex),
        state.newrNode.features[0].geometry.coordinates,
      ]

      link1.properties.index = 'link_' + short.generate() // link1.properties.index+ '-1'
      link1.properties.length = link1.properties.length * ratio
      link1.properties.time = link1.properties.time * ratio

      link2.properties.a = state.newrNode.features[0].properties.index
      link2.geometry.coordinates = [
        state.newrNode.features[0].geometry.coordinates,
        ...link2.geometry.coordinates.slice(payload.sliceIndex),
      ]
      link2.properties.index = 'rlink_' + short.generate() // link2.properties.index+ '-2'
      link2.properties.length = link2.properties.length * (1 - ratio)
      link2.properties.time = link2.properties.time * (1 - ratio)
      console.log('add to visiblerlink')
      state.visiblerLinks.features.push(link2)
      state.visiblerNodes.features.push(state.newrNode.features[0])
      // update actual rlinks and rnodes
      state.rlinks.features.filter((link) => link.properties.index === link1.properties.index)[0] = link1
      state.rlinks.features.push(link2)
      state.rnodes.features.push(state.newrNode.features[0])
    },

    addRoadNodeInline (state, payload) {
      // payload contain selectedLink and event.lngLat (clicked point)
      const selectedFeature = state.visiblerLinks.features.filter((link) => link.properties.index === payload.selectedLink.index)[0]
      const linkGeom = Linestring(selectedFeature.geometry.coordinates)
      const clickedPoint = Point(Object.values(payload.lngLat))
      const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
      const dist = length(linkGeom, { units: 'kilometers' }) // dist
      // for multiString, gives the index of the closest one, add +1 for the slice.
      const sliceIndex = snapped.properties.index + 1
      const offset = snapped.properties.location / dist
      if (payload.nodes === 'rnodes') {
        this.commit('createNewrNode', snapped.geometry.coordinates)
        this.commit('splitrLink', { selectedFeature: selectedFeature, offset: offset, sliceIndex: sliceIndex })
        // Anchor Nodes
      } else {
        this.commit('addAnchorrNode', {
          selectedLink: payload.selectedLink,
          coordinates: snapped.geometry.coordinates,
          sliceIndex: sliceIndex,
        })
      }
    },
    addAnchorrNode (state, payload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = state.visiblerLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change visible rLinks as it is an observer.
      const link = state.visiblerLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },

    getConnectedLinks (state, payload) {
      const nodeIndex = payload.selectedNode.properties.index
      console.log(state.visiblerLinks.features.filter(link => link.properties.b === nodeIndex))
      console.log(state.visiblerLinks.features.filter(link => link.properties.a === nodeIndex))
      // get links connected to the node
      state.connectedLinks = {
        b: state.visiblerLinks.features.filter(link => link.properties.b === nodeIndex),
        a: state.visiblerLinks.features.filter(link => link.properties.a === nodeIndex),
      }
    },
    moverNode (state, payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // remove node
      const newNode = state.visiblerNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = payload.lngLat

      // changing links

      // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
      state.connectedLinks.b.forEach(link => {
        // note: props are unchanged. even tho the length change, the time and length are unchanged.
        link.geometry.coordinates = [...link.geometry.coordinates.slice(0, -1), payload.lngLat]
        // update time and distance
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / state.speed * 3600 // 20kmh hard code speed. time in secs
        link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      })
      state.connectedLinks.a.forEach(link => {
        link.geometry.coordinates = [payload.lngLat, ...link.geometry.coordinates.slice(1)]
        // update time and distance
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / state.speed * 3600 // 20kmh hard code speed. time in secs
        link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      })
    },
    moverAnchor (state, payload) {
      const linkIndex = payload.selectedNode.properties.linkIndex
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = state.visiblerLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      const distance = length(link)
      link.properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / state.speed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },

  },

  getters: {
    rlinks: (state) => state.rlinks,
    rnodes: (state) => state.rnodes,
    rlinksHeader: (state) => state.rlinksHeader,
    rnodesHeader: (state) => state.rnodesHeader,
    rlineAttributes: (state) => state.rlineAttributes,
    rindexList: (state) => state.rindexList,
    selectedrIndex: (state) => state.selectedrIndex,
    visiblerLinks: (state) => state.visiblerLinks,
    visiblerNodes: (state) => state.visiblerNodes,
    roadPopupContent: (state) => state.roadPopupContent,
    anchorrNodes: (state) => (renderedLinks) => {
      const nodes = structuredClone(state.rnodesHeader)
      renderedLinks.features.filter(link => link.geometry.coordinates.length > 2).forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.geometry.coordinates.slice(1, -1).forEach(
            (point, idx) => nodes.features.push(Point(
              point,
              { index: short.generate(), linkIndex: linkIndex, coordinatedIndex: idx + 1 },
            ),
            ),

          )
        },
      )

      return nodes
    },
  },
}
