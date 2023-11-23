/* eslint-disable no-case-declarations */
/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore } from 'pinia'

import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import booleanContains from '@turf/boolean-contains'
import booleanCrosses from '@turf/boolean-crosses'
import Linestring from 'turf-linestring'
import Point from 'turf-point'
import bearing from '@turf/bearing'
import { serializer } from '@comp/utils/serializer.js'
import { IndexAreDifferent } from '@comp/utils/utils.js'
import { cloneDeep } from 'lodash'
import { toRaw } from 'vue'

import short from 'short-uuid'

const $gettext = s => s

// eslint-disable-next-line max-len
const defaultrCstAttributes = ['a', 'b', 'index', 'length', 'route_color', 'oneway', 'route_width', 'highway', 'cycleway', 'cycleway_reverse', 'incline']
const defaultrUndeletable = ['index', 'a', 'b', 'length', 'route_color', 'oneway', 'time', 'speed', 'time_r', 'speed_r']

export const userLinksStore = defineStore('rlinks', {
  state: () => ({
    rlinks: {},
    rnodes: {},
    rlinksHeader: {},
    rnodesHeader: {},
    selectedrFilter: '',
    selectedrGroup: [],
    filteredrCategory: [],
    rlineAttributes: [],
    rnodeAttributes: [],
    newrNode: {},
    visiblerLinks: {},
    renderedrLinks: {},
    visiblerNodes: {},
    renderedrNodes: {},
    connectedLinks: [],
    defaultHighway: 'quenedi',
    roadSpeed: 20,
    rlinksDefaultColor: '2196F3',
    rlinksAttributesChoices: {},
    // those are the list of attributes we do not want to duplicated with _r.
    rcstAttributes: defaultrCstAttributes,
    rundeletable: defaultrUndeletable,
    reversedAttributes: [],
  }),

  actions: {
    initrLinks () {
      this.rlinksAttributesChoices = {}
      this.rlineAttributes = []
      this.rnodeAttributes = []
      this.rcstAttributes = cloneDeep(defaultrCstAttributes)
      this.rundeletable = cloneDeep(defaultrUndeletable)
      this.rseversedAttributes = []
    },

    loadrLinks (payload) {
      this.rlinks = cloneDeep(payload)
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(this.rlinks.crs.properties.name)) {
        const rlinksHeader = cloneDeep(this.rlinks)
        rlinksHeader.features = []
        this.rlinksHeader = rlinksHeader
        this.visiblerLinks = cloneDeep(rlinksHeader)
        this.renderedrLinks = cloneDeep(rlinksHeader)
        // limit geometry precision to 6 digit
        this.rlinks.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
          points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))
        this.filteredrCategory = []
        this.selectedrGroup = []
        this.getrLinksProperties()
        this.splitOneway()
        // set all trips visible
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadrNodes (payload) {
      this.rnodes = JSON.parse(JSON.stringify(payload))
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(this.rnodes.crs.properties.name)) {
        const rnodesHeader = cloneDeep(this.rnodes)
        rnodesHeader.features = []
        this.rnodesHeader = rnodesHeader
        this.visiblerNodes = cloneDeep(rnodesHeader)
        this.renderedrNodes = cloneDeep(rnodesHeader)
        // limit geometry precision to 6 digit
        this.rnodes.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
          coord => Math.round(Number(coord) * 1000000) / 1000000))

        this.getrNodesProperties()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadRoadFiles (payload) {
      // payload = [{path,content},...]
      // get rlinks. check that index are not duplicated, serialize them and then append to project
      // get rnodes. check that index are not duplicated, serialize them and then append to project

      for (const file of payload) {
        const currentType = file.content.features[0].geometry.type
        if (currentType === 'LineString') {
          if (IndexAreDifferent(file.content, this.rlinks)) {
            this.appendNewrLinks(serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        } else if (currentType === 'Point') {
          if (IndexAreDifferent(file.content, this.rnodes)) {
            this.appendNewrNodes(serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        }
      }
    },

    appendNewrLinks (payload) {
      // append new links and node to the project (import page)
      payload.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
        points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))

      payload.features.forEach(link => this.rlinks.features.push(link))
      this.getrLinksProperties()
      this.splitOneway()
      this.getFilteredrCat()
    },

    appendNewrNodes (payload) {
      // append new links and node to the project (import page)
      payload.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
        coord => Math.round(Number(coord) * 1000000) / 1000000))

      payload.features.forEach(node => this.rnodes.features.push(node))
      this.splitOneway()
      this.getrNodesProperties()
    },

    getrLinksProperties () {
      let header = new Set([])
      this.rlinks.features.forEach(element => {
        Object.keys(element.properties).forEach(key => { if (!key.endsWith('_r')) header.add(key) })
      })
      // header.delete('index')
      // add all default attributes

      const defaultAttributes = [
        'index', 'a', 'b', 'route_color']
      defaultAttributes.forEach(att => header.add(att))
      this.rlineAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      this.rlineAttributes = header
      if (header.includes('highway')) {
        this.selectedrFilter = 'highway'
      } else {
        this.selectedrFilter = header[0]
      }
    },
    getrNodesProperties () {
      let header = new Set([])
      this.rnodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = ['index']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      this.rnodeAttributes = header
    },

    loadrLinksAttributesChoices (payload) {
      // eslint-disable-next-line no-return-assign
      Object.keys(payload).forEach(key => this.rlinksAttributesChoices[key] = payload[key])
      const attrs = Object.keys(this.rlinksAttributesChoices) // all attrbutes in attributesChoices
      let newAttrs = attrs.filter(item => !this.rlineAttributes.includes(item)) // ones not in rlinks
      // in all new attrs. put as cst the ones that does not have a _r defined. (dont create one.)
      const reversedAttrs = attrs.filter(item => item.endsWith('_r'))
      let cstAttrs = attrs.filter(attr => !reversedAttrs.includes(attr + '_r'))
      cstAttrs = cstAttrs.filter(attr => !this.rcstAttributes.includes(attr)) // not already there
      cstAttrs.forEach(attr => this.rcstAttributes.push(attr)) // push as constant
      newAttrs = newAttrs.filter(item => !item.endsWith('_r'))
      // if an attribute is not desined in its _r variant. we do not create a _r attrivbute
      // add eeach not _r attributes in the attributes.
      newAttrs.forEach(item => this.addRoadPropertie({ table: 'rlinks', name: item }))
    },

    addRoadPropertie (payload) {
      // when a new line properties is added (in dataframe page)
      if (payload.table === 'rlinks') {
        this.rlinks.features.map(link => link.properties[payload.name] = null)
        this.visiblerLinks.features.map(link => link.properties[payload.name] = null)
        this.rlineAttributes.push(payload.name) // could put that at applied. so we can cancel
        // add reverse attribute if its not one we dont want to duplicated (ex: route_width)
        if (!this.rcstAttributes.includes(payload.name)) {
          this.reversedAttributes.push(payload.name + '_r')
        }
      } else {
        this.rnodes.features.map(node => node.properties[payload.name] = null)
        this.visiblerNodes.features.map(node => node.properties[payload.name] = null)
        this.rnodeAttributes.push(payload.name)
      }
    },
    deleteRoadPropertie (payload) {
      if (payload.table === 'rlinks') {
        this.rlinks.features.filter(link => delete link.properties[payload.name])
        this.rlinks.features.filter(link => delete link.properties[payload.name + '_r'])
        this.visiblerLinks.features.filter(link => delete link.properties[payload.name])
        this.visiblerLinks.features.filter(link => delete link.properties[payload.name + '_r'])

        this.rlineAttributes = this.rlineAttributes.filter(item => item !== payload.name)
        this.reversedAttributes = this.reversedAttributes.filter(item => item !== payload.name + '_r')
      } else {
        this.rnodes.features.filter(node => delete node.properties[payload.name])
        this.visiblerNodes.features.filter(node => delete node.properties[payload.name])
      }
    },

    changeSelectedrFilter (payload) {
      this.selectedrFilter = payload
      this.getFilteredrCat()
    },
    getFilteredrCat () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.rlinks.features.map(
        item => item.properties[this.selectedrFilter])))
      this.filteredrCategory = val
    },
    splitOneway () {
      if (this.rlineAttributes.includes('oneway')) {
        this.rlinks.features.forEach(link => {
          if ([true, 'true', '1', 1].includes(link.properties.oneway)) {
            link.properties.oneway = '1'
          } else {
            link.properties.oneway = '0'
          }
        })
        // const oneways = this.rlinks.features.filter(link => !link.properties.oneway)
        this.reversedAttributes = this.rlineAttributes.filter(
          attr => !this.rcstAttributes.includes(attr)).map(
          attr => attr + '_r')
        this.rlinks.features.forEach(link => {
          if (link.properties.oneway === '0') {
            this.reversedAttributes.forEach(attr => {
              if (!link.properties[attr]) link.properties[attr] = link.properties[attr.slice(0, -2)]
            })
          }
        },
        )
      }
    },

    changeVisibleRoads (payload) {
      // trips list of visible trip_id.
      const method = payload.method
      const data = payload.data
      const cat = payload.category
      this.selectedrFilter = cat
      let tempLinks = null
      switch (method) {
        case 'showAll':
          this.selectedrGroup = data
          // need to slice. so it doest change if we append to rlinks.
          this.visiblerLinks.features = this.rlinks.features.slice()
          break
        case 'hideAll':
          this.selectedrGroup = data
          this.visiblerLinks.features = []
          break
        case 'add':
          if (!this.selectedrGroup.includes(data[0])) {
            this.selectedrGroup.push(data[0])
          }
          tempLinks = this.rlinks.features.filter(
            link => link.properties[cat] === data[0])
          // this.visiblerLinks.features.push(...tempLinks) will crash with large array (stack size limit)
          tempLinks.forEach(link => this.visiblerLinks.features.push(link))
          break
        case 'remove':
          this.selectedrGroup = this.selectedrGroup.filter(el => el !== data[0])
          tempLinks = new Set(this.visiblerLinks.features.filter(
            link => link.properties[cat] === data[0]))
          this.visiblerLinks.features = this.visiblerLinks.features.filter(link => !tempLinks.has(link))
          break
      }
      this.getVisiblerNodes({ method })
    },

    refreshVisibleRoads () {
      const group = new Set(this.selectedrGroup)
      const cat = this.selectedrFilter
      this.visiblerLinks.features = this.rlinks.features.filter(link => group.has(link.properties[cat]))
      this.getVisiblerNodes({ method: 'add' })
      // when we rename a group (highway => test), are rename many group.
      // remove nonexistant group in the selected group.
      const possibleGroups = new Set(this.visiblerLinks.features.map(
        item => item.properties[cat]))
      this.selectedrGroup = [...possibleGroups].filter(x => group.has(x))
    },
    getVisiblerNodes (payload) {
      // payload contain nodes. this.nodes or this.editorNodes
      // find the nodes in the editor links
      let a = []
      let b = []
      let rNodesList = []
      switch (payload.method) {
        case 'showAll':
          this.visiblerNodes.features = this.rnodes.features
          break
        case 'hideAll':
          this.visiblerNodes.features = []
          break
        case 'add':
          // cannot simply remove the nodes from the deleted links. they can be used by others visibles links
          a = this.visiblerLinks.features.map(item => item.properties.a)
          b = this.visiblerLinks.features.map(item => item.properties.b)
          rNodesList = new Set([...a, ...b])
          // use rnodes as they are new to visiblerNodes
          this.visiblerNodes.features = this.rnodes.features.filter(
            node => rNodesList.has(node.properties.index))
          break
        case 'remove' :
          // cannot simply remove the nodes from the deleted links. they can be used by others visibles links
          a = this.visiblerLinks.features.map(item => item.properties.a)
          b = this.visiblerLinks.features.map(item => item.properties.b)
          rNodesList = new Set([...a, ...b])
          // use visibleRnodes, as they are already inside of it.
          this.visiblerNodes.features = this.visiblerNodes.features.filter(
            node => rNodesList.has(node.properties.index))
          break
        // case 'refresh'
      }
    },
    getRenderedrLinks (payload) {
      const bbox = toRaw(payload.bbox)
      this.renderedrLinks.features = this.visiblerLinks.features.filter(
        link => (booleanContains(bbox, link) || booleanCrosses(bbox, link)))
      this.getRenderedrNodes()
    },
    getRenderedrNodes () { // get rendered nodes
      const a = this.renderedrLinks.features.map(item => item.properties.a)
      const b = this.renderedrLinks.features.map(item => item.properties.b)
      const rNodesList = new Set([...a, ...b])
      // filter with rnodesList
      this.renderedrNodes.features = this.visiblerNodes.features.filter(node => rNodesList.has(node.properties.index))
    },
    setRenderedrLinks (payload) {
      if (payload.method === 'visible') {
        this.renderedrLinks.features = this.visiblerLinks.features
        this.renderedrNodes.features = []
      } else {
        this.renderedrLinks.features = []
        this.renderedrNodes.features = []
      }
    },

    editrLinkInfo (payload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedLinkId, info } = payload
      for (let i = 0; i < selectedLinkId.length; i++) {
        const props = Object.keys(info[i])
        const link = this.renderedrLinks.features.filter((link) => link.properties.index === selectedLinkId[i])[0]
        // if we change a one way to a 2 way, copy one way properties to the reverse one.
        if ((info[i].oneway?.value !== link.properties.oneway) && (info[i].oneway?.value === '0')) {
          this.reversedAttributes.forEach(
            (rkey) => link.properties[rkey] = info[i][rkey.slice(0, -2)].value)
        } else if ((info[i].oneway?.value !== link.properties.oneway) && (info[i].oneway?.value === '1')) {
          this.reversedAttributes.forEach(
            (rkey) => delete link.properties[rkey])
        }
        // applied all properties.
        props.forEach((key) => link.properties[key] = info[i][key].value)
      }
    },

    editrNodeInfo (payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedNodeId, info } = payload
      const props = Object.keys(info)
      this.rnodes.features.filter(
        // eslint-disable-next-line array-callback-return
        function (node) {
          if (node.properties.index === selectedNodeId) {
            props.forEach((key) => node.properties[key] = info[key].value)
          }
        },
      )
    },

    createNewrNode (payload) {
      const newNode = cloneDeep(this.rnodesHeader)
      const nodeProperties = {}
      this.rnodeAttributes.forEach(key => {
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
      this.newrNode = newNode
    },
    splitrLink (payload) {
      // changing link1 change editorLinks as it is an observer.
      const link1 = payload.selectedFeature
      const link2 = cloneDeep(link1)
      // distance du point (entre 0 et 1) sur le lien original
      const ratio = payload.offset

      link1.properties.b = this.newrNode.features[0].properties.index
      link1.geometry.coordinates = [
        ...link1.geometry.coordinates.slice(0, payload.sliceIndex),
        this.newrNode.features[0].geometry.coordinates,
      ]

      link1.properties.index = 'link_' + short.generate() // link1.properties.index+ '-1'
      link1.properties.length = link1.properties.length * ratio
      link1.properties.time = link1.properties.time * ratio
      if (link1.properties.length_r) link1.properties.length_r = link1.properties.length
      if (link1.properties.time_r) link1.properties.time_r = link1.properties.time

      link2.properties.a = this.newrNode.features[0].properties.index
      link2.geometry.coordinates = [
        this.newrNode.features[0].geometry.coordinates,
        ...link2.geometry.coordinates.slice(payload.sliceIndex),
      ]
      link2.properties.index = 'rlink_' + short.generate() // link2.properties.index+ '-2'
      link2.properties.length = link2.properties.length * (1 - ratio)
      link2.properties.time = link2.properties.time * (1 - ratio)
      if (link2.properties.length_r) link2.properties.length_r = link2.properties.length
      if (link2.properties.time_r) link2.properties.time_r = link2.properties.time

      this.visiblerLinks.features.push(link2)
      this.renderedrLinks.features.push(link2)
      // update actual rlinks and rnodes
      this.rlinks.features.filter((link) => link.properties.index === link1.properties.index)[0] = link1
      this.rlinks.features.push(link2)
    },

    addRoadNodeInline (payload) {
      // selectedLink : list of links index
      // lngLat : object wit click geometry
      // nodes : str. name of node to add (rnode, anchorrNodeS)
      const selectedFeatures = this.renderedrLinks.features
        .filter((link) => payload.selectedIndex.includes(link.properties.index))
      // for loop. for each selectedc links add the node and split.
      for (let i = 0; i < selectedFeatures.length; i++) {
        const linkGeom = Linestring(selectedFeatures[i].geometry.coordinates)
        const clickedPoint = Point(Object.values(payload.lngLat))
        const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
        const dist = length(linkGeom, { units: 'kilometers' }) // dist
        // for multiString, gives the index of the closest one, add +1 for the slice.
        const sliceIndex = snapped.properties.index + 1
        const offset = snapped.properties.location / dist
        if (payload.nodes === 'rnodes') {
          // only add one node, takes the first one.
          if (i === 0) {
            this.createNewrNode(snapped.geometry.coordinates)
            this.rnodes.features.push(this.newrNode.features[0])
            this.visiblerNodes.features.push(this.newrNode.features[0])
            this.renderedrNodes.features.push(this.newrNode.features[0])
          }
          this.splitrLink({ selectedFeature: selectedFeatures[i], offset, sliceIndex })

        // Anchor Nodes
        } else {
          this.addAnchorrNode({
            selectedLink: selectedFeatures[i],
            coordinates: snapped.geometry.coordinates,
            sliceIndex,
          })
        }
      }
    },
    addAnchorrNode (payload) {
      const linkIndex = payload.selectedLink.properties.index
      const featureIndex = this.renderedrLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change visible rLinks as it is an observer.
      const link = this.renderedrLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },
    createrLink (payload) {
      // nodeIdA: node id, nodeIdB: node id, geom: array geom where we clicked, layerId: str. the layer id rnodes, rlinks
      // 3 cases.
      // 1) click on the map. create a node b then connect.
      // 2) click on a node. create a link between node a and b
      // 3) click on a link. create node inline b then create link a to b.
      // create a node if we click on the map (case 1)
      if (!payload.nodeIdB) {
        this.createNewrNode(payload.geom)
        this.visiblerNodes.features.push(this.newrNode.features[0])
        this.renderedrNodes.features.push(this.newrNode.features[0])
        this.rnodes.features.push(this.newrNode.features[0])
        payload.nodeIdB = this.newrNode.features[0].properties.index
      } else if (payload.layerId === 'rlinks') {
        // create a node inline and then the new link
        this.addRoadNodeInline({ selectedIndex: payload.nodeIdB, lngLat: payload.geom, nodes: 'rnodes' })
        payload.nodeIdB = this.newrNode.features[0].properties.index
      }
      const rnodeA = this.visiblerNodes.features.filter(node => node.properties.index === payload.nodeIdA)[0]
      const rnodeB = this.visiblerNodes.features.filter(node => node.properties.index === payload.nodeIdB)[0]

      const linkGeometry = {
        coordinates: [rnodeA.geometry.coordinates, rnodeB.geometry.coordinates],
        type: 'LineString',
      }

      const linkProperties = {}
      // set default links values
      this.rlineAttributes.forEach((key) => linkProperties[key] = null)
      linkProperties.index = 'rlink_' + short.generate()
      linkProperties.a = payload.nodeIdA
      linkProperties.b = payload.nodeIdB
      linkProperties.highway = this.defaultHighway // quenedi
      linkProperties.route_color = this.rlinksDefaultColor
      // add length, speed, time now that we have a geometry.
      const distance = length(linkGeometry)
      const time = distance / this.roadSpeed * 3600 // 20kmh hard code speed. time in secs
      linkProperties.length = Number((distance * 1000).toFixed(0)) // metres
      linkProperties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      linkProperties.speed = Number(this.roadSpeed) // rounded to 0 decimals
      if (this.rlineAttributes.includes('oneway')) {
        linkProperties.oneway = '0'
        this.reversedAttributes.forEach(
          (rkey) => linkProperties[rkey] = linkProperties[rkey.slice(0, -2)])
      }

      const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
      this.rlinks.features.push(linkFeature)

      // add newly generated group (i.e. highway == quenedi), to visibles checked groups.
      const newLinkGroup = linkProperties[this.selectedrFilter]
      if (!this.filteredrCategory.includes(newLinkGroup)) {
        this.filteredrCategory.push(newLinkGroup)
      }
      if (!this.selectedrGroup.includes(newLinkGroup)) {
        // if its not already selected, push it.
        this.visiblerLinks.features.push(linkFeature)
        this.renderedrLinks.features.push(linkFeature)
        this.selectedrGroup.push(newLinkGroup)
      } else {
        this.visiblerLinks.features.push(linkFeature)
        this.renderedrLinks.features.push(linkFeature)
      }
    },

    getConnectedLinks (payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // get links connected to the node
      // use rLinks as we could moidified links that are not visible moving a node.
      this.connectedLinks = {
        b: this.rlinks.features.filter(link => link.properties.b === nodeIndex),
        a: this.rlinks.features.filter(link => link.properties.a === nodeIndex),
      }
    },
    moverNode (payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // remove node
      const newNode = this.renderedrNodes.features.filter(node => node.properties.index === nodeIndex)[0]
      newNode.geometry.coordinates = payload.lngLat

      // changing links

      // update links geometry. check if exist first (if we take the first|last node there is only 1 link)
      this.connectedLinks.b.forEach(link => {
        // note: props are unchanged. even tho the length change, the time and length are unchanged.
        link.geometry.coordinates = [...link.geometry.coordinates.slice(0, -1), payload.lngLat]
        // update time and distance
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        // const time = distance / this.roadSpeed * 3600 // 20kmh hard code speed. time in secs
        const time = distance / link.properties.speed * 3600
        link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
        // add reverse direction time and length if it exist on the link
        if (link.properties.time_r) {
          const rtime = distance / link.properties.speed_r * 3600
          link.properties.time_r = Number(rtime.toFixed(0)) // rounded to 0 decimals
        }
        if (link.properties.length_r) link.properties.length_r = link.properties.length
      })
      this.connectedLinks.a.forEach(link => {
        link.geometry.coordinates = [payload.lngLat, ...link.geometry.coordinates.slice(1)]
        // update time and distance
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        // const time = distance / this.roadSpeed * 3600 // 20kmh hard code speed. time in secs
        const time = distance / link.properties.speed * 3600
        link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
        // add reverse direction time and length if it exist on the link
        if (link.properties.time_r) {
          const rtime = distance / link.properties.speed_r * 3600
          link.properties.time_r = Number(rtime.toFixed(0)) // rounded to 0 decimals
        }
        if (link.properties.length_r) link.properties.length_r = link.properties.length
      })
    },
    moverAnchor (payload) {
      const linkIndex = payload.selectedNode.properties.linkIndex
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex
      const link = this.renderedrLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      // update time and distance
      const distance = length(link)
      link.properties.length = Number((distance * 1000).toFixed(0)) // metres
      const time = distance / this.roadSpeed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },
    deleteAnchorrNode (payload) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = this.renderedrLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },
    deleterLink (payload) {
      const linkArr = new Set(payload.selectedIndex)
      this.rlinks.features = this.rlinks.features.filter(link => !linkArr.has(link.properties.index))
      this.visiblerLinks.features = this.visiblerLinks.features.filter(link => !linkArr.has(link.properties.index))
      this.renderedrLinks.features = this.renderedrLinks.features.filter(link => !linkArr.has(link.properties.index))
      this.deleteUnusedrNodes()
      this.getVisiblerNodes({ method: 'remove' })
      this.getRenderedrNodes()
      this.getFilteredrCat()
    },
    deleterGroup (payload) {
      const group = payload
      const cat = this.selectedrFilter
      this.rlinks.features = this.rlinks.features.filter(link => link.properties[cat] !== group)
      this.refreshVisibleRoads()
      this.deleteUnusedrNodes()
      this.getFilteredrCat()
    },
    deleteUnusedrNodes () {
      // delete every every nodes not in links
      const a = this.rlinks.features.map(item => item.properties.a)
      const b = this.rlinks.features.map(item => item.properties.b)
      const nodesInLinks = new Set([...a, ...b])
      this.rnodes.features = this.rnodes.features.filter(node => nodesInLinks.has(node.properties.index))
    },

    editrGroupInfo (payload) {
      // edit line info on multiple trips at once.
      const groupInfo = payload.info
      const selectedLinks = payload.selectedLinks // observer of this.links
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(groupInfo).filter(key =>
        ((groupInfo[key].value !== '') || !groupInfo[key].placeholder))

      // if we change everything to 2 way. init links thats were one way with thoses values (ex:speed_r = speed)
      if (groupInfo.oneway?.value === '0') {
        const linksToSplit = selectedLinks.filter(link => link.properties.oneway === '1')
        linksToSplit.forEach(link => {
          this.reversedAttributes.forEach(
            (rkey) => link.properties[rkey] = link.properties[rkey.slice(0, -2)])
        })
        // delete reverse attribute for links going from 2 ways to one way
      } else if (groupInfo.oneway?.value === '1') {
        const linksToSplit = selectedLinks.filter(link => link.properties.oneway === '0')
        linksToSplit.forEach(link => {
          this.reversedAttributes.forEach(
            (rkey) => delete link.properties[rkey])
        })
      }

      // this is an oberver. modification will be applied to this.links.
      selectedLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = groupInfo[key].value))
      //  apply the group modification to the reverse links too (ex: speed = 10 and speed_r = 10)
      if (this.rlineAttributes.includes('oneway')) {
        const reversedProps = this.reversedAttributes.filter(rkey => props.includes(rkey.slice(0, -2)))
        selectedLinks.filter(link => link.properties.oneway === '0').forEach(
          (features) => reversedProps.forEach((rkey) => features.properties[rkey] = groupInfo[rkey.slice(0, -2)].value),
        )
      }
      this.refreshVisibleRoads()
      this.getFilteredrCat()
    },

  },

  getters: {
    rlinksIsEmpty: (state) => state.rlinks.features.length === 0,
    hasCycleway: (state) => state.rlineAttributes.includes('cycleway'),

    anchorrNodes: (state) => {
      const nodes = cloneDeep(state.rnodesHeader)
      state.renderedrLinks.features.filter(link => link.geometry.coordinates.length > 2).forEach(
        feature => {
          const linkIndex = feature.properties.index
          feature.geometry.coordinates.slice(1, -1).forEach(
            (point, idx) => nodes.features.push(Point(
              point,
              { index: short.generate(), linkIndex, coordinatedIndex: idx + 1 },
            ),
            ),

          )
        },
      )

      return nodes
    },
    rlinkDirection: (state) => (indexList, reversed = false) => {
      const links = state.rlinks.features.filter(link => indexList.includes(link.properties.index))
      const res = []
      links.forEach(link => {
        const geom = link.geometry.coordinates
        if (reversed) {
          res.push(bearing(geom[geom.length - 1], geom[0]))
        } else {
          res.push(bearing(geom[0], geom[geom.length - 1]))
        }
      })
      return res
    },
    grouprLinks: (state) => (category, group) => {
      return state.rlinks.features.filter(link => group === link.properties[category])
    },
    onewayIndex: (state) => {
      return new Set(state.rlinks.features.filter(
        link => link.properties.oneway === '0').map(
        link => link.properties.index))
    },
    rlinksForm: (state) => (linkIndex) => {
      const uneditable = ['a', 'b', 'index']
      const editorForm = state.visiblerLinks.features.filter(
        (link) => link.properties.index === linkIndex)[0].properties

      // filter properties to only the one that are editable.
      const form = {}
      state.rlineAttributes.forEach(key => {
        form[key] = {
          value: editorForm[key],
          disabled: uneditable.includes(key),
          placeholder: false,
        }
      })
      return form
    },
    reversedrLinksForm: (state) => (linkIndex) => {
      const uneditable = ['a', 'b', 'index']
      const editorForm = state.visiblerLinks.features.filter(
        (link) => link.properties.index === linkIndex)[0].properties

      // filter properties to only the one that are editable.
      const form = {}
      state.reversedAttributes.forEach(key => {
        form[key] = {
          value: editorForm[key],
          disabled: uneditable.includes(key),
          placeholder: false,
        }
      })
      return form
    },
  },
})
