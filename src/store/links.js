/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'

const short = require('short-uuid')

export default {
  state: {
    links: {},
    editorTrip: null,
    editorNodes: {},
    editorLinks: {},
    editorLineInfo: {},
    nodes: {},
    nodesHeader: {},
    linksHeader: {},
    tripId: [],
    selectedTrips: [],
    newLink: {},
    newNode: {},
    changeBounds: true,
    linkSpeed: 20, // 20KmH for time (speed/distance)
    linksDefaultColor: '2196F3',
    lineAttributes: [],
    nodeAttributes: [],
    defaultAttributes: [
      { name: 'index', type: 'String' },
      { name: 'a', type: 'String' },
      { name: 'b', type: 'String' },
      { name: 'trip_id', type: 'String' },
      { name: 'route_id', type: 'String' },
      { name: 'agency_id', type: 'String' },
      { name: 'route_short_name', type: 'String' },
      { name: 'route_type', type: 'String' },
      { name: 'route_color', type: 'String' },
      { name: 'length', type: 'Number' }, // float
      { name: 'time', type: 'Number' }, // float
      { name: 'headway', type: 'Number' }, // float
      { name: 'route_width', type: 'Number' }, // float
      { name: 'pickup_type', type: 'Number' }, // float
      { name: 'drop_off_type', type: 'Number' }, // int
      { name: 'link_sequence', type: 'Number' }, // int
      { name: 'direction_id', type: 'Number' }, // int
    ],
  },

  mutations: {
    loadLinks (state, payload) {
      state.links = structuredClone(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.links.crs.properties.name)) {
        const linksHeader = { ...state.links }
        linksHeader.features = []
        state.linksHeader = linksHeader

        state.editorLinks = linksHeader
        // limit geometry precision to 6 digit
        state.links.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        this.commit('applyPropertiesTypes')
        this.commit('getTripId')
        // set all trips visible
        this.commit('changeSelectedTrips', state.tripId)

        this.commit('getLinksProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadNodes (state, payload) {
      state.nodes = JSON.parse(JSON.stringify(payload))
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.nodes.crs.properties.name)) {
        const nodesHeader = { ...state.nodes }
        nodesHeader.features = []
        state.nodesHeader = nodesHeader
        state.editorNodes = nodesHeader
        // limit geometry precision to 6 digit
        state.nodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        this.commit('getNodesProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    unloadFiles (state) {
      // when we reload files (some were already loaded.)
      state.links.features = []
      state.nodes.features = []
      state.editorTrip = null
      state.tripId = []
      state.selectedTrips = []
    },

    getLinksProperties (state) {
      let header = new Set([])
      state.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // header.delete('index')
      // add all default attributes
      const defaultAttributes = state.defaultAttributes.map(attr => attr.name)
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.lineAttributes = header
    },
    getNodesProperties (state) {
      let header = new Set([])
      state.nodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index',
        'stop_code',
        'stop_name']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.nodeAttributes = header
    },

    addPropertie (state, payload) {
      // when a new line properties is added (in dataframe page)
      if (payload.table === 'links') {
        state.links.features.map(link => link.properties[payload.name] = null)
        state.editorLinks.features.map(link => link.properties[payload.name] = null)
        state.lineAttributes.push(payload.name) // could put that at applied. so we can cancel
      } else {
        state.nodes.features.map(node => node.properties[payload.name] = null)
        state.editorNodes.features.map(node => node.properties[payload.name] = null)
      }
    },
    changeSelectedTrips (state, payload) {
      // trips list of visible trip_id.
      state.selectedTrips = payload
    },

    setEditorTrip (state, payload) {
      // set Trip Id
      state.editorTrip = payload.tripId
      state.changeBounds = payload.changeBounds
      // set editor links corresponding to trip id
      // var filtered = {...state.links}
      const filtered = JSON.parse(JSON.stringify(state.links))
      filtered.features = filtered.features.filter(link => link.properties.trip_id === state.editorTrip)
      state.editorLinks = filtered
      // get the corresponding nodes
      this.commit('getEditorNodes', { nodes: state.nodes })
      this.commit('getEditorLineInfo')
    },

    cloneTrip (state, payload) {
      // clone and reversed a trip.
      const cloned = structuredClone(state.links)
      cloned.features = cloned.features.filter(link => link.properties.trip_id === payload.tripId)

      let linkSequence = cloned.features.length
      for (const link of cloned.features) {
        link.properties.trip_id = payload.name
        // mettre dans l'autre sens » inverser 0 et 1 et leur coordonées
        link.geometry.coordinates.reverse()//
        // inverser node a et b (propriétés)
        link.properties.a = [link.properties.b, link.properties.b = link.properties.a][0]
        // changer le link-sequence de tous les objets
        link.properties.link_sequence = linkSequence
        linkSequence -= 1
        // changer la direction
        if (link.properties.direction_id === 0) {
          link.properties.direction_id = 1
        } else {
          link.properties.direction_id = 0
        }
        // changer nom de l'index
        link.properties.index = 'link_' + short.generate()
      }
      // inverser l'ordre des features
      cloned.features.reverse()
      state.links.features.push(...cloned.features)
      this.commit('getTripId')
    },
    getEditorNodes (state, payload) {
      // payload contain nodes. state.nodes or state.editorNodes
      // find the nodes in the editor links
      const a = state.editorLinks.features.map(item => item.properties.a)
      const b = state.editorLinks.features.map(item => item.properties.b)
      const editorNodesList = new Set([...a, ...b])
      // set nodes corresponding to trip id
      const filtered = JSON.parse(JSON.stringify(payload.nodes))
      filtered.features = filtered.features.filter(node => editorNodesList.has(node.properties.index))
      state.editorNodes = filtered
    },

    getEditorLineInfo (state) {
      const form = {}
      const uneditable = ['index', 'length', 'a', 'b', 'link_sequence']
      // empty trip, when its a newLine
      if (state.editorLinks.features.length === 0) {
        const defaultValue = {
          route_id: 'Q1',
          agency_id: 'QUENEDI',
          route_short_name: 'Q1',
          route_type: 'quenedi',
          route_color: state.linksDefaultColor,
          route_width: 3,
          headway: 600,
          pickup_type: 0,
          drop_off_type: 0,
          direction_id: 0,
        }

        state.lineAttributes.forEach(key => {
          form[key] = {
            value: defaultValue[key],
            disabled: uneditable.includes(key),
            placeholder: false,
          }
        })

        form.trip_id = { value: state.editorTrip, disabled: false, placeholder: false }
      } else {
        const features = state.editorLinks.features

        state.lineAttributes.forEach(key => {
          const val = new Set(features.map(link => link.properties[key]))
          form[key] = {
            value: val.size > 1 ? '' : [...val][0],
            disabled: uneditable.includes(key),
            placeholder: val.size > 1,
          }
        })
      }
      state.editorLineInfo = form
    },

    getTripId (state) {
      state.tripId = Array.from(new Set(state.links.features.map(item => item.properties.trip_id)))
    },

    setNewLink (state, payload) {
      // copy editor links geoJSON, only take first (or last) link.
      // delete some properties like id and index.
      const uncopiedPropeties = {
        index: null,
        length: null,
        time: null,
        pickup_type: 0,
        drop_off_type: 0,
      }
      // create link
      const tempLink = structuredClone(state.editorLinks)
      // if there is no link to copy, create one. (new Line)
      if (tempLink.features.length === 0) {
        // copy Line properties.
        const linkProperties = {}
        Object.keys(state.editorLineInfo).forEach((key) => {
          linkProperties[key] = state.editorLineInfo[key].value
        })
        // set default links values
        const defaultValue = {
          index: 'link_' + short.generate(),
          a: state.editorNodes.features[0].properties.index,
          b: state.editorNodes.features[0].properties.index,
          length: null,
          time: null,
          pickup_type: 0,
          drop_off_type: 0,
          link_sequence: 0,
        }
        Object.keys(defaultValue).forEach((key) => {
          linkProperties[key] = defaultValue[key]
        })

        const linkGeometry = {
          coordinates: [state.editorNodes.features[0].geometry.coordinates,
            state.editorNodes.features[0].geometry.coordinates],
          type: 'LineString',
        }
        const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
        tempLink.features = [linkFeature]
      }

      if (payload.action === 'Extend Line Upward') {
        // Take last link and copy properties
        // eslint-disable-next-line no-var
        var features = tempLink.features[tempLink.features.length - 1]
        Object.assign(features.properties, uncopiedPropeties)
        // sequence +1
        features.properties.link_sequence = features.properties.link_sequence + 1
        // replace node a by b and delete node a
        features.properties.a = features.properties.b
        features.geometry.coordinates[0] = features.geometry.coordinates.slice(-1)[0]
        // new node index (hash)
        payload.nodeCopyId = features.properties.a
        this.commit('setNewNode', payload)

        features.properties.b = state.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
      } else if (payload.action === 'Extend Line Downward') {
        // Take first link and copy properties
        // eslint-disable-next-line no-var, no-redeclare
        var features = tempLink.features[0]
        Object.assign(features.properties, uncopiedPropeties)
        // sequence + 1
        features.properties.link_sequence = features.properties.link_sequence - 1
        //  replace node b by a and delete node b
        features.properties.b = features.properties.a
        features.geometry.coordinates[1] = features.geometry.coordinates[0]
        // new node index (hash)
        payload.nodeCopyId = features.properties.b
        this.commit('setNewNode', payload)
        features.properties.a = state.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
      }
      tempLink.features = [features]
      state.newLink = tempLink
      state.newLink.action = payload.action
    },
    createNewNode (state, payload) {
      const nodeProperties = {}
      state.nodeAttributes.forEach(key => {
        nodeProperties[key] = null
      })
      nodeProperties.index = 'node_' + short.generate()
      const nodeGeometry = {
        coordinates: payload,
        type: 'Point',
      }
      // Copy specified nodenewNode
      const nodeFeatures = { geometry: nodeGeometry, properties: nodeProperties, type: 'Feature' }
      state.editorNodes.features = [nodeFeatures]
    },

    setNewNode (state, payload) {
      const { coordinates = [null, null] } = payload
      const uncopiedPropeties = {}
      state.nodeAttributes.forEach(key => {
        uncopiedPropeties[key] = null
      })
      // Copy specified node
      const tempNode = JSON.parse(JSON.stringify(state.editorNodes))
      const features = tempNode.features.filter(node => node.properties.index === payload.nodeCopyId)[0]
      Object.assign(features.properties, uncopiedPropeties)
      features.properties.index = 'node_' + short.generate()
      features.geometry.coordinates = coordinates
      tempNode.features = [features]
      state.newNode = tempNode
    },

    editNewLink (state, payload) {
      // for realtime viz. this method change the linestring to the payload (mouse position)
      // for some reason, it doesnt work when i only apply payload to coordinates[1]
      state.newNode.features[0].geometry.coordinates = payload
      if (state.newLink.action === 'Extend Line Upward') {
        state.newLink.features[0].geometry.coordinates = [state.newLink.features[0].geometry.coordinates[0], payload]
      } else {
        state.newLink.features[0].geometry.coordinates = [payload, state.newLink.features[0].geometry.coordinates[1]]
      }
    },

    applyNewLink (state, payload) {
      // nodeId: this.selectedNodeId, geom: pointGeom, action: Extend Line Upward
      // get linestring length in km
      this.commit('setNewLink', { action: payload.action })
      this.commit('editNewLink', payload.geom)

      const distance = length(state.newLink)
      state.newLink.features[0].properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / state.linkSpeed * 3600 // 20kmh hard code speed. time in secs

      state.newLink.features[0].properties.time = Number(time.toFixed(0)) // rounded to 0 decimals

      const action = state.newLink.action
      if (action === 'Extend Line Upward') {
        state.editorLinks.features.push(state.newLink.features[0])
        state.editorNodes.features.push(state.newNode.features[0])
      } else if (action === 'Extend Line Downward') {
        state.editorLinks.features.splice(0, 0, state.newLink.features[0])
        state.editorNodes.features.splice(0, 0, state.newNode.features[0])
        state.editorLinks.features.forEach(link => link.properties.link_sequence += 1)
      }
    },

    deleteNode (state, payload) {
      const nodeIndex = payload.selectedNode.index
      // remove node
      state.editorNodes.features = state.editorNodes.features.filter(node => node.properties.index !== nodeIndex)
      // changing link1 change editorLinks as it is an observer.
      const link1 = state.editorLinks.features.filter(link => link.properties.b === nodeIndex)[0] // link is extented
      const link2 = state.editorLinks.features.filter(link => link.properties.a === nodeIndex)[0] // link is deleted
      // if the last or first node is selected, there is only one link. The node and the link are deleted.
      if (!link1) {
        state.editorLinks.features = state.editorLinks.features.filter(
          link => link.properties.index !== link2.properties.index)
        // a link was remove, link_sequence -1
        state.editorLinks.features.forEach(link => link.properties.link_sequence -= 1)
      } else if (!link2) {
        state.editorLinks.features = state.editorLinks.features.filter(
          link => link.properties.index !== link1.properties.index)
        // the node is inbetween 2 links. 1 link is deleted, and the other is extented.
      } else {
        link1.geometry.coordinates = [
          ...link1.geometry.coordinates.slice(0, -1),
          ...link2.geometry.coordinates.slice(1)]
        link1.properties.b = link2.properties.b
        link1.properties.length += link2.properties.length
        link1.properties.time += link2.properties.time
        // find removed link index. drop everylinks link_sequence after by 1
        const featureIndex = state.editorLinks.features.findIndex(
          link => link.properties.index === link2.properties.index)
        state.editorLinks.features.slice(featureIndex).forEach(
          link => link.properties.link_sequence -= 1)
        // delete link2
        state.editorLinks.features = state.editorLinks.features.filter(
          link => link.properties.index !== link2.properties.index)
      }
    },

    splitLink (state, payload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = state.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link1 change editorLinks as it is an observer.
      const link1 = state.editorLinks.features[featureIndex] // this link is extented
      const link2 = structuredClone(link1)
      // distance du point (entre 0 et 1) sur le lien original
      const ratio = payload.offset

      link1.properties.b = state.newNode.features[0].properties.index
      link1.geometry.coordinates = [
        ...link1.geometry.coordinates.slice(0, payload.sliceIndex),
        state.newNode.features[0].geometry.coordinates,
      ]

      link1.properties.index = 'link_' + short.generate() // link1.properties.index+ '-1'
      link1.properties.length = link1.properties.length * ratio
      link1.properties.time = link1.properties.time * ratio

      link2.properties.a = state.newNode.features[0].properties.index
      link2.geometry.coordinates = [
        state.newNode.features[0].geometry.coordinates,
        ...link2.geometry.coordinates.slice(payload.sliceIndex),
      ]
      link2.properties.index = 'link_' + short.generate() // link2.properties.index+ '-2'
      link2.properties.length = link2.properties.length * (1 - ratio)
      link2.properties.time = link2.properties.time * (1 - ratio)

      state.editorLinks.features.splice(featureIndex + 1, 0, link2)
      state.editorNodes.features.push(state.newNode.features[0])

      // add +1 to every link sequence afer link1
      const seq = link1.properties.link_sequence
      // everything after link1 except link2
      state.editorLinks.features.filter(link => link.properties.link_sequence > seq).forEach(
        link => link.properties.link_sequence += 1)
      // add link2 sequence after.
      link2.properties.link_sequence += 1
    },

    addNodeInline (state, payload) {
      // payload contain selectedLink and event.lngLat (clicked point)
      let linkGeom = state.editorLinks.features.filter((link) => link.properties.index === payload.selectedLink.index)
      const nodeCopyId = linkGeom[0].properties.a
      linkGeom = Linestring(linkGeom[0].geometry.coordinates)
      const clickedPoint = Point(Object.values(payload.lngLat))
      const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
      const dist = length(linkGeom, { units: 'kilometers' }) // dist
      // for multiString, gives the index of the closest one, add +1 for the slice.
      const sliceIndex = snapped.properties.index + 1
      const offset = snapped.properties.location / dist
      if (payload.nodes === 'editorNodes') {
        this.commit('setNewNode', { coordinates: snapped.geometry.coordinates, nodeCopyId: nodeCopyId })
        this.commit('splitLink', { selectedLink: payload.selectedLink, offset: offset, sliceIndex: sliceIndex })
      // Anchor Nodes
      } else {
        this.commit('addAnchorNode', {
          selectedLink: payload.selectedLink,
          coordinates: snapped.geometry.coordinates,
          sliceIndex: sliceIndex,
        })
      }

      // this.commit('setNewNode', null) // init new node to null
    },
    addAnchorNode (state, payload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = state.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change editorLinks as it is an observer.
      const link = state.editorLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },
    deleteAnchorNode (state, payload) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = state.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },
    moveAnchor (state, payload) {
      const linkIndex = payload.selectedNode.properties.linkIndex
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = state.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      const distance = length(link)
      link.properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / state.linkSpeed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },

    moveNode (state, payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // remove node
      const newNode = state.editorNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = payload.lngLat

      // changing links
      const link1 = state.editorLinks.features.filter(link => link.properties.b === nodeIndex)[0]
      const link2 = state.editorLinks.features.filter(link => link.properties.a === nodeIndex)[0]
      // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
      if (link1) {
        // note: props are unchanged. even tho the length change, the time and length are unchanged.
        link1.geometry.coordinates = [...link1.geometry.coordinates.slice(0, -1), payload.lngLat]
        // update time and distance
        const distance = length(link1)
        link1.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / state.linkSpeed * 3600 // 20kmh hard code speed. time in secs
        link1.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      }
      if (link2) {
        link2.geometry.coordinates = [payload.lngLat, ...link2.geometry.coordinates.slice(1)]
        // update time and distance
        const distance = length(link2)
        link2.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / state.linkSpeed * 3600 // 20kmh hard code speed. time in secs
        link2.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      }
    },

    cutLineFromNode (state, payload) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      state.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete = []
      for (const [i, link] of state.editorLinks.features.entries()) {
        if (link.properties.b === nodeId) {
          toDelete = state.editorLinks.features.slice(i + 1)
          break
        }
      }
      // Delete links
      state.editorLinks.features = state.editorLinks.features.filter(item => !toDelete.includes(item))
      this.commit('getEditorNodes', { nodes: state.editorNodes })
    },

    cutLineAtNode (state, payload) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      state.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete = []
      for (const [i, link] of state.editorLinks.features.entries()) {
        if (link.properties.a === nodeId) {
          toDelete = state.editorLinks.features.slice(0, i)
          break
        }
      }
      // Delete links
      state.editorLinks.features = state.editorLinks.features.filter(item => !toDelete.includes(item))
      this.commit('getEditorNodes', { nodes: state.editorNodes })
    },

    editLineInfo (state, payload) {
      state.editorLineInfo = payload
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(payload).filter(key =>
        ((payload[key].value !== '') || !payload[key].placeholder) && (!payload[key].disabled))
      // add new line info to each links of each trips.
      state.editorLinks.features.forEach(
        (features) => props.forEach((key) => features.properties[key] = payload[key].value))
    },

    editLinkInfo (state, payload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedLinkId, info } = payload
      const props = Object.keys(info)
      state.editorLinks.features.filter(
        function (link) {
          if (link.properties.index === selectedLinkId) {
            props.forEach((key) => link.properties[key] = info[key].value)
          }
        },
      )
      this.commit('getEditorLineInfo')
    },

    editNodeInfo (state, payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedNodeId, info } = payload
      const props = Object.keys(info)
      state.editorNodes.features.filter(
        // eslint-disable-next-line array-callback-return
        function (node) {
          if (node.properties.index === selectedNodeId) {
            props.forEach((key) => node.properties[key] = info[key].value)
          }
        },
      )
    },

    appendNewLinks (state, payload) {
      // append new links and node to the project (import page)
      payload.links.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
        points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
      payload.nodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
        coord => Math.round(Number(coord) * 1000000) / 1000000))

      // state.links.features.push(...payload.links.features) will crash with large array (stack size limit)
      payload.links.features.forEach(link => state.links.features.push(link))
      payload.nodes.features.forEach(node => state.nodes.features.push(node))
      this.commit('applyPropertiesTypes')
      this.commit('getLinksProperties')
      this.commit('getNodesProperties')
      this.commit('getTripId')
      this.commit('changeSelectedTrips', state.tripId)
    },

    editGroupInfo (state, payload) {
      // edit line info on multiple trips at once.
      const editorGroupInfo = payload.info
      const groupTripIds = payload.groupTripIds
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(editorGroupInfo).filter(key =>
        ((editorGroupInfo[key].value !== '') || !editorGroupInfo[key].placeholder))
      // add new line info to each links of each trips.
      const tempLinks = state.links.features.filter(link => groupTripIds.includes(link.properties.trip_id))
      tempLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = editorGroupInfo[key].value))
      // get tripId list
      this.commit('getTripId')
    },
    deleteUnusedNodes (state) {
      // delete every every nodes not in links
      const a = state.links.features.map(item => item.properties.a)
      const b = state.links.features.map(item => item.properties.b)
      const nodesInLinks = new Set([...a, ...b])
      state.nodes.features = state.nodes.features.filter(node => nodesInLinks.has(node.properties.index))
    },

    confirmChanges (state) { // apply change to Links
      const filtered = { ...state.links }

      filtered.features = filtered.features.filter(link => link.properties.trip_id === state.editorTrip)
      const toDelete = filtered.features.filter(item => !state.editorLinks.features.includes(item))
      // find index of soon to be deleted links
      if (state.tripId.includes(state.editorTrip)) {
        // eslint-disable-next-line no-var
        var index = state.links.features.findIndex(link => link.properties.trip_id === state.editorTrip)
      } else {
        // eslint-disable-next-line no-var, no-redeclare
        var index = 0
      }
      // delete links that were edited.
      state.links.features = state.links.features.filter(item => !toDelete.includes(item))
      // add edited links to links.

      state.links.features.splice(index, 0, ...state.editorLinks.features)
      // all new nodes.
      const nodesList = state.nodes.features.map(item => item.properties.index)
      const newNodes = { ...state.editorNodes }
      newNodes.features = newNodes.features.filter(node => !nodesList.includes(node.properties.index))
      state.nodes.features.push(...newNodes.features)

      // for each editor nodes, apply new properties.
      state.nodes.features.filter(
        function (node) {
          state.editorNodes.features.forEach(
            function (eNode) {
              if (node.properties.index === eNode.properties.index) {
                node.properties = eNode.properties
                node.geometry = eNode.geometry
              }
            })
        })

      // delete every every nodes not in links
      this.commit('deleteUnusedNodes')

      // For every Links containing an editor Nodes. update Geometry.
      // (this is necessary when we move a node that is share between multiplde lines)
      // get a list of all links (excluding editorLinks) that contain the selected node
      const editorNodesList = new Set(state.editorNodes.features.map(item => item.properties.index))
      // get list of link with a node A modifieed
      const linksA = state.links.features.filter(
        link => link.properties.trip_id !== state.editorTrip).filter(
        item => editorNodesList.has(item.properties.a))
      // apply new node geometry
      linksA.forEach(link => link.geometry.coordinates = [
        state.editorNodes.features.filter(node => node.properties.index === link.properties.a)[0].geometry.coordinates,
        ...link.geometry.coordinates.slice(1),
      ])
      // same for nodes b
      const linksB = state.links.features.filter(
        link => link.properties.trip_id !== state.editorTrip).filter(
        item => editorNodesList.has(item.properties.b))
      linksB.forEach(link => link.geometry.coordinates = [
        ...link.geometry.coordinates.slice(0, -1),
        state.editorNodes.features.filter(node => node.properties.index === link.properties.b)[0].geometry.coordinates,
      ])

      state.newLink = {}
      state.newNode = {}

      // get tripId list
      this.commit('getTripId')
      this.commit('getLinksProperties')
    },

    deleteTrip (state, payload) {
      // payload = a single trip_id or a list or trips_id
      // if its a list : delete all of them. else: delete single trip
      if (typeof payload === 'object') {
        state.links.features = state.links.features.filter(link => !payload.includes(link.properties.trip_id))
      } else {
        state.links.features = state.links.features.filter(link => link.properties.trip_id !== payload)
      }
      // delete every every nodes not in links
      this.commit('deleteUnusedNodes')
      // get tripId list
      this.commit('getTripId')
    },
    applyPropertiesTypes (state) {
      state.defaultAttributes.forEach(attr => {
        if (attr.type === 'String') {
          state.links.features.forEach(link => link.properties[attr.name] = String(link.properties[attr.name]))
        } else if (attr.type === 'Number') {
          state.links.features.forEach(link => link.properties[attr.name] = Number(link.properties[attr.name]))
        }
      })
    },
  },

  getters: {
    links: (state) => state.links,
    nodes: (state) => state.nodes,
    linkSpeed: (state) => state.linkSpeed,
    linksIsEmpty: (state) => state.links.features.length === 0,
    route_id: (state) => state.route_id,
    editorTrip: (state) => state.editorTrip,
    editorLinks: (state) => state.editorLinks,
    editorNodes: (state) => state.editorNodes,
    tripId: (state) => state.tripId,
    selectedTrips: (state) => state.selectedTrips,
    editorLineInfo: (state) => state.editorLineInfo,
    newLink: (state) => state.newLink,
    newNode: (state) => state.newNode,
    firstNodeId: (state) => state.editorNodes.features.length > 1
      ? state.editorLinks.features[0].properties.a
      : state.editorNodes.features[0].properties.index,
    lastNodeId: (state) => state.editorNodes.features.length > 1
      ? state.editorLinks.features.slice(-1)[0].properties.b
      : state.editorNodes.features[0].properties.index,
    firstNode: (state, getters) => state.editorTrip
      ? state.editorNodes.features.filter(
        (node) => node.properties.index === getters.firstNodeId)[0]
      : null,
    lastNode: (state, getters) => state.editorTrip
      ? state.editorNodes.features.filter(
        (node) => node.properties.index === getters.lastNodeId)[0]
      : null,
    lineAttributes: (state) => state.lineAttributes.sort(),
    nodeAttributes: (state) => state.nodeAttributes,
    changeBounds: (state) => state.changeBounds,
    nodesHeader: (state) => state.nodesHeader,
    linksHeader: (state) => state.linksHeader,
    anchorNodes: (state) => {
      const nodes = structuredClone(state.nodesHeader)
      state.editorLinks.features.filter(link => link.geometry.coordinates.length > 2).forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.geometry.coordinates.slice(1, -1).forEach(
            (point, idx) => nodes.features.push({
              properties: { index: short.generate(), linkIndex: linkIndex, coordinatedIndex: idx + 1 },
              geometry: { coordinates: point, type: 'Point' },
            }),
          )
        },
      )

      return nodes
    },
    // this return the attribute type, of undefined.
    attributeType: (state) => (name) => state.defaultAttributes.filter(attr => attr.name === name)[0]?.type,
  },
}
