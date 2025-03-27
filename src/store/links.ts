/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore, acceptHMRUpdate } from 'pinia'

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { lineString, point as Point } from '@turf/helpers'

import { serializer } from '@src/utils/serializer'
import { IndexAreDifferent, deleteUnusedNodes, isScheduleTrip,
  hhmmssToSeconds, secondsTohhmmss, getDifference, weightedAverage,
  getModifiedKeys } from '@src/utils/utils'
import { simplifyGeometry } from '@src/utils/spatial'
import { cloneDeep } from 'lodash'

import short from 'short-uuid'
import { GroupForm } from '@src/types/components'
import { linksDefaultProperties, nodesDefaultProperties, tcDefaultAttributesChoices } from '@src/constants/properties'

import { AddNodeInlinePayload, AnchorPayload, AttributesChoice,
  CloneTrip, EditGroupPayload, EditLinkPayload, LinksAction,
  LinksStore, MoveNode, NewAttribute, NewLinkPayload, NewNodePayload,
  FilesPayload, SelectedNode, SplitLinkPayload, StickyNodePayload,
  NonEmptyArray,
  FileSource,
  SchedulePayload } from '@src/types/typesStore'
import { baseLineString, basePoint,
  LineStringGeoJson, LineStringGeometry, PointFeatures, PointGeoJson, PointGeometry } from '@src/types/geojson'
import { initLengthTimeSpeed, calcLengthTime,
  getVariantsChoices, addDefaultValuesToVariants, getBaseAttributesWithVariants,
  getDefaultLink } from '@src/utils/network'

const $gettext = (s: string) => s

