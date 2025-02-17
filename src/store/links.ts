/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore } from 'pinia'

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { lineString, point as Point } from '@turf/helpers'

import { serializer, CRSis4326 } from '@comp/utils/serializer'
// eslint-disable-next-line max-len
import { IndexAreDifferent, deleteUnusedNodes, isScheduleTrip, hhmmssToSeconds, secondsTohhmmss } from '@comp/utils/utils'
import { cloneDeep } from 'lodash'
import short from 'short-uuid'
import { AddNodeInlinePayload, AnchorPayload, AttributesChoice,
  CloneTrip, EditGroupPayload, EditLinkPayload, EditNewLinkPayload, LinksAction,
  LinksStore, MoveNode, NewAttribute, NewLinkPayload, NewNodePayload,
  FilesPayload, SelectedNode, SplitLinkPayload, StickyNodePayload } from '@src/types/typesStore'
import { baseLineString, basePoint, LineStringFeatures,
  LineStringGeoJson, LineStringGeometry, PointFeatures, PointGeoJson, PointGeometry } from '@src/types/geojson'
import { GroupForm } from '@src/types/components'
const $gettext = (s: string) => s

export const useLinksStore = defineStore('links', {
  state: (): LinksStore => ({
    links: baseLineString,
    nodes: basePoint,
    visibleNodes: basePoint,
    editorNodes: basePoint,
    editorLinks: baseLineString,
    editorTrip: null,
    defaultLink: baseLineString,
    tripId: [],
    scheduledTrips: new Set([]),
    selectedTrips: [],
    newLink: baseLineString,
    newNode: basePoint,
    connectedLinks: { a: [], b: [], anchor: [] },
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
      // { name: 'anchors', type: 'Array' }, // list
    ],
  }),

  actions: {
    initLinks () {
      this.linksAttributesChoices = {}
      this.lineAttributes = []
      this.nodeAttributes = []
    },
    loadLinks (payload: LineStringGeoJson) {
      this.links = cloneDeep(payload)
      this.editorLinks = cloneDeep(baseLineString)
      if (CRSis4326(this.links)) {
        // limit geometry precision to 6 digit
        this.links.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(coord * 1000000) / 1000000)))

        this.applyPropertiesTypes(this.links)
        this.getTripId()

        // set all trips visible
        this.changeSelectedTrips(this.tripId)

        this.getLinksProperties()
        this.calcSpeed()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadNodes (payload: PointGeoJson) {
      this.nodes = cloneDeep(payload)
      this.editorNodes = cloneDeep(basePoint)
      if (CRSis4326(this.nodes)) {
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
    loadPTFiles (payload: FilesPayload[]) {
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

    appendNewLinks (payload: LineStringGeoJson) {
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
    appendNewNodes (payload: PointGeoJson) {
      // append new nodes to the project. payload = nodes geojson file
      payload.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
        coord => Math.round(Number(coord) * 1000000) / 1000000))

      payload.features.forEach(node => this.nodes.features.push(node))
      this.getNodesProperties()
    },

    getLinksProperties () {
      const header: Set<string> = new Set([])
      this.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // header.delete('index')
      // add all default attributes
      const defaultAttributes = this.defaultAttributes.map(attr => attr.name)
      defaultAttributes.forEach(att => header.add(att))
      this.lineAttributes = Array.from(header)
    },

    getNodesProperties () {
      const header: Set<string> = new Set([])
      this.nodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index',
        'stop_code',
        'stop_name']
      defaultAttributes.forEach(att => header.add(att))
      this.nodeAttributes = Array.from(header)
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

    calcLengthTime(link: LineStringFeatures) {
      const distance = length(link)
      link.properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / link.properties.speed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },

    loadLinksAttributesChoices (payload: AttributesChoice) {
      // eslint-disable-next-line no-return-assign
      Object.keys(payload).forEach(key => this.linksAttributesChoices[key] = payload[key])
      const attrs = Object.keys(this.linksAttributesChoices) // all attrbutes in attributesChoices
      const newAttrs = attrs.filter(item => !this.lineAttributes.includes(item)) // ones not in rlinks
      newAttrs.forEach(item => this.addLinksPropertie({ name: item }))
    },

    addLinksPropertie (payload: NewAttribute) {
      // when a new line properties is added (in dataframe page)
      this.links.features.map(link => link.properties[payload.name] = null)
      this.editorLinks.features.map(link => link.properties[payload.name] = null)
      this.lineAttributes.push(payload.name)
    },

    addNodesPropertie (payload: NewAttribute) {
      this.nodes.features.map(node => node.properties[payload.name] = null)
      this.editorNodes.features.map(node => node.properties[payload.name] = null)
      this.nodeAttributes.push(payload.name)
    },

    deleteLinksPropertie (payload: NewAttribute) {
      this.links.features.filter(link => delete link.properties[payload.name])
      this.editorLinks.features.filter(link => delete link.properties[payload.name])
      this.lineAttributes = this.lineAttributes.filter(item => item !== payload.name)
    },
    deleteEditorLinksPropertie (payload: NewAttribute) {
      this.editorLinks.features.filter(link => delete link.properties[payload.name])
    },

    deleteNodesPropertie (payload: NewAttribute) {
      this.nodes.features.filter(node => delete node.properties[payload.name])
      this.editorNodes.features.filter(node => delete node.properties[payload.name])
      this.nodeAttributes = this.nodeAttributes.filter(item => item !== payload.name)
    },

    changeSelectedTrips (payload: string[]) {
      // trips list of visible trip_id.
      this.selectedTrips = payload
    },

    setEditorTrip (selectedTrip: string | null) {
      // set Trip Id
      this.editorTrip = selectedTrip
      // set editor links corresponding to trip id
      const features = this.links.features.filter(link => link.properties.trip_id === this.editorTrip)
      this.editorLinks.features = cloneDeep(features)

      // sort with sequence. we assume it is sort and action will place links in the correct order
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      // get the corresponding nodes
      this.getEditorNodes(this.nodes)

      this.getDefaultLink()
    },

    editEditorLinksInfo (payload: Record<string, any>) {
      if (this.editorLinks.features.length === payload.length) {
        for (let i = 0; i < payload.length; i++) {
          let keys = Object.keys(payload[i])
          keys.forEach(key => this.editorLinks.features[i].properties[key] = payload[i][key])
        }
      } else {
        console.error('Payload length should be same length as editorLinks.features')
      }
    },

    setVisibleNodes(payload: PointGeoJson) {
      this.visibleNodes = payload
    },

    cloneTrip (payload: CloneTrip) {
      // clone and reversed a trip.
      const cloned = cloneDeep(baseLineString)
      const features = this.links.features.filter(link => link.properties.trip_id === payload.tripId)
      cloned.features = cloneDeep(features)

      // change tripId.
      cloned.features.forEach(link => link.properties.trip_id = payload.name)
      // change index name
      cloned.features.forEach(link => link.properties.index = 'link_' + short.generate())

      if (payload.reverse) {
        // sort links by sequence by inverse link_sequece
        cloned.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
        cloned.features.reverse()
        let linkSequence = 1
        // inverser l'ordre des features
        for (const link of cloned.features) {
          // mettre dans l'autre sens » inverser 0 et 1 et leur coordonées
          link.geometry.coordinates.reverse()
          // inverser node a et b (propriétés)
          link.properties.a = [link.properties.b, link.properties.b = link.properties.a][0]
          // changer le link-sequence de tous les objets
          link.properties.link_sequence = linkSequence
          linkSequence += 1
          // changer la direction
          if (link.properties.direction_id === 0) {
            link.properties.direction_id = 1
          } else {
            link.properties.direction_id = 0
          }
        }
        // If schedule trip, rebuilt schedule
        // TODO: refactoring
        if (isScheduleTrip(cloned.features[0])) {
          for (let i = 0; i < cloned.features[0].properties.departures.length; i++) {
            let dwellTimes = []
            for (let j = 0; j < features.length - 1; j++) {
              let t1 = hhmmssToSeconds(features[j].properties.arrivals[i])
              let t2 = hhmmssToSeconds(features[j + 1].properties.departures[i])
              dwellTimes.push(t2 - t1)
            }
            dwellTimes = dwellTimes.reverse()
            let t4 = 0
            for (let j = 0; j < cloned.features.length; j++) {
              let t1 = hhmmssToSeconds(cloned.features[j].properties.departures[i])
              let t2 = hhmmssToSeconds(cloned.features[j].properties.arrivals[i])
              let travelTime = t2 - t1
              if (j == 0) {
                cloned.features[j].properties.departures[i] = features[0].properties.departures[i]
              } else {
                cloned.features[j].properties.departures[i] = secondsTohhmmss(t4 + dwellTimes[j - 1])
              }
              let t3 = hhmmssToSeconds(cloned.features[j].properties.departures[i])
              cloned.features[j].properties.arrivals[i] = secondsTohhmmss(t3 + travelTime)
              t4 = hhmmssToSeconds(cloned.features[j].properties.arrivals[i])
            }
          }
        }
      }

      if (payload.cloneNodes) {
      // duplicate nodes and rename them
        const clonedNodes = cloneDeep(this.nodes)
        clonedNodes.features = deleteUnusedNodes(clonedNodes, cloned)
        const indexList = clonedNodes.features.map(node => node.properties.index)
        const newName: Record<string, string> = {}
        indexList.forEach(node => newName[node] = 'node_' + short.generate())
        clonedNodes.features.forEach(node => node.properties.index = newName[node.properties.index])

        cloned.features.forEach(link => link.properties.a = newName[link.properties.a])
        cloned.features.forEach(link => link.properties.b = newName[link.properties.b])

        this.nodes.features.push(...clonedNodes.features)
      }
      // push cloned links and nodes
      this.links.features.push(...cloned.features)

      this.getTripId()
    },
    getEditorNodes (nodes: PointGeoJson) {
      // payload contain nodes. this.nodes or this.editorNodes
      const features = deleteUnusedNodes(nodes, this.editorLinks) // return nodes in links
      this.editorNodes.features = cloneDeep(features)
    },

    getDefaultLink () {
      // empty trip, when its a newLine. those are the default Values.
      const defaultValue: any = {
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
      const props = this.lineAttributes.reduce((dict: any, key) => {
        dict[key] = defaultValue[key]
        return dict
      }, {})

      props.trip_id = this.editorTrip
      const linkGeometry: LineStringGeometry = { coordinates: [[0, 0], [0, 0]], type: 'LineString' }
      this.defaultLink.features[0] = { properties: props, geometry: linkGeometry, type: 'Feature' }
    },

    getTripId () {
      this.tripId = Array.from(new Set(this.links.features.map(item => item.properties.trip_id)))
      this.scheduledTrips = new Set(this.links.features.filter(l =>
        Array.isArray(l.properties.arrivals)).map(item => item.properties.trip_id))
    },

    setNewLink (payload: NewLinkPayload) {
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
        const linkProperties = cloneDeep(this.defaultLink.features[0].properties)
        // set default links values
        const defaultValue: any = {
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
        const linkGeometry: LineStringGeometry = {
          coordinates: [geom, geom],
          type: 'LineString',
        }
        const linkFeature: LineStringFeatures = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
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
        const nodeCopyId = features.properties.a
        this.setNewNode({ nodeCopyId, coordinates: payload.geom })

        features.properties.b = this.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
        this.newLink.features[0] = features
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
        const nodeCopyId = features.properties.b
        this.setNewNode({ nodeCopyId, coordinates: payload.geom })
        features.properties.a = this.newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
        this.newLink.features[0] = features
      }
    },

    calcSchedule(geojsonLink: LineStringGeoJson, action: LinksAction) {
      // ScheduleTrip
      const link = geojsonLink.features[0]
      if (isScheduleTrip(link)) {
        if (action === 'Extend Line Upward') {
          link.properties['departures'] = link.properties['arrivals']
          const diff = link.properties.time
          const arrivals = link.properties['arrivals'].map((t: string) => secondsTohhmmss(hhmmssToSeconds(t) + diff))
          link.properties['arrivals'] = arrivals
        }
        else if (action === 'Extend Line Downward') {
          link.properties['arrivals'] = link.properties['departures']
          const diff = link.properties.time
          // eslint-disable-next-line max-len
          const departures = link.properties['departures'].map((t: string) => secondsTohhmmss(hhmmssToSeconds(t) - diff))
          link.properties['departures'] = departures
        }
      }
    },

    createNewNode (geometry: number[]) {
      const nodeProperties: any = {}
      this.nodeAttributes.forEach(key => {
        nodeProperties[key] = null
      })
      nodeProperties.index = 'node_' + short.generate()
      const nodeGeometry: PointGeometry = {
        coordinates: geometry,
        type: 'Point',
      }
      // Copy specified nodenewNode
      const nodeFeatures: PointFeatures = { geometry: nodeGeometry, properties: nodeProperties, type: 'Feature' }
      this.editorNodes.features = [nodeFeatures]
    },

    setNewNode (payload: NewNodePayload) {
      const uncopiedPropeties: Record<string, any> = {}
      this.nodeAttributes.forEach(key => {
        uncopiedPropeties[key] = null
      })
      // Copy specified node
      const tempNode = cloneDeep(this.editorNodes)
      const features = tempNode.features.filter(node => node.properties.index === payload.nodeCopyId)[0]
      Object.assign(features.properties, uncopiedPropeties)
      features.properties.index = 'node_' + short.generate()
      features.geometry.coordinates = payload.coordinates
      this.newNode.features[0] = features
    },

    editNewLink (payload: EditNewLinkPayload) {
      this.newNode.features[0].geometry.coordinates = payload.geom
      if (payload.action === 'Extend Line Upward') {
        this.newLink.features[0].geometry.coordinates = [this.newLink.features[0].geometry.coordinates[0], payload.geom]
      } else {
        this.newLink.features[0].geometry.coordinates = [payload.geom, this.newLink.features[0].geometry.coordinates[1]]
      }
    },

    applyNewLink (payload: NewLinkPayload) {
      // nodeId: this.selectedNodeId, geom: pointGeom, action: Extend Line Upward
      // get linestring length in km
      this.setNewLink(payload)
      this.editNewLink({ geom: payload.geom, action: payload.action })
      this.calcLengthTime(this.newLink.features[0])
      this.calcSchedule(this.newLink, payload.action)

      if (payload.action === 'Extend Line Upward') {
        this.editorLinks.features.push(this.newLink.features[0])
        this.editorNodes.features.push(this.newNode.features[0])
      } else if (payload.action === 'Extend Line Downward') {
        this.editorLinks.features.splice(0, 0, this.newLink.features[0])
        this.editorNodes.features.splice(0, 0, this.newNode.features[0])
        this.editorLinks.features.forEach(link => link.properties.link_sequence += 1)
      }
    },

    deleteNode (payload: SelectedNode) {
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
        if (isScheduleTrip(link1)) {
          link1.properties.arrivals = link2.properties.arrivals
        }
        // weighed average for speed. this help to have round value of speed (ex both 20kmh, at the end 20kmh)
        const time1 = Number(link1.properties.time)
        const time2 = Number(link2.properties.time)
        const speed1 = Number(link1.properties.speed)
        const speed2 = Number(link2.properties.speed)
        link1.properties.speed = Number((speed1 * time1 + speed2 * time2) / (time1 + time2)).toFixed(6)
        this.calcLengthTime(link1)

        // find removed link index. drop everylinks link_sequence after by 1
        const featureIndex = this.editorLinks.features.findIndex(
          link => link.properties.index === link2.properties.index)
        this.editorLinks.features.slice(featureIndex).forEach(
          link => link.properties.link_sequence -= 1)
        // delete link2
        this.editorLinks.features = this.editorLinks.features.filter(
          link => link.properties.index !== link2.properties.index)
        // return modified link index (undefined if first or last node is deleted)
        return link1
      }
    },

    splitLink (payload: SplitLinkPayload) {
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

      if (isScheduleTrip(link1)) {
        const departures = link1.properties.departures.map((el: string) => hhmmssToSeconds(el))
        const arrivals = link1.properties.arrivals.map((el: string) => hhmmssToSeconds(el))
        for (let i = 0; i < departures.length; i++) {
          const midPoint = departures[i] + (arrivals[i] - departures[i]) * ratio
          link1.properties.arrivals[i] = secondsTohhmmss(midPoint)
          link2.properties.departures[i] = secondsTohhmmss(midPoint)
        }
      }

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

    addNodeInline (payload: AddNodeInlinePayload) {
      // payload contain selectedLink and event.lngLat (clicked point)
      const link = this.editorLinks.features.filter((link) => link.properties.index === payload.selectedLink.index)[0]
      const linkGeom = lineString(link.geometry.coordinates)
      const clickedPoint = Point(Object.values(payload.lngLat))
      const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
      // we snap on the temp geom for the index:
      const dist = length(linkGeom, { units: 'kilometers' }) // dist
      // for multiString, gives the index of the closest one, add +1 for the slice.

      const sliceIndex = snapped.properties.index ? snapped.properties.index + 1 : 1
      const offset = snapped.properties.location ? snapped.properties.location / dist : 0
      if (payload.nodes === 'editorNodes') {
        const nodeCopyId = link.properties.a
        this.setNewNode({ coordinates: snapped.geometry.coordinates, nodeCopyId })
        this.splitLink({ selectedLink: payload.selectedLink, offset, sliceIndex })
        // Anchor Nodes
      } else if (payload.nodes === 'anchorNodes') {
        this.addAnchorNode({
          selectedLink: payload.selectedLink,
          coordinates: snapped.geometry.coordinates,
          sliceIndex,
        })
      } else {
        // in the cas of a Routing Anchor, we want the find the slice index on the
        // virtual geometry created with link.proeperties.anchor. not the actual geom.
        const inBetween = link.properties.anchors || []
        const routingGeom = lineString([
          link.geometry.coordinates[0],
          ...inBetween,
          ...link.geometry.coordinates.slice(-1),
        ])
        const snapped2 = nearestPointOnLine(routingGeom, clickedPoint, { units: 'kilometers' })
        const anchorSliceIndex = snapped2.properties.index || 0
        this.addRoutingAnchorNode({
          selectedLink: payload.selectedLink,
          coordinates: snapped.geometry.coordinates,
          sliceIndex: anchorSliceIndex,
        })
      }
    },

    addAnchorNode (payload: AnchorPayload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change editorLinks as it is an observer.
      const link = this.editorLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },

    addRoutingAnchorNode (payload: AnchorPayload) {
      const linkIndex = payload.selectedLink.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change editorLinks as it is an observer.
      const link = this.editorLinks.features[featureIndex]
      // if anchor properties does not exist: create it. else append at correct index.
      if (Object.keys(link.properties).includes('anchors')) {
        link.properties.anchors.splice(payload.sliceIndex, 0, payload.coordinates)
      } else {
        link.properties.anchors = [payload.coordinates]
      }
    },

    deleteAnchorNode (payload: SelectedNode) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
      this.calcLengthTime(link)
      // return the modified link (used for Routing)
      return link
    },

    deleteRoutingAnchorNode (payload: SelectedNode) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.properties.anchors = [...link.properties.anchors.slice(0, coordinatedIndex),
        ...link.properties.anchors.slice(coordinatedIndex + 1)]
      // return the modified link (used for Routing)
      return link
    },

    getConnectedLinks (payload: SelectedNode) {
      const nodeIndex = payload.selectedNode.properties.index
      const linkIndex = payload.selectedNode.properties.linkIndex
      // get links connected to the node
      // use rLinks as we could moidified links that are not visible moving a node.
      this.connectedLinks = {
        b: this.editorLinks.features.filter(link => link.properties.b === nodeIndex),
        a: this.editorLinks.features.filter(link => link.properties.a === nodeIndex),
        anchor: this.editorLinks.features.filter(feature => feature.properties.index === linkIndex),
      }
    },

    moveNode (payload: MoveNode) {
      const nodeIndex = payload.selectedNode.properties.index
      // change node geometry
      const newNode = this.editorNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = payload.lngLat
      // update links geometry.
      this.connectedLinks.b.forEach(link => {
        link.geometry.coordinates[link.geometry.coordinates.length - 1] = payload.lngLat
        this.calcLengthTime(link)
      })
      this.connectedLinks.a.forEach(link => {
        link.geometry.coordinates[0] = payload.lngLat
        this.calcLengthTime(link)
      })
    },

    moveAnchor (payload: MoveNode) {
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.connectedLinks.anchor[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      this.calcLengthTime(link)
    },

    moveRoutingAnchor (payload: MoveNode) {
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.connectedLinks.anchor[0]
      link.properties.anchors[coordinatedIndex] = payload.lngLat
    },

    applyStickyNode(payload: StickyNodePayload) {
      // this function assume that stickyindex !== nodeIndex (should always be a new node)
      // this function assume that sticky index is not in editorNodes (cannot reuse a node for a trip)
      const nodeIndex = payload.selectedNodeId
      const stickyIndex = payload.stickyNodeId
      this.editorNodes.features = this.editorNodes.features.filter(node => node.properties.index !== nodeIndex)
      const newNode = cloneDeep(this.nodes.features.filter(node => node.properties.index === stickyIndex)[0])
      this.editorNodes.features.push(newNode)

      this.editorLinks.features.filter(link => link.properties.a === nodeIndex).forEach(
        (link) => { link.properties.a = stickyIndex })
      this.editorLinks.features.filter(link => link.properties.b === nodeIndex).forEach(
        (link) => { link.properties.b = stickyIndex })

      this.moveNode({ selectedNode: newNode, lngLat: newNode.geometry.coordinates })
    },

    cutLineFromNode (payload: SelectedNode) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete: Record<string, any>[] = []
      for (const [i, link] of this.editorLinks.features.entries()) {
        if (link.properties.b === nodeId) {
          toDelete = this.editorLinks.features.slice(i + 1)
          break
        }
      }
      // Delete links
      this.editorLinks.features = this.editorLinks.features.filter(item => !toDelete.includes(item))
      this.getEditorNodes(this.editorNodes)
    },

    cutLineAtNode (payload: SelectedNode) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      let toDelete: Record<string, any>[] = []
      for (const [i, link] of this.editorLinks.features.entries()) {
        if (link.properties.a === nodeId) {
          toDelete = this.editorLinks.features.slice(0, i)
          break
        }
      }
      // Delete links
      this.editorLinks.features = this.editorLinks.features.filter(item => !toDelete.includes(item))
      this.getEditorNodes(this.editorNodes)
    },

    editLineInfo (payload: GroupForm) {
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(payload).filter(key =>
        ((payload[key].value !== '') || !payload[key].placeholder) && (!payload[key].disabled))
      // add new line info to each links of each trips.
      this.editorLinks.features.forEach(
        (features) => props.forEach((key) => features.properties[key] = payload[key].value))

      // update default Link. this is necessary when we draw a new Trip. default info must be store here
      props.forEach((key) => this.defaultLink.features[0].properties[key] = payload[key].value)

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

    editLinkInfo (payload: EditLinkPayload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedIndex, info } = payload
      const props = Object.keys(info)
      this.editorLinks.features.filter(
        function (link) {
          if (link.properties.index === selectedIndex) {
            props.forEach((key) => link.properties[key] = info[key].value)
          }
        },
      )
    },

    editNodeInfo (payload: EditLinkPayload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedIndex, info } = payload
      const props = Object.keys(info)
      this.editorNodes.features.filter(
        // eslint-disable-next-line array-callback-return
        function (node) {
          if (node.properties.index === selectedIndex) {
            props.forEach((key) => node.properties[key] = info[key].value)
          }
        },
      )
    },

    editGroupInfo (payload: EditGroupPayload) {
      // edit line info on multiple trips at once.
      const editorGroupInfo = payload.info
      const groupTripIds = new Set(payload.groupTripIds)
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
      this.nodes.features = deleteUnusedNodes(this.nodes, this.links)
    },

    confirmChanges () { // apply change to Links
      this.applyPropertiesTypes(this.editorLinks)

      // find index of soon to be deleted links
      let index = 0 // if new Trip, index will be 0.
      if (this.editorTrip) {
        if (this.tripId.includes(this.editorTrip)) {
          index = this.links.features.findIndex(link => link.properties.trip_id === this.editorTrip)
        }
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
      for (const link of linksA) {
        link.geometry.coordinates = [
          this.editorNodes.features.filter(node => node.properties.index === link.properties.a)[0].geometry.coordinates,
          ...link.geometry.coordinates.slice(1),
        ]
        this.calcLengthTime(link)
      }
      // same for nodes b
      const linksB = this.links.features.filter(
        link => link.properties.trip_id !== this.editorTrip).filter(
        item => editorNodesList.has(item.properties.b))
      for (const link of linksB) {
        link.geometry.coordinates = [
          ...link.geometry.coordinates.slice(0, -1),
          this.editorNodes.features.filter(node => node.properties.index === link.properties.b)[0].geometry.coordinates,
        ]
        this.calcLengthTime(link)
      }

      this.newLink = baseLineString
      this.newNode = basePoint
      // get tripId list
      this.getTripId()
      this.getLinksProperties()
      this.setEditorTrip(null)
    },

    deleteTrip (payload: string[]) {
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
    applyPropertiesTypes (links: LineStringGeoJson) {
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
    anchorNodes: (state) => {
      const nodes: any = cloneDeep(basePoint)
      state.editorLinks.features.filter(link => link.geometry.coordinates.length > 2).forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.geometry.coordinates.slice(1, -1).forEach(
            (pt, idx) => nodes.features.push({
              properties: { index: short.generate(), linkIndex, coordinatedIndex: idx + 1 },
              geometry: { coordinates: pt, type: 'Point' },
            }),
          )
        },
      )
      return nodes
    },
    routeAnchorNodes: (state) => {
      const nodes: any = cloneDeep(basePoint)
      state.editorLinks.features.forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.properties.anchors?.forEach(
            (pt: number[], idx: number) => nodes.features.push({
              properties: { index: short.generate(), linkIndex, coordinatedIndex: idx },
              geometry: { coordinates: pt, type: 'Point' },
            }),
          )
        },
      )
      return nodes
    },
    routeAnchorLine: (state) => {
      const geom: number[][] = []
      state.editorLinks.features.forEach(link => {
        const inBetween = link.properties.anchors || []
        // only first node as last node for an iteration is first for the other.
        if (geom.length === 0) { geom.push(link.geometry.coordinates[0]) }
        geom.push(...inBetween)
        geom.push(...link.geometry.coordinates.slice(-1))
      })
      return lineString(geom)
    },
    // this return the attribute type, of undefined.
    attributeType: (state) => (name: string) => state.defaultAttributes.filter(attr => attr.name === name)[0]?.type,
  },
})
