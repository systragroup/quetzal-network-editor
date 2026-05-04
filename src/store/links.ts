/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore, acceptHMRUpdate } from 'pinia'

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
  SchedulePayload,
  AttributeTypes,
  SelectedAnchor,
  Commit,
} from '@src/types/typesStore'
import { baseLineString, basePoint,
  createLinestringFeature,
  LineStringFeatures,
  LineStringGeoJson, PointFeatures, PointGeoJson, PointGeometry } from '@src/types/geojson'
import { initLengthTimeSpeed, calcLengthTimeorSpeed,
  getVariantsChoices, addDefaultValuesToVariants, getBaseAttributesWithVariants,
  getDefaultLink,
  getAnchorGeojson,
  snapOnLink,
  _addGeojsonFeatures,
  _editGeojsonFeatures,
  _deleteGeojsonFeatures } from '@src/utils/network'
const $gettext = (s: string) => s

import { toRaw } from 'vue'

export const useLinksStore = defineStore('links', {
  state: (): LinksStore => ({
    links: baseLineString(),
    nodes: basePoint(),
    visibleNodes: basePoint(),
    history: [],
    redoStack: [],
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
    // Defauts links and nodes properties
    linksDefaultAttributes: cloneDeep(linksDefaultProperties),
    nodesDefaultAttributes: cloneDeep(nodesDefaultProperties),
    linksAttributesChoices: cloneDeep(tcDefaultAttributesChoices),
    // parameters
    speedTimeMethod: 'time',
  }),

  actions: {

    // commitChanges(name: string) {
    //   const links = Object.fromEntries(this.editorLinks.features.map(item => [item.properties.index, toRaw(item)]))
    //   const nodes = Object.fromEntries(this.editorNodes.features.map(item => [item.properties.index, toRaw(item)]))
    //   commit({ links: links, nodes: nodes }, name)
    // },
    // redo() {
    //   if (redo()) {
    //     this.editorLinks.features = Object.values(state.value.links).map(el => toRaw(el))
    //     this.editorNodes.features = Object.values(state.value.nodes).map(el => toRaw(el))
    //     this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
    //   }
    // },
    // undo() {
    //   if (undo()) {
    //     this.editorLinks.features = Object.values(state.value.links).map(el => toRaw(el))
    //     this.editorNodes.features = Object.values(state.value.nodes).map(el => toRaw(el))
    //     this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
    //   }
    // },

    applyCommit(commit: Commit) {
      const { name, newLinks, newNodes, deleteLinks, deleteNodes, updateLinks, updateNodes } = commit
      const history: Commit = { name: name }

      if (newLinks) history.deleteLinks = _addGeojsonFeatures(this.editorLinks, newLinks)
      if (newNodes) history.deleteNodes = _addGeojsonFeatures(this.editorNodes, newNodes)
      if (updateLinks) history.updateLinks = _editGeojsonFeatures(this.editorLinks, updateLinks) as LineStringFeatures[]
      if (updateNodes) history.updateNodes = _editGeojsonFeatures(this.editorNodes, updateNodes) as PointFeatures[]
      if (deleteLinks) history.newLinks = _deleteGeojsonFeatures(this.editorLinks, deleteLinks) as LineStringFeatures[]
      if (deleteNodes) history.newNodes = _deleteGeojsonFeatures(this.editorNodes, deleteNodes) as PointFeatures[]

      return history
    },

    commitChanges(commit: Commit) {
      // function to call when performing an action
      const prev = this.applyCommit(commit)
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
      this.history.push(prev)
      this.redoStack = [] // must erase redo stack
    },

    undo() {
      if (this.history.length > 0) {
        const prev = this.history.pop() as Commit
        const next = this.applyCommit(prev)
        this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
        this.redoStack.push(next)
      }
    },

    redo() {
      if (this.redoStack.length > 0) {
        const next = this.redoStack.pop() as Commit
        const prev = this.applyCommit(next)
        this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)
        this.history.push(prev)
      }
    },

    //
    // io
    //
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
      payload.features.forEach(link => this.links.features.push(link))
      this.getLinksProperties()
      this.getTripList()
      this.selectedTrips = this.tripList
      this.getVariants()
      // format
      simplifyGeometry(payload)
      this.applyPropertiesTypes(this.links)
      initLengthTimeSpeed(this.links, this.timeVariants)
      this.getLinksProperties()
      this.fixAllRoutingList()

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
      const linkFeatures = this.links.features.filter(link => link.properties.trip_id === this.editorTrip)
      this.editorLinks.features = cloneDeep(linkFeatures)

      // sort with sequence. we assume it is sort and action will place links in the correct order
      this.editorLinks.features.sort((a, b) => a.properties.link_sequence - b.properties.link_sequence)

      // get the corresponding nodes
      const nodeFeatures = deleteUnusedNodes(this.nodes, this.editorLinks) // return nodes in links
      this.editorNodes.features = cloneDeep(nodeFeatures)

      this.history = []
      this.redoStack = []
    },

    editEditorLinksSchedule (payload: SchedulePayload[]) {
      if (this.editorLinks.features.length !== payload.length) {
        // this should not happen...
        console.error('Payload length should be same length as editorLinks.features')
        return
      }
      const toUpdate = []
      for (let i = 0; i < payload.length; i++) {
        const linkSchedule = payload[i]
        const link = cloneDeep(this.editorLinks.features[i])
        Object.keys(linkSchedule).forEach(key => link.properties[key] = linkSchedule[key])
        toUpdate.push(link)
      }
      this.commitChanges({ name: 'edit Schedule', updateLinks: toUpdate })
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
        // sort links by sequence by inverse link_sequence
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

    getTripList () { // this could be remove i think. and be a computed
      this.tripList = Array.from(new Set(this.links.features.map(item => item.properties.trip_id)))
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
      const nodeFeature: PointFeatures = { geometry: nodeGeometry, properties: nodeProperties, type: 'Feature' }
      this.commitChanges({ name: 'new node', newNodes: [nodeFeature] })
    },

    getNewNode (payload: NewNodePayload) {
      const { nodeCopyId, coordinates } = payload
      const newNode = basePoint()
      const features = cloneDeep(this.editorNodes.features.filter(node => node.properties.index === nodeCopyId)[0])
      features.properties.index = 'node_' + short.generate()
      features.geometry.coordinates = coordinates
      newNode.features = [features]
      return newNode
    },

    addNewLink (payload: NewLinkPayload) {
      const { action, geom, stickyNodeId } = payload
      const newLink = getDefaultLink(this.linksDefaultAttributes)// trip_id already set in linksDefaultAttributes
      const newLinkFeature = newLink.features[0]
      let nodeId = action === 'Extend Line Upward' ? this.lastNodeId : this.firstNodeId

      let toNode = basePoint()
      if (stickyNodeId) {
        toNode.features = cloneDeep(this.nodes.features.filter(node => node.properties.index == stickyNodeId))
      } else {
        toNode = this.getNewNode({ nodeCopyId: nodeId, coordinates: geom })
      }

      const fromNodeFeature = cloneDeep(this.editorNodes.features.filter(node => node.properties.index === nodeId))[0]
      const toNodeFeature = cloneDeep(toNode.features[0])

      // // if there is no link to copy, create one. (new Line)
      if (this.editorLinks.features.length === 0) {
        newLinkFeature.properties.a = fromNodeFeature.properties.index
        newLinkFeature.properties.b = toNodeFeature.properties.index

        newLinkFeature.geometry.coordinates = [fromNodeFeature.geometry.coordinates, toNodeFeature.geometry.coordinates]
      }
      // Take last link or first link

      else if (action === 'Extend Line Upward') {
        const copyFeature = cloneDeep(this.editorLinks.features.slice(-1)[0])
        Object.assign(newLinkFeature, copyFeature)

        newLinkFeature.geometry.coordinates = [fromNodeFeature.geometry.coordinates, geom]
        newLinkFeature.properties.a = fromNodeFeature.properties.index
        newLinkFeature.properties.b = toNodeFeature.properties.index
      } else if (action === 'Extend Line Downward') {
        const copyFeature = cloneDeep(this.editorLinks.features[0])
        Object.assign(newLinkFeature, copyFeature)

        newLinkFeature.geometry.coordinates = [geom, fromNodeFeature.geometry.coordinates]
        newLinkFeature.properties.b = fromNodeFeature.properties.index
        newLinkFeature.properties.a = toNodeFeature.properties.index
      }

      newLinkFeature.properties.index = 'link_' + short.generate()

      calcLengthTimeorSpeed(newLink.features[0], this.timeVariants, this.speedTimeMethod)
      this.calcSchedule(newLink, payload.action)

      const feature = newLink.features[0]

      if (payload.action === 'Extend Line Upward') {
        feature.properties.link_sequence += 1
        this.commitChanges({
          name: 'Extend Line Upward', newLinks: [feature], newNodes: [toNodeFeature],
        })
      } else if (payload.action === 'Extend Line Downward') {
        const modified = cloneDeep(this.editorLinks.features)
        modified.forEach(link => link.properties.link_sequence += 1)
        this.commitChanges(
          { name: 'Extend Line Downward', newLinks: [feature], updateLinks: modified, newNodes: [toNodeFeature],

          })
      }
    },

    deleteNode (payload: SelectedNode) {
      const nodeIndex = payload.selectedNode.properties.index
      // extend link1. delete link2
      const link1 = cloneDeep(this.editorLinks.features.filter(link => link.properties.b === nodeIndex)[0])
      const link2 = cloneDeep(this.editorLinks.features.filter(link => link.properties.a === nodeIndex)[0])

      const toDelete = []
      const toEdit = []
      if (nodeIndex == this.firstNodeId) {
        toDelete.push(link2.properties.index)
      } else if (nodeIndex == this.lastNodeId) {
        toDelete.push(link1.properties.index)
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
        calcLengthTimeorSpeed(link1, this.timeVariants, this.speedTimeMethod)
        toEdit.push(link1)
        toDelete.push(link2.properties.index)
      }
      if (link2) {
        const sliceIdx = this.editorLinks.features.findIndex(link => link.properties.index === link2.properties.index)
        const toModify = this.editorLinks.features.slice(sliceIdx + 1)
        toModify.forEach(link => link.properties.link_sequence -= 1)
        toEdit.push(...toModify)
      }

      this.commitChanges({
        name: 'delete Node',
        updateLinks: toEdit,
        deleteLinks: new Set(toDelete),
        deleteNodes: new Set([nodeIndex]),
      })

      // for routing
      return link1
    },

    splitLink (payload: SplitLinkPayload) {
      // this function edit 1 link, create 1 link create 1 node
      const { linkIndex, lngLat } = payload

      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.index === linkIndex)
      const link1 = cloneDeep(this.editorLinks.features[featureIndex])
      const { sliceIndex, offset, newCoords } = snapOnLink(link1.geometry.coordinates, lngLat)
      const ratio = offset // point distance (entre 0 et 1) on the original link

      const nodeCopyId = link1.properties.a
      const newNode = this.getNewNode({ coordinates: newCoords, nodeCopyId }).features[0]

      const link2 = cloneDeep(link1)
      link2.properties.index = 'link_' + short.generate() // link2.properties.index+ '-2'
      link1.properties.b = newNode.properties.index
      link2.properties.a = newNode.properties.index

      // do geometry
      link1.geometry.coordinates = link1.geometry.coordinates.slice(0, sliceIndex)
      link1.geometry.coordinates.push(newCoords)

      link2.geometry.coordinates = link2.geometry.coordinates.slice(sliceIndex)
      link2.geometry.coordinates.splice(0, 0, newCoords)
      link2.properties.link_sequence += 1

      // new Geom. calc length and time with speed.
      calcLengthTimeorSpeed(link1, this.timeVariants, this.speedTimeMethod)
      calcLengthTimeorSpeed(link2, this.timeVariants, this.speedTimeMethod)

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
      const modified = cloneDeep(this.editorLinks.features.slice(featureIndex + 1))
      modified.forEach(link => link.properties.link_sequence += 1)
      this.commitChanges(
        { name: 'split Link',
          updateLinks: [link1, ...modified],
          newLinks: [link2],
          newNodes: [newNode] })
    },

    addNodeInline (payload: AddNodeInlinePayload) {
      const { selectedLink, lngLat, nodeType } = payload
      const linkIndex = selectedLink.properties.index
      if (nodeType === 'editorNodes') {
        this.splitLink({
          linkIndex: linkIndex,
          lngLat: lngLat,
        })
      }
      else if (nodeType == 'anchorNodes') {
        this.addAnchorNode({
          linkIndex: linkIndex,
          lngLat: lngLat,
        })
      }
      else {
        this.addRoutingAnchorNode({
          linkIndex: linkIndex,
          lngLat: lngLat,
        })
      }
    },

    addAnchorNode (payload: AnchorPayload) {
      // change link geometry coordinates
      const { linkIndex, lngLat } = payload
      const link = cloneDeep(this.editorLinks.features.filter((link) => link.properties.index === linkIndex)[0])
      const { sliceIndex, newCoords } = snapOnLink(link.geometry.coordinates, lngLat)
      link.geometry.coordinates.splice(sliceIndex, 0, newCoords)
      this.commitChanges({ name: 'add Anchor', updateLinks: [link] })
    },

    addRoutingAnchorNode (payload: AnchorPayload) {
      // change properties.anchor
      const { linkIndex, lngLat } = payload
      const link = cloneDeep(this.editorLinks.features.filter((link) => link.properties.index === linkIndex)[0])
      const { newCoords } = snapOnLink(link.geometry.coordinates, lngLat)

      // in the cas of a Routing Anchor, we want the find the slice index on the
      // virtual geometry created with link.proeperties.anchor. not the actual geom.
      const inBetween = link.properties.anchors || []
      const routingGeom = [
        toRaw(link.geometry.coordinates[0]),
        ...inBetween,
        toRaw(link.geometry.coordinates.slice(-1)[0]),
      ]
      const { sliceIndex } = snapOnLink(routingGeom, newCoords)
      // if anchor properties does not exist: create it. else append at correct index.
      if (link.properties.anchors) {
        link.properties.anchors.splice(sliceIndex - 1, 0, newCoords)
      } else {
        link.properties.anchors = [newCoords]
      }
      this.commitChanges({ name: 'add Routing Anchor', updateLinks: [link] })
    },

    deleteAnchorNode (payload: SelectedAnchor) {
      const { linkIndex, coordinatedIndex } = payload
      const link = cloneDeep(this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0])
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
      calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      this.commitChanges({ name: 'delete Anchor', updateLinks: [link] })
    },

    deleteRoutingAnchorNode (payload: SelectedAnchor) {
      const { linkIndex, coordinatedIndex } = payload
      const link = cloneDeep(this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0])
      link.properties.anchors = [...link.properties.anchors.slice(0, coordinatedIndex),
        ...link.properties.anchors.slice(coordinatedIndex + 1)]
      this.commitChanges({ name: 'delete Routing Anchor', updateLinks: [link] })

      // return the modified link (used for Routing)
      return link
    },
    moveNode (payload: MoveNode) {
      const nodeIndex = payload.selectedNode.properties.index
      const geom = payload.lngLat
      // change node geometry
      const node = cloneDeep(this.editorNodes.features.filter(node => node.properties.index === nodeIndex)[0])
      node.geometry.coordinates = geom

      const linksB = cloneDeep(this.editorLinks.features.filter(link => link.properties.b === nodeIndex))
      const linksA = cloneDeep(this.editorLinks.features.filter(link => link.properties.a === nodeIndex))

      // update links geometry.
      linksB.forEach(link => {
        link.geometry.coordinates[link.geometry.coordinates.length - 1] = geom
        calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      })
      linksA.forEach(link => {
        link.geometry.coordinates[0] = geom
        calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      })
      // for routing
      this.commitChanges({ name: 'Move Node', updateLinks: [...linksA, ...linksB], updateNodes: [node] })

      return [...linksA, ...linksB]
    },

    moveAnchor(payload: MoveNode) {
      const { selectedNode, lngLat } = payload
      const linkIndex = selectedNode.properties.linkIndex
      const coordinatedIndex = selectedNode.properties.coordinatedIndex
      const link = cloneDeep(this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0])
      link.geometry.coordinates[coordinatedIndex] = lngLat // replace value

      calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      this.commitChanges({ name: 'Move Anchor', updateLinks: [link] })

      return link
    },

    moveRoutingAnchor (payload: MoveNode) {
      const { selectedNode, lngLat } = payload
      const linkIndex = selectedNode.properties.linkIndex
      const coordinatedIndex = selectedNode.properties.coordinatedIndex
      const link = cloneDeep(this.editorLinks.features.filter(feature => feature.properties.index === linkIndex)[0])
      link.properties.anchors[coordinatedIndex] = lngLat
      calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      this.commitChanges({ name: 'Move Routing Anchor', updateLinks: [link] })

      return link
    },

    // end of moving nodes section

    applyStickyNode(payload: StickyNodePayload) {
      // this function assume that stickyindex !== nodeIndex (should always be a new node)
      // this function assume that sticky index is not in editorNodes (cannot reuse a node for a trip)
      const oldNodeIndex = payload.selectedNode.properties.index
      const stickyIndex = payload.stickyNodeId
      // remove and old node and add new one (sticky one replace old one)
      const newNodeFeatures = cloneDeep(this.nodes.features.filter(node => node.properties.index === stickyIndex)[0])

      const geom = cloneDeep(newNodeFeatures.geometry.coordinates)
      const linksA = cloneDeep(this.editorLinks.features.filter(link => link.properties.a === oldNodeIndex))
      const linksB = this.editorLinks.features.filter(link => link.properties.b === oldNodeIndex)
      linksA.forEach(
        (link) => {
          link.properties.a = stickyIndex
          link.geometry.coordinates[0] = geom
          calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
        })
      linksB.forEach(
        (link) => {
          link.properties.b = stickyIndex
          link.geometry.coordinates[link.geometry.coordinates.length - 1] = geom
          calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
        })
      this.commitChanges({
        name: 'use sticky node',
        updateLinks: [...linksA, ...linksB],
        newNodes: [newNodeFeatures],
        deleteNodes: new Set([oldNodeIndex]),
      })

      return [...linksA, ...linksB]
    },

    cutLineAfterNode (payload: SelectedNode) {
      const nodeId = payload.selectedNode.properties.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.a === nodeId)
      const toDelete = this.editorLinks.features.slice(featureIndex)
      const linksToDelete = new Set(toDelete.map(link => link.properties.index))
      const nodesToDelete = new Set(toDelete.map(link => link.properties.b))
      // no change in link sequence, we cut after.
      this.commitChanges({ name: 'cutLineAfterNode', deleteLinks: linksToDelete, deleteNodes: nodesToDelete })
    },

    cutLineBeforeNode (payload: SelectedNode) {
      // Filter links from selected line
      const nodeId = payload.selectedNode.properties.index
      const featureIndex = this.editorLinks.features.findIndex(link => link.properties.a === nodeId)

      const toDelete = this.editorLinks.features.slice(0, featureIndex)
      const toModify = this.editorLinks.features.slice(featureIndex)

      toModify.forEach(link => link.properties.link_sequence -= toDelete.length)// delete 4 links, remove 4 to every one
      const linksToDelete = new Set(toDelete.map(link => link.properties.index))
      const nodesToDelete = new Set(toDelete.map(link => link.properties.a))

      this.commitChanges({
        name: 'cutLineAfterNode', deleteLinks: linksToDelete, deleteNodes: nodesToDelete, updateLinks: toModify,
      })
    },

    editLineInfo (payload: GroupForm) {
      // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
      const props = getModifiedKeys(payload)
      const features = cloneDeep(this.editorLinks.features)
      features.forEach(
        link => props.forEach((key) => link.properties[key] = payload[key].value))// assign

      // apply speed (get time on each link for the new speed.)
      const modifiedSpeeds = this.timeVariants.filter(v => props.includes(`speed${v}`))
      if (modifiedSpeeds.length > 0) {
        features.forEach(link =>
          calcLengthTimeorSpeed(link, modifiedSpeeds as NonEmptyArray<string>, this.speedTimeMethod),
        )
      }
      this.commitChanges({ name: 'edit Line properties', updateLinks: features })
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
      const link = cloneDeep(this.editorLinks.features.filter(link => link.properties.index === selectedIndex)[0])
      props.forEach(key => link.properties[key] = info[key].value)
      this.commitChanges({ name: 'edit link properties', updateLinks: [link] })
    },

    editNodeInfo (payload: EditLinkPayload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedIndex, info } = payload
      const props = Object.keys(info)
      const node = cloneDeep(this.editorNodes.features.filter(node => node.properties.index === selectedIndex)[0])
      props.forEach(key => node.properties[key] = info[key].value)
      this.commitChanges({ name: 'edit noce properties', updateNodes: [node] })
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
          calcLengthTimeorSpeed(link, modifiedSpeeds as NonEmptyArray<string>, this.speedTimeMethod),
        )
      }
      // get tripId list
      this.getTripList()
    },

    deleteUnusedNodes () {
      // delete every every nodes not in links
      // TODO: should use the method like rlinks?
      this.nodes.features = deleteUnusedNodes(this.nodes, this.links)
      //
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
        calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
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
        calcLengthTimeorSpeed(link, this.timeVariants, this.speedTimeMethod)
      }
      // get tripId list
      this.getTripList()
      this.getLinksProperties()
      this.setEditorTrip(null)
    },

    fixAllRoutingList() {
      const groups = Object.values(Object.groupBy(this.links.features, item => item.properties.trip_id))
      groups.forEach(features => this.fixRoutingList(features as LineStringFeatures[]))
    },

    fixRoutingList(features: LineStringFeatures[]) {
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

    deleteTrips (tripList: string[]) {
      this.links.features = this.links.features.filter(link => !tripList.includes(link.properties.trip_id))
      this.deleteUnusedNodes()
      this.getTripList()
    },

    applyPropertiesTypes(links: LineStringGeoJson) {
      const attrMap: Record<string, AttributeTypes> = {}
      this.linksDefaultAttributes.forEach(attr => {
        attrMap[attr.name] = attr.type
      })

      links.features.forEach(link => {
        const props = link.properties
        for (const key in attrMap) {
          const type = attrMap[key]
          if (type === 'Number') {
            props[key] = Number(props[key])
          } else if (type === 'String') {
            props[key] = String(props[key])
          }
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
      return getAnchorGeojson(state.editorLinks.features)
    },
    routeAnchorNodes: (state) => {
      // cannot use the getAnchorGeojson as we dont work on geometry and idx is not +1
      const nodes: PointGeoJson = basePoint()
      let lineIndex = 0 // position of the node in the complete linetring
      state.editorLinks.features.forEach(feature => {
        const linkIndex = feature.properties.index
        lineIndex += 1
        feature.properties.anchors?.forEach((pt: number[], idx: number) => {
          const node: PointFeatures = {
            properties: { index: short.generate(), linkIndex, coordinatedIndex: idx, lineIndex: lineIndex },
            geometry: { coordinates: pt, type: 'Point' },
            type: 'Feature',
          }
          nodes.features.push(node)
          lineIndex += 1
        })
      },
      )
      return nodes
    },
    routeAnchorLine: (state) => {
      const linestring = baseLineString()
      const geom: number[][] = []
      state.editorLinks.features.forEach(link => {
        const inBetween = link.properties.anchors || []
        // only first node as last node for an iteration is first for the other.
        if (geom.length === 0) { geom.push(link.geometry.coordinates[0]) }
        geom.push(...inBetween)
        geom.push(...link.geometry.coordinates.slice(-1))
      })
      linestring.features = [createLinestringFeature(geom)]
      return linestring
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