export const useLinksStore = defineStore('links', {
  state: (): LinksStore => ({
    links: baseLineString(),
    nodes: basePoint(),
    visibleNodes: basePoint(),
    // Edition of a trip
    editorTrip: null,
    editorLinks: baseLineString(),
    editorNodes: basePoint(),
    // variant (periods)
    variant: '',
    variantChoice: [''], // should never be empty.
    // filters
    tripList: [],
    selectedTrips: [],
    connectedLinks: { a: [], b: [], anchor: [] },
    // Defauts links and nodes properties
    linksDefaultAttributes: cloneDeep(linksDefaultProperties),
    nodesDefaultAttributes: cloneDeep(nodesDefaultProperties),
    linksAttributesChoices: cloneDeep(tcDefaultAttributesChoices),
  }),

  actions: {
    //
    // io
    //
    loadPTFiles (payload: FilesPayload[], source: FileSource) {
      // payload = [{path,content}, ...]
      // get links. check that index are not duplicated, serialize them and then append to project
      // get nodes. check that index are not duplicated, serialize them and then append to project
      for (const file of payload) {
        if (file.content.features.length === 0) { break } // empty file. do nothing
        const currentType = file.content.features[0].geometry.type
        if (currentType === 'LineString') {
          if (IndexAreDifferent(file.content, this.links)) {
            const formatFile = source === 'local' // if from cloud, we can skip formatting
            this.appendNewLinks(serializer(file.content, file.path, currentType), formatFile)
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

    appendNewLinks (payload: LineStringGeoJson, format: boolean = true) {
      // append new links to the project. payload = links geojson file
      payload.features.forEach(link => this.links.features.push(link))
      this.getLinksProperties()
      this.getTripList()
      this.selectedTrips = this.tripList
      this.getVariants()
      if (format) {
        simplifyGeometry(payload)
        initLengthTimeSpeed(this.links, this.timeVariants)
        this.getLinksProperties()
        this.applyPropertiesTypes(this.links)
      }
      this.deleteNonVariantAttributes()
    },

    getVariants() {
      this.variantChoice = getVariantsChoices(this.linksDefaultAttributes)
      addDefaultValuesToVariants(this.linksDefaultAttributes)
    },

    deleteNonVariantAttributes() {
      // delete normal defaults Attributes if variants. (ex: no speed in defaultAttributes if speed#AM)
      const toDelete = getBaseAttributesWithVariants(this.linksDefaultAttributes)
      toDelete.forEach(attr => this.deleteLinksPropertie({ name: attr }))
    },

    appendNewNodes (payload: PointGeoJson) {
      // append new nodes to the project. payload = nodes geojson file
      simplifyGeometry(payload)

      payload.features.forEach(node => this.nodes.features.push(node))
      this.getNodesProperties()
    },

    getLinksProperties () {
      const keys: Set<string> = new Set([])
      this.links.features.forEach(feature => {
        Object.keys(feature.properties).forEach(key => keys.add(key))
      })
      const newAttrs = getDifference(keys, this.lineAttributes)
      newAttrs.forEach(attr => this.linksDefaultAttributes.push({ name: attr, type: undefined }))
    },

    getNodesProperties () {
      const keys: Set<string> = new Set([])
      this.nodes.features.forEach(feature => {
        Object.keys(feature.properties).forEach(key => keys.add(key))
      })
      const newAttrs = getDifference(keys, this.nodeAttributes)
      newAttrs.forEach(attr => this.nodesDefaultAttributes.push({ name: attr, type: undefined }))
    },

    loadLinksAttributesChoices (payload: AttributesChoice) {
      // eslint-disable-next-line no-return-assign
      Object.keys(payload).forEach(key => this.linksAttributesChoices[key] = payload[key])
      const attrs = Object.keys(this.linksAttributesChoices) // all attrbutes in attributesChoices
      const newAttrs = getDifference(attrs, this.lineAttributes)
      newAttrs.forEach(attr => this.addLinksPropertie({ name: attr }))
    },

    addLinksPropertie (payload: NewAttribute) {
      // when a new line properties is added (in dataframe page)
      this.links.features.forEach(link => link.properties[payload.name] = null)
      this.editorLinks.features.forEach(link => link.properties[payload.name] = null)
      this.linksDefaultAttributes.push({ name: payload.name, type: undefined })
    },

    addNodesPropertie (payload: NewAttribute) {
      this.nodes.features.forEach(node => node.properties[payload.name] = null)
      this.editorNodes.features.forEach(node => node.properties[payload.name] = null)
      this.nodesDefaultAttributes.push({ name: payload.name, type: undefined })
    },

    deleteLinksPropertie (payload: NewAttribute) {
      this.links.features.forEach(link => delete link.properties[payload.name])
      this.editorLinks.features.forEach(link => delete link.properties[payload.name])
      this.linksDefaultAttributes = this.linksDefaultAttributes.filter(item => item.name !== payload.name)
    },
    deleteEditorLinksPropertie (payload: NewAttribute) {
      this.editorLinks.features.forEach(link => delete link.properties[payload.name])
    },

    deleteNodesPropertie (payload: NewAttribute) {
      this.nodes.features.forEach(node => delete node.properties[payload.name])
      this.editorNodes.features.forEach(node => delete node.properties[payload.name])
      this.nodesDefaultAttributes = this.nodesDefaultAttributes.filter(item => item.name !== payload.name)
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
    },

    editEditorLinksInfo (payload: SchedulePayload[]) {
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
      const cloned = baseLineString()
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

      this.getTripList()
    },

    getEditorNodes (nodes: PointGeoJson) {
      // payload contain nodes. this.nodes or this.editorNodes
      const features = deleteUnusedNodes(nodes, this.editorLinks) // return nodes in links
      this.editorNodes.features = cloneDeep(features)
    },

    getTripList () {
      this.tripList = Array.from(new Set(this.links.features.map(item => item.properties.trip_id)))
    },

    createNewLink (payload: NewLinkPayload) {
      // copy editor links geoJSON, only take first (or last) link.
      // delete some properties like id and index.
      // create link
      let newLink = cloneDeep(this.editorLinks)
      let newNode = basePoint()
      // if there is no link to copy, create one. (new Line)
      if (newLink.features.length === 0) {
        newLink = getDefaultLink(this.linksDefaultAttributes)// trip_id already set in linksDefaultAttributes
        const linkProperties = cloneDeep(newLink.features[0].properties)
        linkProperties.a = this.editorNodes.features[0].properties.index
        linkProperties.b = this.editorNodes.features[0].properties.index

        const geom = cloneDeep(this.editorNodes.features[0].geometry.coordinates)
        const linkGeometry: LineStringGeometry = {
          coordinates: [geom, geom],
          type: 'LineString',
        }

        newLink.features = [{ geometry: linkGeometry, properties: linkProperties, type: 'Feature' }]
      }
      // Take last link or first link

      if (payload.action === 'Extend Line Upward') {
        const features = newLink.features.slice(-1)[0]
        features.properties.link_sequence = features.properties.link_sequence + 1
        // replace node a by b and delete node a
        features.properties.a = features.properties.b
        const firstPoint = cloneDeep(features.geometry.coordinates.slice(-1)[0])
        features.geometry.coordinates = [firstPoint, payload.geom]
        // new node index (hash)
        const nodeCopyId = features.properties.a
        newNode = this.getNewNode({ nodeCopyId, coordinates: payload.geom })

        features.properties.b = newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
        newLink.features = [features]
      } else if (payload.action === 'Extend Line Downward') {
        const features = newLink.features[0]
        features.properties.link_sequence = features.properties.link_sequence - 1
        //  replace node b by a and delete node b
        features.properties.b = features.properties.a
        const lastPoint = cloneDeep(features.geometry.coordinates[0])
        features.geometry.coordinates = [payload.geom, lastPoint]
        // new node index (hash)
        const nodeCopyId = features.properties.b
        newNode = this.getNewNode({ nodeCopyId, coordinates: payload.geom })
        features.properties.a = newNode.features[0].properties.index
        features.properties.index = 'link_' + short.generate()
      }
      return { newLink, newNode }
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
      // only used to create the first node of a new Line
      const nodeProperties: Record<string, any> = {}
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

    getNewNode (payload: NewNodePayload) {
      // Copy specified node
      const tempNode = cloneDeep(this.editorNodes)
      const features = tempNode.features.filter(node => node.properties.index === payload.nodeCopyId)[0]
      features.properties.index = 'node_' + short.generate()
      features.geometry.coordinates = payload.coordinates
      const newNode = basePoint()
      newNode.features = [features]
      return newNode
    },

    applyNewLink (payload: NewLinkPayload) {
      // nodeId: this.selectedNodeId, geom: pointGeom, action: Extend Line Upward
      // get linestring length in km
      const { newLink, newNode } = this.createNewLink(payload)
      calcLengthTime(newLink.features[0], this.timeVariants)
      this.calcSchedule(newLink, payload.action)
      this.editorNodes.features.push(newNode.features[0])
      if (payload.action === 'Extend Line Upward') {
        this.editorLinks.features.push(newLink.features[0])
      } else if (payload.action === 'Extend Line Downward') {
        this.editorLinks.features.splice(0, 0, newLink.features[0])
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

      if (nodeIndex == this.firstNodeId) {
        this.editorLinks.features = this.editorLinks.features.filter(link => link.properties.a !== nodeIndex)
        this.editorLinks.features.forEach(link => link.properties.link_sequence -= 1)
      } else if (nodeIndex == this.lastNodeId) {
        this.editorLinks.features = this.editorLinks.features.filter(link => link.properties.b !== nodeIndex)
        // the node is inbetween 2 links. 1 link is deleted, and the other is extented.
      } else {
        // merge link2 on link1 then delete link2
        link1.geometry.coordinates = [
          ...link1.geometry.coordinates.slice(0, -1),
          ...link2.geometry.coordinates.slice(1)]
        link1.properties.b = link2.properties.b

        if (isScheduleTrip(link1)) {
          link1.properties.arrivals = link2.properties.arrivals
        }
        const links = [link1, link2]
        this.timeVariants.forEach(v => {
          const speedList = links.map(link => link.properties[`speed${v}`])
          const timeList = links.map(link => link.properties[`time${v}`])
          // weighed average for speed. this help to have round value of speed (ex both 20kmh, at the end 20kmh)
          link1.properties[`speed${v}`] = weightedAverage(speedList, timeList)
        })

        calcLengthTime(link1, this.timeVariants)

        const toDeleteIndex = link2.properties.index
        // find removed link index. drop everylinks link_sequence after by 1
        const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === toDeleteIndex)
        this.editorLinks.features.slice(featureIndex).forEach(link => link.properties.link_sequence -= 1)
        // delete link2
        this.editorLinks.features = this.editorLinks.features.filter(
          link => link.properties.index !== toDeleteIndex)
        // return modified link (undefined if first or last node is deleted)
        return link1
      }
    },

    splitLink (payload: SplitLinkPayload) {
      const linkIndex = payload.selectedLink.index
      const sliceIndex = payload.sliceIndex
      const ratio = payload.offset // point distance (entre 0 et 1) on the original link
      const newNode = payload.newNode.features[0]
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      const link1 = this.editorLinks.features[featureIndex] // this link is extented
      const link2 = cloneDeep(link1)
      link2.properties.index = 'link_' + short.generate() // link2.properties.index+ '-2'

      link1.properties.b = newNode.properties.index
      link1.geometry.coordinates = [
        ...link1.geometry.coordinates.slice(0, sliceIndex),
        newNode.geometry.coordinates,
      ]

      link2.properties.a = newNode.properties.index
      link2.geometry.coordinates = [
        newNode.geometry.coordinates,
        ...link2.geometry.coordinates.slice(sliceIndex),
      ]

      // new Geom. calc length and time with speed.
      calcLengthTime(link1, this.timeVariants)
      calcLengthTime(link2, this.timeVariants)

      if (isScheduleTrip(link1)) {
        const departures = link1.properties.departures.map((el: string) => hhmmssToSeconds(el))
        const arrivals = link1.properties.arrivals.map((el: string) => hhmmssToSeconds(el))
        for (let i = 0; i < departures.length; i++) {
          const midPoint = departures[i] + (arrivals[i] - departures[i]) * ratio
          link1.properties.arrivals[i] = secondsTohhmmss(midPoint)
          link2.properties.departures[i] = secondsTohhmmss(midPoint)
        }
      }
      // add new node and link
      this.editorLinks.features.splice(featureIndex + 1, 0, link2)
      this.editorNodes.features.push(newNode)

      // add +1 to every link sequence after link1
      // this assume the links are in order. which is the case (set qhen set editorTrip)
      this.editorLinks.features.slice(featureIndex + 1).forEach(link => link.properties.link_sequence += 1)
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
        const newNode = this.getNewNode({ coordinates: snapped.geometry.coordinates, nodeCopyId })
        this.splitLink({ selectedLink: payload.selectedLink, offset, sliceIndex, newNode })
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
      calcLengthTime(link, this.timeVariants)
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
      const geom = payload.lngLat
      // change node geometry
      const newNode = this.editorNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = geom
      // update links geometry.
      this.connectedLinks.b.forEach(link => {
        link.geometry.coordinates[link.geometry.coordinates.length - 1] = geom
        calcLengthTime(link, this.timeVariants)
      })
      this.connectedLinks.a.forEach(link => {
        link.geometry.coordinates[0] = geom
        calcLengthTime(link, this.timeVariants)
      })
    },

    moveAnchor (payload: MoveNode) {
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.connectedLinks.anchor[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      calcLengthTime(link, this.timeVariants)
    },

    moveRoutingAnchor (payload: MoveNode) {
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.connectedLinks.anchor[0]
      link.properties.anchors[coordinatedIndex] = payload.lngLat
    },

    applyStickyNode(payload: StickyNodePayload) {
      // this function assume that stickyindex !== nodeIndex (should always be a new node)
      // this function assume that sticky index is not in editorNodes (cannot reuse a node for a trip)
      const newNodeIndex = payload.selectedNodeId
      const stickyIndex = payload.stickyNodeId
      // remove and old node and add new one (sticky one replace old one)
      this.editorNodes.features = this.editorNodes.features.filter(node => node.properties.index !== newNodeIndex)
      const newNodeFeatures = cloneDeep(this.nodes.features.filter(node => node.properties.index === stickyIndex)[0])
      this.editorNodes.features.push(newNodeFeatures)

      const geom = cloneDeep(newNodeFeatures.geometry.coordinates)

      this.editorLinks.features.filter(link => link.properties.a === newNodeIndex).forEach(
        (link) => {
          link.properties.a = stickyIndex
          link.geometry.coordinates[0] = geom
          calcLengthTime(link, this.timeVariants)
        })
      this.editorLinks.features.filter(link => link.properties.b === newNodeIndex).forEach(
        (link) => {
          link.properties.b = stickyIndex
          link.geometry.coordinates[link.geometry.coordinates.length - 1] = geom
          calcLengthTime(link, this.timeVariants)
        })
    },

    cutLineAfterNode (payload: SelectedNode) {
      const nodeId = payload.selectedNode.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.a === nodeId)
      // Delete links (assuming order)
      this.editorLinks.features = this.editorLinks.features.slice(0, featureIndex)
      this.getEditorNodes(this.editorNodes)
    },

    cutLineBeforeNode (payload: SelectedNode) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.a === nodeId)
      // Delete links (assuming order)
      this.editorLinks.features = this.editorLinks.features.slice(featureIndex)
      this.getEditorNodes(this.editorNodes)
    },

    editLineInfo (payload: GroupForm) {
      // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
      const props = getModifiedKeys(payload)
      this.editorLinks.features.forEach(
        (features) => props.forEach((key) => features.properties[key] = payload[key].value))

      // apply speed (get time on each link for the new speed.)
      const modifiedSpeeds = this.timeVariants.filter(v => props.includes(`speed${v}`))
      if (modifiedSpeeds.length > 0) {
        this.editorLinks.features.forEach(link =>
          calcLengthTime(link, modifiedSpeeds as NonEmptyArray<string>),
        )
      }
      // New line
      // change LinksDefault values. so drawing a link uses those inputed values
      if (this.editorLinks.features.length === 0) {
        props.forEach((key: string) => {
          const attr = this.linksDefaultAttributes.filter(el => el.name === key)[0]
          attr.value = payload[key].value
        },

        )
      }
    },

    editLinkInfo (payload: EditLinkPayload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedIndex, info } = payload
      const props = Object.keys(info)
      const link = this.editorLinks.features.filter(link => link.properties.index === selectedIndex)[0]
      props.forEach(key => link.properties[key] = info[key].value)
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
      const groupTripIds = new Set(payload.selectedArray)
      // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
      const props = getModifiedKeys(editorGroupInfo)
      // add new line info to each links of each trips.
      const tempLinks = this.links.features.filter(link => groupTripIds.has(link.properties.trip_id))
      tempLinks.forEach(features => props.forEach((key) => features.properties[key] = editorGroupInfo[key].value))
      // apply speed (get time on each link for the new speed.)
      const modifiedSpeeds = this.timeVariants.filter(v => props.includes(`speed${v}`))
      if (modifiedSpeeds.length > 0) {
        tempLinks.forEach(link =>
          calcLengthTime(link, modifiedSpeeds as NonEmptyArray<string>),
        )
      }
      // get tripId list
      this.getTripList()
    },

    deleteUnusedNodes () {
      // delete every every nodes not in links
      this.nodes.features = deleteUnusedNodes(this.nodes, this.links)
    },

    confirmChanges () { // apply change to Links
      this.fixRoutingList(this.editorLinks.features)
      this.applyPropertiesTypes(this.editorLinks)

      // find index of soon to be deleted links
      let index = 0 // if new Trip, index will be 0.
      if (this.editorTrip) {
        if (this.tripList.includes(this.editorTrip)) {
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
        calcLengthTime(link, this.timeVariants)
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
        calcLengthTime(link, this.timeVariants)
      }
      // get tripId list
      this.getTripList()
      this.getLinksProperties()
      this.setEditorTrip(null)
    },

    fixRoutingList() {
      let lastVisited = ''
      this.editorLinks.features.forEach(link => {
        let ls: undefined | string[] = link.properties.road_link_list
        if (ls && ls.length > 0) {
          const firstRoad = ls[0]
          const lastRoad = ls.slice(-1)[0]
          if (firstRoad === lastVisited) {
            link.properties.road_link_list = ls.slice(1)
          }
          lastVisited = lastRoad
        }
      })
    },

    deleteTrips (tripList: string[]) {
      this.links.features = this.links.features.filter(link => !tripList.includes(link.properties.trip_id))
      this.deleteUnusedNodes()
      this.getTripList()
    },

    applyPropertiesTypes (links: LineStringGeoJson) {
      for (const attr of this.linksDefaultAttributes) {
        for (const link of links.features) {
          if (attr.type === 'String') {
            link.properties[attr.name] = String(link.properties[attr.name])
          } else if (attr.type === 'Number') {
            link.properties[attr.name] = Number(link.properties[attr.name])
          }
        }
      }
    },

    fixAllRoutingList() {
      const groups = Object.values(Object.groupBy(this.links.features, item => item.properties.trip_id))
      groups.forEach(features => this.fixRoutingList(features))
    },

    fixRoutingList(features) {
      let lastVisited = ''
      features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
      features.forEach(link => {
        let ls = link.properties.road_link_list
        if (ls && ls.length > 0) {
          const firstRoad = ls[0]
          const lastRoad = ls.slice(-1)[0]
          if (firstRoad === lastVisited) {
            link.properties.road_link_list = ls.slice(1)
          }
          lastVisited = lastRoad
        }
      })
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
      const nodes: any = basePoint()
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
      const nodes: any = basePoint()
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
    lineAttributes: (state) => state.linksDefaultAttributes.map(attr => attr.name),
    nodeAttributes: (state) => state.nodesDefaultAttributes.map(attr => attr.name),
    timeVariants: (state) => {
      const attrs = new Set(state.linksDefaultAttributes.map(attr => attr.name))
      const timeVariants = state.variantChoice.filter(v => attrs.has(`time${v}`) || attrs.has(`speed${v}`))
      return (timeVariants.length > 0 ? timeVariants : ['']) as NonEmptyArray<string>
    },

    attributesChoicesChanged: (state) =>
      JSON.stringify(state.linksAttributesChoices) !== JSON.stringify(tcDefaultAttributesChoices),
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLinksStore, import.meta.hot))
}
