/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore } from 'pinia'

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'
import { serializer } from '@comp/utils/serializer.js'
import { IndexAreDifferent } from '@comp/utils/utils.js'
import { cloneDeep } from 'lodash'
import { ref } from 'vue'
import short from 'short-uuid'
import geojson from '@constants/geojson'
const $gettext = s => s

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: ref({}),
    editorTrip: null,
    editorNodes: {},
    editorLinks: {},
    editorLineInfo: {},
    nodes: ref({}),
    tripId: [],
    selectedTrips: [],
    newLink: {},
    newNode: {},
    changeBounds: true,
    linksDefaultColor: '2196F3',
    lineAttributes: [],
    nodeAttributes: [],
    linksAttributesChoices: {},
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
      { name: 'speed', type: 'Number' }, // float
      { name: 'headway', type: 'Number' }, // float
      { name: 'route_width', type: 'Number' }, // float
      { name: 'pickup_type', type: 'Number' }, // float
      { name: 'drop_off_type', type: 'Number' }, // int
      { name: 'link_sequence', type: 'Number' }, // int
      { name: 'direction_id', type: 'Number' }, // int
    ],
  }),

  actions: {
    initLinks () {
      this.linksAttributesChoices = {}
      this.lineAttributes = []
      this.nodeAttributes = []
    },
    loadLinks (payload) {
      this.links = cloneDeep(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(this.links.crs.properties.name)) {
        this.editorLinks = cloneDeep(geojson)
        // limit geometry precision to 6 digit
        this.links.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        this.applyPropertiesTypes(this.links)
        this.getTripId()

        // set all trips visible
        this.changeSelectedTrips(this.tripId)

        this.getLinksProperties()
        this.calcSpeed()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadNodes (payload) {
      this.nodes = cloneDeep(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(this.nodes.crs.properties.name)) {
        this.editorNodes = cloneDeep(geojson)
        // limit geometry precision to 6 digit
        this.nodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        this.getNodesProperties()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },
    unloadFiles () {
      // when we reload files (some were already loaded.)
      this.links.features = []
      this.nodes.features = []
      this.editorTrip = null
      this.tripId = []
      this.selectedTrips = []
    },
    loadPTFiles (payload) {
      // payload = [{path,content}, ...]
      // get links. check that index are not duplicated, serialize them and then append to project
      // get nodes. check that index are not duplicated, serialize them and then append to project

      for (const file of payload) {
        if (file.content.features.length === 0) { break } // empty file. do nothing
        const currentType = file.content.features[0].geometry.type
        if (currentType === 'LineString') {
          if (IndexAreDifferent(file.content, this.links)) {
            this.appendNewLinks(serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        } else if (currentType === 'Point') {
          if (IndexAreDifferent(file.content, this.nodes)) {
            this.appendNewNodes(serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        }
      }
    },

    appendNewLinks (payload) {
      // append new links to the project. payload = links geojson file
      payload.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
        points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))

      // this.links.features.push(...payload.links.features) will crash with large array (stack size limit)
      payload.features.forEach(link => this.links.features.push(link))
      this.applyPropertiesTypes(this.links)
      this.getLinksProperties()
      this.getTripId()
      this.changeSelectedTrips(this.tripId)
      this.calcSpeed()
    },
    appendNewNodes (payload) {
      // append new nodes to the project. payload = nodes geojson file
      payload.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
        coord => Math.round(Number(coord) * 1000000) / 1000000))

      payload.features.forEach(node => this.nodes.features.push(node))
      this.getNodesProperties()
    },

    getLinksProperties () {
      let header = new Set([])
      this.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // header.delete('index')
      // add all default attributes
      const defaultAttributes = this.defaultAttributes.map(attr => attr.name)
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      this.lineAttributes = header
    },

    getNodesProperties () {
      let header = new Set([])
      this.nodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index',
        'stop_code',
        'stop_name']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      this.nodeAttributes = header
    },
    calcSpeed () {
      // calc length, time, speed.
      this.links.features.forEach(link => {
        // calc length from geometry length
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        // if speed is provided. calc time with it
        if (link.properties.speed) {
          const time = distance / link.properties.speed * 3600
          link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
          // if no speed but time is provided. calc speed with it.
        } else if (link.properties.time) {
          const speed = link.properties.length / link.properties.time * 3.6
          link.properties.speed = Number((speed).toFixed(6))
          // no time or speed. fix speed to 20kmh and calc time with this.
        } else {
          const speed = 20 // kmh
          link.properties.speed = speed
          const time = distance / speed * 3600 // secs
          link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
        }
      })
    },
    loadLinksAttributesChoices (payload) {
      // eslint-disable-next-line no-return-assign
      Object.keys(payload).forEach(key => this.linksAttributesChoices[key] = payload[key])
      const attrs = Object.keys(this.linksAttributesChoices) // all attrbutes in attributesChoices
      const newAttrs = attrs.filter(item => !this.lineAttributes.includes(item)) // ones not in rlinks
      newAttrs.forEach(item => this.addPropertie({ table: 'links', name: item }))
    },

    addPropertie (payload) {
      // when a new line properties is added (in dataframe page)
      if (payload.table === 'links') {
        this.links.features.map(link => link.properties[payload.name] = null)
        this.editorLinks.features.map(link => link.properties[payload.name] = null)
        this.lineAttributes.push(payload.name) // could put that at applied. so we can cancel
      } else {
        this.nodes.features.map(node => node.properties[payload.name] = null)
        this.editorNodes.features.map(node => node.properties[payload.name] = null)
      }
    },
    deletePropertie (payload) {
      // when a link property is deleted
      if (payload.table === 'links') {
        this.links.features.filter(link => delete link.properties[payload.name])
        this.editorLinks.features.filter(link => delete link.properties[payload.name])
        this.lineAttributes = this.lineAttributes.filter(item => item !== payload.name)
      } else {
        this.nodes.features.filter(node => delete node.properties[payload.name])
        this.editorNodes.features.filter(node => delete node.properties[payload.name])
      }
    },
    changeSelectedTrips (payload) {
      // trips list of visible trip_id.
      this.selectedTrips = payload
    },

    setEditorTrip (payload) {
      // set Trip Id
      this.editorTrip = payload.tripId
      this.changeBounds = payload.changeBounds
      // set editor links corresponding to trip id
      // var filtered = {...this.links}
      const features = this.links.features.filter(link => link.properties.trip_id === this.editorTrip)
      this.editorLinks.features = cloneDeep(features)

      // get the corresponding nodes
      this.getEditorNodes({ nodes: this.nodes })

      this.getEditorLineInfo()
    },

    cloneTrip (payload) {
      // clone and reversed a trip.
      const cloned = cloneDeep(geojson)
      const features = this.links.features.filter(link => link.properties.trip_id === payload.tripId)
      cloned.features = cloneDeep(features)

      let linkSequence = cloned.features.length
      for (const link of cloned.features) {
        if (payload.reverse) {
          // mettre dans l'autre sens » inverser 0 et 1 et leur coordonées
          link.geometry.coordinates.reverse()
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
        }
        // change tripId.
        link.properties.trip_id = payload.name
        // change index name
        link.properties.index = 'link_' + short.generate()
      }
      // inverser l'ordre des features
      cloned.features.reverse()
      if (payload.cloneNodes) {
      // duplicate nodes and rename them
        const a = cloned.features.map(item => item.properties.a)
        const b = cloned.features.map(item => item.properties.b)
        const ab = new Set([...a, ...b])

        const clonedNodes = cloneDeep(geojson)
        const features = this.nodes.features.filter(node => ab.has(node.properties.index))
        clonedNodes.features = cloneDeep(features)

        const newName = {}
        ab.forEach(node => newName[node] = 'node_' + short.generate())
        clonedNodes.features.forEach(node => node.properties.index = newName[node.properties.index])

        cloned.features.forEach(link => link.properties.a = newName[link.properties.a])
        cloned.features.forEach(link => link.properties.b = newName[link.properties.b])

        this.nodes.features.push(...clonedNodes.features)
      }
      // push cloned links and nodes
      this.links.features.push(...cloned.features)

      this.getTripId()
    },
    getEditorNodes (payload) {
      // payload contain nodes. this.nodes or this.editorNodes
      // find the nodes in the editor links
      const a = this.editorLinks.features.map(item => item.properties.a)
      const b = this.editorLinks.features.map(item => item.properties.b)
      const editorNodesList = new Set([...a, ...b])
      // set nodes corresponding to trip id

      const features = payload.nodes.features.filter(node => editorNodesList.has(node.properties.index))
      this.editorNodes.features = cloneDeep(features)
    },

    getEditorLineInfo () {
      const form = {}
      const uneditable = ['index', 'length', 'time', 'a', 'b', 'link_sequence']
      // empty trip, when its a newLine
      if (this.editorLinks.features.length === 0) {
        const defaultValue = {
          agency_id: 'QUENEDI',
          route_id: 'Q1',
          route_short_name: 'Q1',
          route_type: 'quenedi',
          route_color: this.linksDefaultColor,
          route_width: 3,
          headway: 600,
          pickup_type: 0,
          drop_off_type: 0,
          direction_id: 0,
          speed: 20,
        }

        this.lineAttributes.forEach(key => {
          form[key] = {
            value: defaultValue[key],
            disabled: uneditable.includes(key),
            placeholder: false,
          }
        })

        form.trip_id = { value: this.editorTrip, disabled: false, placeholder: false }
      } else {
        const features = this.editorLinks.features

        this.lineAttributes.forEach(key => {
          const val = new Set(features.map(link => link.properties[key]))
          form[key] = {
            value: val.size > 1 ? '' : [...val][0],
            disabled: uneditable.includes(key),
            placeholder: val.size > 1,
          }
        })
      }
      this.editorLineInfo = form
    },

    getTripId () {
      this.tripId = Array.from(new Set(this.links.features.map(item => item.properties.trip_id)))
    },

    setNewLink (payload) {
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
      let tempLink = cloneDeep(this.editorLinks.features)
      // if there is no link to copy, create one. (new Line)
      if (tempLink.length === 0) {
        // copy Line properties.
        const linkProperties = {}
        Object.keys(this.editorLineInfo).forEach((key) => {
          linkProperties[key] = this.editorLineInfo[key].value
        })
        // set default links values
        const defaultValue = {
          index: 'link_' + short.generate(),
          a: this.editorNodes.features[0].properties.index,
          b: this.editorNodes.features[0].properties.index,
          length: null,
          time: null,
          pickup_type: 0,
          drop_off_type: 0,
          link_sequence: 0,
        }
        Object.keys(defaultValue).forEach((key) => {
          linkProperties[key] = defaultValue[key]
        })
        const geom = cloneDeep(this.editorNodes.features[0].geometry.coordinates)
        const linkGeometry = {
          coordinates: [geom, geom],
          type: 'LineString',
        }
        const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
        tempLink = [linkFeature]
      }

      if (payload.action === 'Extend Line Upward') {
        // Take last link and copy properties
        // eslint-disable-next-line no-var
        var features = tempLink[tempLink.length - 1]
        Object.assign(features.properties, uncopiedPropeties)
        // sequence +1
        features.properties.link_sequence = features.properties.link_sequence + 1
        // replace node a by b and delete node a
        features.properties.a = features.properties.b
        features.geometry.coordinates[0] = cloneDeep(features.geometry.coordinates.slice(-1)[0])
        // new node index (hash)
        payload.nodeCopyId = features.properties.a
        this.setNewNode(payload)

        features.properties.b = this.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
      } else if (payload.action === 'Extend Line Downward') {
        // Take first link and copy properties
        // eslint-disable-next-line no-var, no-redeclare
        var features = tempLink[0]
        Object.assign(features.properties, uncopiedPropeties)
        // sequence + 1
        features.properties.link_sequence = features.properties.link_sequence - 1
        //  replace node b by a and delete node b
        features.properties.b = features.properties.a
        features.geometry.coordinates[1] = cloneDeep(features.geometry.coordinates[0])
        // new node index (hash)
        payload.nodeCopyId = features.properties.b
        this.setNewNode(payload)
        features.properties.a = this.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
      }
      this.newLink = cloneDeep(geojson)
      this.newLink.features = [features]
      this.newLink.action = payload.action
    },
    createNewNode (payload) {
      const nodeProperties = {}
      this.nodeAttributes.forEach(key => {
        nodeProperties[key] = null
      })
      nodeProperties.index = 'node_' + short.generate()
      const nodeGeometry = {
        coordinates: payload,
        type: 'Point',
      }
      // Copy specified nodenewNode
      const nodeFeatures = { geometry: nodeGeometry, properties: nodeProperties, type: 'Feature' }
      this.editorNodes.features = [nodeFeatures]
    },

    setNewNode (payload) {
      const { coordinates = [null, null] } = payload
      const uncopiedPropeties = {}
      this.nodeAttributes.forEach(key => {
        uncopiedPropeties[key] = null
      })
      // Copy specified node
      const tempNode = cloneDeep(this.editorNodes)
      const features = tempNode.features.filter(node => node.properties.index === payload.nodeCopyId)[0]
      Object.assign(features.properties, uncopiedPropeties)
      features.properties.index = 'node_' + short.generate()
      features.geometry.coordinates = coordinates
      tempNode.features = [features]
      this.newNode = tempNode
    },

    editNewLink (payload) {
      // for realtime viz. this method change the linestring to the payload (mouse position)
      this.newNode.features[0].geometry.coordinates = payload
      if (this.newLink.action === 'Extend Line Upward') {
        this.newLink.features[0].geometry.coordinates = [this.newLink.features[0].geometry.coordinates[0], payload]
      } else {
        this.newLink.features[0].geometry.coordinates = [payload, this.newLink.features[0].geometry.coordinates[1]]
      }
    },

    applyNewLink (payload) {
      // nodeId: this.selectedNodeId, geom: pointGeom, action: Extend Line Upward
      // get linestring length in km
      this.setNewLink({ action: payload.action })
      this.editNewLink(payload.geom)

      const distance = length(this.newLink)
      this.newLink.features[0].properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / this.newLink.features[0].properties.speed * 3600 // 20kmh hard code speed. time in secs

      this.newLink.features[0].properties.time = Number(time.toFixed(0)) // rounded to 0 decimals

      const action = this.newLink.action
      if (action === 'Extend Line Upward') {
        this.editorLinks.features.push(this.newLink.features[0])
        this.editorNodes.features.push(this.newNode.features[0])
      } else if (action === 'Extend Line Downward') {
        this.editorLinks.features.splice(0, 0, this.newLink.features[0])
        this.editorNodes.features.splice(0, 0, this.newNode.features[0])
        this.editorLinks.features.forEach(link => link.properties.link_sequence += 1)
      }
    },

    deleteNode (payload) {
      const nodeIndex = payload.selectedNode.index
      // remove node
      this.editorNodes.features = this.editorNodes.features.filter(node => node.properties.index !== nodeIndex)
      // changing link1 change editorLinks as it is an observer.
      const link1 = this.editorLinks.features.filter(link => link.properties.b === nodeIndex)[0] // link is extented
      const link2 = this.editorLinks.features.filter(link => link.properties.a === nodeIndex)[0] // link is deleted
      // if the last or first node is selected, there is only one link. The node and the link are deleted.
      if (!link1) {
        this.editorLinks.features = this.editorLinks.features.filter(
          link => link.properties.index !== link2.properties.index)
        // a link was remove, link_sequence -1
        this.editorLinks.features.forEach(link => link.properties.link_sequence -= 1)
      } else if (!link2) {
        this.editorLinks.features = this.editorLinks.features.filter(
          link => link.properties.index !== link1.properties.index)
        // the node is inbetween 2 links. 1 link is deleted, and the other is extented.
      } else {
        link1.geometry.coordinates = [
          ...link1.geometry.coordinates.slice(0, -1),
          ...link2.geometry.coordinates.slice(1)]
        link1.properties.b = link2.properties.b
        link1.properties.length = Number(link1.properties.length) + Number(link2.properties.length)
        link1.properties.time = Number(link1.properties.time) + Number(link2.properties.time)
        link1.properties.speed = Number(link1.properties.length / link1.properties.time * 3.6)
        // find removed link index. drop everylinks link_sequence after by 1
        const featureIndex = this.editorLinks.features.findIndex(
          link => link.properties.index === link2.properties.index)
        this.editorLinks.features.slice(featureIndex).forEach(
          link => link.properties.link_sequence -= 1)
        // delete link2
        this.editorLinks.features = this.editorLinks.features.filter(
          link => link.properties.index !== link2.properties.index)
      }
    },

    splitLink (payload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link1 change editorLinks as it is an observer.
      const link1 = this.editorLinks.features[featureIndex] // this link is extented
      const link2 = cloneDeep(link1)
      // distance du point (entre 0 et 1) sur le lien original
      const ratio = payload.offset

      link1.properties.b = this.newNode.features[0].properties.index
      link1.geometry.coordinates = [
        ...link1.geometry.coordinates.slice(0, payload.sliceIndex),
        this.newNode.features[0].geometry.coordinates,
      ]

      link1.properties.index = 'link_' + short.generate() // link1.properties.index+ '-1'
      link1.properties.length = link1.properties.length * ratio
      link1.properties.time = link1.properties.time * ratio

      link2.properties.a = this.newNode.features[0].properties.index
      link2.geometry.coordinates = [
        this.newNode.features[0].geometry.coordinates,
        ...link2.geometry.coordinates.slice(payload.sliceIndex),
      ]
      link2.properties.index = 'link_' + short.generate() // link2.properties.index+ '-2'
      link2.properties.length = link2.properties.length * (1 - ratio)
      link2.properties.time = link2.properties.time * (1 - ratio)

      this.editorLinks.features.splice(featureIndex + 1, 0, link2)
      this.editorNodes.features.push(this.newNode.features[0])

      // add +1 to every link sequence afer link1
      const seq = link1.properties.link_sequence
      // everything after link1 except link2
      this.editorLinks.features.filter(link => link.properties.link_sequence > seq).forEach(
        link => link.properties.link_sequence += 1)
      // add link2 sequence after.
      link2.properties.link_sequence += 1
    },

    addNodeInline (payload) {
      // payload contain selectedLink and event.lngLat (clicked point)
      let linkGeom = this.editorLinks.features.filter((link) => link.properties.index === payload.selectedLink.index)
      const nodeCopyId = linkGeom[0].properties.a
      linkGeom = Linestring(linkGeom[0].geometry.coordinates)
      const clickedPoint = Point(Object.values(payload.lngLat))
      const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
      const dist = length(linkGeom, { units: 'kilometers' }) // dist
      // for multiString, gives the index of the closest one, add +1 for the slice.
      const sliceIndex = snapped.properties.index + 1
      const offset = snapped.properties.location / dist
      if (payload.nodes === 'editorNodes') {
        this.setNewNode({ coordinates: snapped.geometry.coordinates, nodeCopyId })
        this.splitLink({ selectedLink: payload.selectedLink, offset, sliceIndex })
      // Anchor Nodes
      } else {
        this.addAnchorNode({
          selectedLink: payload.selectedLink,
          coordinates: snapped.geometry.coordinates,
          sliceIndex,
        })
      }

      // this.commit('setNewNode', null) // init new node to null
    },
    addAnchorNode (payload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change editorLinks as it is an observer.
      const link = this.editorLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },
    deleteAnchorNode (payload) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },
    moveAnchor (payload) {
      const linkIndex = payload.selectedNode.properties.linkIndex
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      const distance = length(link)
      link.properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / link.properties.speed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },

    moveNode (payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // change node geometry
      const newNode = this.editorNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = payload.lngLat

      // changing links
      const link1 = this.editorLinks.features.filter(link => link.properties.b === nodeIndex)[0]
      const link2 = this.editorLinks.features.filter(link => link.properties.a === nodeIndex)[0]
      // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
      if (link1) {
        // note: props are unchanged. even tho the length change, the time and length are unchanged.
        link1.geometry.coordinates[link1.geometry.coordinates.length - 1] = payload.lngLat
        // update time and distance
        const distance = length(link1)
        link1.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / link1.properties.time * 3600 // 20kmh hard code speed. time in secs
        link1.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      }
      if (link2) {
        link2.geometry.coordinates[0] = payload.lngLat
        // update time and distance
        const distance = length(link2)
        link2.properties.length = Number((distance * 1000).toFixed(0)) // metres
        const time = distance / link2.properties.time * 3600 // 20kmh hard code speed. time in secs
        link2.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      }
    },

    cutLineFromNode (payload) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete = []
      for (const [i, link] of this.editorLinks.features.entries()) {
        if (link.properties.b === nodeId) {
          toDelete = this.editorLinks.features.slice(i + 1)
          break
        }
      }
      // Delete links
      this.editorLinks.features = this.editorLinks.features.filter(item => !toDelete.includes(item))
      this.getEditorNodes({ nodes: this.editorNodes })
    },

    cutLineAtNode (payload) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete = []
      for (const [i, link] of this.editorLinks.features.entries()) {
        if (link.properties.a === nodeId) {
          toDelete = this.editorLinks.features.slice(0, i)
          break
        }
      }
      // Delete links
      this.editorLinks.features = this.editorLinks.features.filter(item => !toDelete.includes(item))
      this.getEditorNodes({ nodes: this.editorNodes })
    },

    editLineInfo (payload) {
      this.editorLineInfo = payload
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(payload).filter(key =>
        ((payload[key].value !== '') || !payload[key].placeholder) && (!payload[key].disabled))
      // add new line info to each links of each trips.
      this.editorLinks.features.forEach(
        (features) => props.forEach((key) => features.properties[key] = payload[key].value))

      // apply speed (get time on each link for the new speed.)
      if (props.includes('speed')) {
        this.editorLinks.features.forEach(
          (features) => {
            const time = features.properties.length / payload.speed.value * 3.6
            features.properties.time = Number((time).toFixed(0))
          },
        )
      }
    },

    editLinkInfo (payload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedLinkId, info } = payload
      const props = Object.keys(info)
      this.editorLinks.features.filter(
        function (link) {
          if (link.properties.index === selectedLinkId) {
            props.forEach((key) => link.properties[key] = info[key].value)
          }
        },
      )
      this.getEditorLineInfo()
    },

    editNodeInfo (payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedNodeId, info } = payload
      const props = Object.keys(info)
      this.editorNodes.features.filter(
        // eslint-disable-next-line array-callback-return
        function (node) {
          if (node.properties.index === selectedNodeId) {
            props.forEach((key) => node.properties[key] = info[key].value)
          }
        },
      )
    },

    editGroupInfo (payload) {
      // edit line info on multiple trips at once.
      const editorGroupInfo = payload.info
      const groupTripIds = payload.groupTripIds
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(editorGroupInfo).filter(key =>
        ((editorGroupInfo[key].value !== '') || !editorGroupInfo[key].placeholder))
      // add new line info to each links of each trips.
      const tempLinks = this.links.features.filter(link => groupTripIds.has(link.properties.trip_id))
      tempLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = editorGroupInfo[key].value))
      // apply speed (get time on each link for the new speed.)
      if (props.includes('speed')) {
        tempLinks.forEach(
          (features) => {
            const time = features.properties.length / editorGroupInfo.speed.value * 3.6
            features.properties.time = Number((time).toFixed(0))
          },
        )
      }
      // get tripId list
      this.getTripId()
    },
    deleteUnusedNodes () {
      // delete every every nodes not in links
      const a = this.links.features.map(item => item.properties.a)
      const b = this.links.features.map(item => item.properties.b)
      const nodesInLinks = new Set([...a, ...b])
      this.nodes.features = this.nodes.features.filter(node => nodesInLinks.has(node.properties.index))
    },

    confirmChanges () { // apply change to Links
      this.applyPropertiesTypes(this.editorLinks)

      // find index of soon to be deleted links
      let index = 0 // if new Trip, index will be 0.
      if (this.tripId.includes(this.editorTrip)) {
        index = this.links.features.findIndex(link => link.properties.trip_id === this.editorTrip)
      }
      // delete links that were edited.
      this.links.features = this.links.features.filter(link => link.properties.trip_id !== this.editorTrip)
      // add edited links to links.
      this.links.features.splice(index, 0, ...this.editorLinks.features)
      // if we delete and append, this will change the order of the geojson and create problem as
      // the order of TripID is important.

      // all new nodes.
      for (const eNode of this.editorNodes.features) {
        const filteredNode = this.nodes.features.filter((node) => node.properties.index === eNode.properties.index)
        if (filteredNode.length === 0) {
          this.nodes.features.push(eNode)
        } else {
          filteredNode[0].properties = eNode.properties
          filteredNode[0].geometry = eNode.geometry
        }
      }

      // delete every every nodes not in links
      this.deleteUnusedNodes()
      // For every Links containing an editor Nodes. update Geometry.
      // (this is necessary when we move a node that is share between multiplde lines)
      // get a list of all links (excluding editorLinks) that contain the selected node
      const editorNodesList = new Set(this.editorNodes.features.map(item => item.properties.index))
      // get list of link with a node A modifieed
      const linksA = this.links.features.filter(
        link => link.properties.trip_id !== this.editorTrip).filter(
        item => editorNodesList.has(item.properties.a))
      // apply new node geometry
      linksA.forEach(link => link.geometry.coordinates = [
        this.editorNodes.features.filter(node => node.properties.index === link.properties.a)[0].geometry.coordinates,
        ...link.geometry.coordinates.slice(1),
      ])
      // same for nodes b
      const linksB = this.links.features.filter(
        link => link.properties.trip_id !== this.editorTrip).filter(
        item => editorNodesList.has(item.properties.b))
      linksB.forEach(link => link.geometry.coordinates = [
        ...link.geometry.coordinates.slice(0, -1),
        this.editorNodes.features.filter(node => node.properties.index === link.properties.b)[0].geometry.coordinates,
      ])
      this.newLink = {}
      this.newNode = {}
      // get tripId list
      this.getTripId()
      this.getLinksProperties()
    },

    deleteTrip (payload) {
      // payload = a single trip_id or a list or trips_id
      // if its a list : delete all of them. else: delete single trip
      if (typeof payload === 'object') {
        this.links.features = this.links.features.filter(link => !payload.includes(link.properties.trip_id))
      } else {
        this.links.features = this.links.features.filter(link => link.properties.trip_id !== payload)
      }
      // delete every every nodes not in links
      this.deleteUnusedNodes()
      // get tripId list
      this.getTripId()
    },
    applyPropertiesTypes (links) {
      for (const attr of this.defaultAttributes) {
        for (const link of links.features) {
          link.properties[attr.name] = attr.type === 'String'
            ? String(link.properties[attr.name])
            : Number(link.properties[attr.name])
        }
      }
    },
  },

  getters: {
    linksIsEmpty: (state) => state.links.features.length === 0,
    firstNodeId: (state) => state.editorNodes.features.length > 1
      ? state.editorLinks.features[0].properties.a
      : state.editorNodes.features[0].properties.index,
    lastNodeId: (state) => state.editorNodes.features.length > 1
      ? state.editorLinks.features.slice(-1)[0].properties.b
      : state.editorNodes.features[0].properties.index,
    firstNode: (state) => state.editorTrip
      ? state.editorNodes.features.filter(
        (node) => node.properties.index === state.firstNodeId)[0]
      : null,
    lastNode: (state) => state.editorTrip
      ? state.editorNodes.features.filter(
        (node) => node.properties.index === state.lastNodeId)[0]
      : null,
    anchorNodes: (state) => {
      const nodes = cloneDeep(geojson)
      state.editorLinks.features.filter(link => link.geometry.coordinates.length > 2).forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.geometry.coordinates.slice(1, -1).forEach(
            (point, idx) => nodes.features.push({
              properties: { index: short.generate(), linkIndex, coordinatedIndex: idx + 1 },
              geometry: { coordinates: point, type: 'Point' },
            }),
          )
        },
      )
      return nodes
    },
    // this return the attribute type, of undefined.
    attributeType: (state) => (name) => state.defaultAttributes.filter(attr => attr.name === name)[0]?.type,
    defaultAttributesNames: (state) => state.defaultAttributes.map(attr => attr.name),
  },
})
