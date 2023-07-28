/* eslint-disable no-case-declarations */
/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import length from '@turf/length'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import Linestring from 'turf-linestring'
import Point from 'turf-point'
import bearing from '@turf/bearing'
import { serializer } from '@comp/utils/serializer.js'
import { IndexAreDifferent } from '@comp/utils/utils.js'
const $gettext = s => s

const short = require('short-uuid')

export default {
  state: {
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
    visiblerNodes: {},
    connectedLinks: [],
    defaultHighway: 'quenedi',
    roadSpeed: 20,
    rlinksDefaultColor: '2196F3',
    // those are the list of attributes we do not want to duplicated with _r.
    rcstAttributes: ['a', 'b', 'index', 'length', 'route_color', 'oneway', 'route_width', 'highway', 'cycleway', 'cycleway_reverse', 'incline'],
    rundeletable: ['index', 'a', 'b', 'length', 'route_color', 'oneway', 'time', 'speed', 'time_r', 'speed_r'],
    reversedAttributes: [],
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
        this.commit('splitOneway')
        // set all trips visible
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
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadRoadFiles (state, payload) {
      // payload = [{path,content},...]
      // get rlinks. check that index are not duplicated, serialize them and then append to project
      // get rnodes. check that index are not duplicated, serialize them and then append to project

      for (const file of payload) {
        const currentType = file.content.features[0].geometry.type
        if (currentType === 'LineString') {
          if (IndexAreDifferent(file.content, state.rlinks)) {
            this.commit('appendNewrLinks', serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        } else if (currentType === 'Point') {
          if (IndexAreDifferent(file.content, state.rnodes)) {
            this.commit('appendNewrNodes', serializer(file.content, file.path, currentType))
          } else {
            const err = new Error($gettext(' there is duplicated index, ') + file.path)
            err.name = 'ImportError'
            throw err
          }
        }
      }
    },

    appendNewrLinks (state, payload) {
      // append new links and node to the project (import page)
      payload.features.forEach(link => link.geometry.coordinates = link.geometry.coordinates.map(
        points => points.map(coord => Math.round(Number(coord) * 1000000) / 1000000)))

      payload.features.forEach(link => state.rlinks.features.push(link))
      this.commit('getrLinksProperties')
      this.commit('splitOneway')
      this.commit('getFilteredrCat')
    },

    appendNewrNodes (state, payload) {
      // append new links and node to the project (import page)
      payload.features.forEach(node => node.geometry.coordinates = node.geometry.coordinates.map(
        coord => Math.round(Number(coord) * 1000000) / 1000000))

      payload.features.forEach(node => state.rnodes.features.push(node))
      this.commit('splitOneway')
      this.commit('getrNodesProperties')
    },

    unloadrFiles (state) {
      // when we reload files (some were already loaded.)
      state.rlinks.features = []
      state.rnodes.features = []
      state.visiblerLinks.features = []
      state.visiblerNodes.features = []
      state.selectedrGroup = []
    },
    getrLinksProperties (state) {
      let header = new Set([])
      state.rlinks.features.forEach(element => {
        Object.keys(element.properties).forEach(key => { if (!key.endsWith('_r')) header.add(key) })
      })
      // header.delete('index')
      // add all default attributes
      const defaultAttributes = [
        'index', 'a', 'b', 'route_color']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.rlineAttributes = header
      if (header.includes('highway')) {
        state.selectedrFilter = 'highway'
      } else {
        state.selectedrFilter = header[0]
      }
    },
    getrNodesProperties (state) {
      let header = new Set([])
      state.rnodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = ['index']
      defaultAttributes.forEach(att => header.add(att))
      header = Array.from(header)
      state.rnodeAttributes = header
    },
    addRoadPropertie (state, payload) {
      // when a new line properties is added (in dataframe page)
      if (payload.table === 'rlinks') {
        state.rlinks.features.map(link => link.properties[payload.name] = null)
        state.visiblerLinks.features.map(link => link.properties[payload.name] = null)
        state.rlineAttributes.push(payload.name) // could put that at applied. so we can cancel
        // add reverse attribute if its not one we dont want to duplicated (ex: route_width)
        if (!state.rcstAttributes.includes(payload.name)) {
          state.reversedAttributes.push(payload.name + '_r')
        }
      } else {
        state.rnodes.features.map(node => node.properties[payload.name] = null)
        state.visiblerNodes.features.map(node => node.properties[payload.name] = null)
        state.rnodeAttributes.push(payload.name)
      }
    },
    deleteRoadPropertie (state, payload) {
      if (payload.table === 'rlinks') {
        state.rlinks.features.filter(link => delete link.properties[payload.name])
        state.rlinks.features.filter(link => delete link.properties[payload.name + '_r'])
        state.visiblerLinks.features.filter(link => delete link.properties[payload.name])
        state.visiblerLinks.features.filter(link => delete link.properties[payload.name + '_r'])

        state.rlineAttributes = state.rlineAttributes.filter(item => item !== payload.name)
        state.reversedAttributes = state.reversedAttributes.filter(item => item !== payload.name + '_r')
      } else {
        state.rnodes.features.filter(node => delete node.properties[payload.name])
        state.visiblerNodes.features.filter(node => delete node.properties[payload.name])
      }
    },

    changeSelectedrFilter (state, payload) {
      state.selectedrFilter = payload
      this.commit('getFilteredrCat')
    },
    getFilteredrCat (state) {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(state.rlinks.features.map(
        item => item.properties[state.selectedrFilter])))
      state.filteredrCategory = val
    },
    splitOneway (state) {
      if (state.rlineAttributes.includes('oneway')) {
        state.rlinks.features.forEach(link => {
          if ([true, 'true', '1', 1].includes(link.properties.oneway)) {
            link.properties.oneway = '1'
          } else {
            link.properties.oneway = '0'
          }
        })
        // const oneways = state.rlinks.features.filter(link => !link.properties.oneway)
        state.reversedAttributes = state.rlineAttributes.filter(
          attr => !state.rcstAttributes.includes(attr)).map(
          attr => attr + '_r')
        state.rlinks.features.forEach(link => {
          if (link.properties.oneway === '0') {
            state.reversedAttributes.forEach(attr => {
              if (!link.properties[attr]) link.properties[attr] = link.properties[attr.slice(0, -2)]
            })
          }
        },
        )
      }
    },

    changeVisibleRoads (state, payload) {
      // trips list of visible trip_id.
      const method = payload.method
      const data = payload.data
      const cat = payload.category
      state.selectedrFilter = cat
      let tempLinks = null
      switch (method) {
        case 'showAll':
          state.selectedrGroup = data
          // need to slice. so it doest change if we append to rlinks.
          state.visiblerLinks.features = state.rlinks.features.slice()
          break
        case 'hideAll':
          state.selectedrGroup = data
          state.visiblerLinks.features = []
          break
        case 'add':
          if (!state.selectedrGroup.includes(data[0])) {
            state.selectedrGroup.push(data[0])
          }
          tempLinks = state.rlinks.features.filter(
            link => link.properties[cat] === data[0])
          state.visiblerLinks.features.push(...tempLinks)
          break
        case 'remove':
          state.selectedrGroup = state.selectedrGroup.filter(el => el !== data[0])
          tempLinks = new Set(state.visiblerLinks.features.filter(
            link => link.properties[cat] === data[0]))
          state.visiblerLinks.features = state.visiblerLinks.features.filter(link => !tempLinks.has(link))
          break
      }
      this.commit('getVisiblerNodes', { method: method })
    },

    refreshVisibleRoads (state) {
      const group = new Set(state.selectedrGroup)
      const cat = state.selectedrFilter
      state.visiblerLinks.features = state.rlinks.features.filter(link => group.has(link.properties[cat]))
      this.commit('getVisiblerNodes', { method: 'add' })
      // when we rename a group (highway => test), are rename many group.
      // remove nonexistant group in the selected group.
      const possibleGroups = new Set(state.visiblerLinks.features.map(
        item => item.properties[cat]))
      state.selectedrGroup = [...possibleGroups].filter(x => group.has(x))
    },
    getVisiblerNodes (state, payload) {
      // payload contain nodes. state.nodes or state.editorNodes
      // find the nodes in the editor links
      let a = []
      let b = []
      let rNodesList = []
      switch (payload.method) {
        case 'showAll':
          state.visiblerNodes.features = state.rnodes.features
          break
        case 'hideAll':
          state.visiblerNodes.features = []
          break
        case 'add':
          // cannot simply remove the nodes from the deleted links. they can be used by others visibles links
          a = state.visiblerLinks.features.map(item => item.properties.a)
          b = state.visiblerLinks.features.map(item => item.properties.b)
          rNodesList = new Set([...a, ...b])
          // use rnodes as they are new to visiblerNodes
          state.visiblerNodes.features = state.rnodes.features.filter(
            node => rNodesList.has(node.properties.index))
          break
        case 'remove' :
          // cannot simply remove the nodes from the deleted links. they can be used by others visibles links
          a = state.visiblerLinks.features.map(item => item.properties.a)
          b = state.visiblerLinks.features.map(item => item.properties.b)
          rNodesList = new Set([...a, ...b])
          // use visibleRnodes, as they are already inside of it.
          state.visiblerNodes.features = state.visiblerNodes.features.filter(
            node => rNodesList.has(node.properties.index))
          break
        // case 'refresh'
      }
    },

    editrLinkInfo (state, payload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedLinkId, info } = payload
      for (let i = 0; i < selectedLinkId.length; i++) {
        const props = Object.keys(info[i])
        const link = state.visiblerLinks.features.filter((link) => link.properties.index === selectedLinkId[i])[0]
        // if we change a one way to a 2 way, copy one way properties to the reverse one.
        if ((info[i].oneway?.value !== link.properties.oneway) && (info[i].oneway?.value === '0')) {
          state.reversedAttributes.forEach(
            (rkey) => link.properties[rkey] = info[i][rkey.slice(0, -2)].value)
        } else if ((info[i].oneway?.value !== link.properties.oneway) && (info[i].oneway?.value === '1')) {
          state.reversedAttributes.forEach(
            (rkey) => delete link.properties[rkey])
        }
        // applied all properties.
        props.forEach((key) => link.properties[key] = info[i][key].value)
      }

      this.commit('getEditorLineInfo')
    },

    editrNodeInfo (state, payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedNodeId, info } = payload
      const props = Object.keys(info)
      state.rnodes.features.filter(
        // eslint-disable-next-line array-callback-return
        function (node) {
          if (node.properties.index === selectedNodeId) {
            props.forEach((key) => node.properties[key] = info[key].value)
          }
        },
      )
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
      if (link1.properties.length_r) link1.properties.length_r = link1.properties.length
      if (link1.properties.time_r) link1.properties.time_r = link1.properties.time

      link2.properties.a = state.newrNode.features[0].properties.index
      link2.geometry.coordinates = [
        state.newrNode.features[0].geometry.coordinates,
        ...link2.geometry.coordinates.slice(payload.sliceIndex),
      ]
      link2.properties.index = 'rlink_' + short.generate() // link2.properties.index+ '-2'
      link2.properties.length = link2.properties.length * (1 - ratio)
      link2.properties.time = link2.properties.time * (1 - ratio)
      if (link2.properties.length_r) link2.properties.length_r = link2.properties.length
      if (link2.properties.time_r) link2.properties.time_r = link2.properties.time

      state.visiblerLinks.features.push(link2)
      // update actual rlinks and rnodes
      state.rlinks.features.filter((link) => link.properties.index === link1.properties.index)[0] = link1
      state.rlinks.features.push(link2)
    },

    addRoadNodeInline (state, payload) {
      // selectedLink : list of links index
      // lngLat : object wit click geometry
      // nodes : str. name of node to add (rnode, anchorrNodeS)
      const selectedFeatures = state.visiblerLinks.features
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
            this.commit('createNewrNode', snapped.geometry.coordinates)
            state.visiblerNodes.features.push(state.newrNode.features[0])
            state.rnodes.features.push(state.newrNode.features[0])
          }
          this.commit('splitrLink', { selectedFeature: selectedFeatures[i], offset: offset, sliceIndex: sliceIndex })

        // Anchor Nodes
        } else {
          this.commit('addAnchorrNode', {
            selectedLink: selectedFeatures[i],
            coordinates: snapped.geometry.coordinates,
            sliceIndex: sliceIndex,
          })
        }
      }
    },
    addAnchorrNode (state, payload) {
      const linkIndex = payload.selectedLink.properties.index
      const featureIndex = state.visiblerLinks.features.findIndex(link => link.properties.index === linkIndex)
      // changing link change visible rLinks as it is an observer.
      const link = state.visiblerLinks.features[featureIndex]
      link.geometry.coordinates.splice(payload.sliceIndex, 0, payload.coordinates)
    },
    createrLink (state, payload) {
      // nodeIdA: node id, nodeIdB: node id, geom: array geom where we clicked, layerId: str. the layer id rnodes, rlinks
      // 3 cases.
      // 1) click on the map. create a node b then connect.
      // 2) click on a node. create a link between node a and b
      // 3) click on a link. create node inline b then create link a to b.
      // create a node if we click on the map (case 1)
      if (!payload.nodeIdB) {
        this.commit('createNewrNode', payload.geom)
        state.visiblerNodes.features.push(state.newrNode.features[0])
        state.rnodes.features.push(state.newrNode.features[0])
        payload.nodeIdB = state.newrNode.features[0].properties.index
      } else if (payload.layerId === 'rlinks') {
        // create a node inline and then the new link
        this.commit('addRoadNodeInline', { selectedIndex: payload.nodeIdB, lngLat: payload.geom, nodes: 'rnodes' })
        payload.nodeIdB = state.newrNode.features[0].properties.index
      }
      const rnodeA = state.visiblerNodes.features.filter(node => node.properties.index === payload.nodeIdA)[0]
      const rnodeB = state.visiblerNodes.features.filter(node => node.properties.index === payload.nodeIdB)[0]

      const linkGeometry = {
        coordinates: [rnodeA.geometry.coordinates, rnodeB.geometry.coordinates],
        type: 'LineString',
      }

      const linkProperties = {}
      // set default links values
      state.rlineAttributes.forEach((key) => linkProperties[key] = null)
      linkProperties.index = 'rlink_' + short.generate()
      linkProperties.a = payload.nodeIdA
      linkProperties.b = payload.nodeIdB
      linkProperties.highway = state.defaultHighway // quenedi
      linkProperties.route_color = state.rlinksDefaultColor
      // add length, speed, time now that we have a geometry.
      const distance = length(linkGeometry)
      const time = distance / state.roadSpeed * 3600 // 20kmh hard code speed. time in secs
      linkProperties.length = Number((distance * 1000).toFixed(0)) // metres
      linkProperties.time = Number(time.toFixed(0)) // rounded to 0 decimals
      linkProperties.speed = Number(state.roadSpeed) // rounded to 0 decimals
      if (state.rlineAttributes.includes('oneway')) {
        linkProperties.oneway = '0'
        state.reversedAttributes.forEach(
          (rkey) => linkProperties[rkey] = linkProperties[rkey.slice(0, -2)])
      }

      const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
      state.rlinks.features.push(linkFeature)

      // add newly generated group (i.e. highway == quenedi), to visibles checked groups.
      const newLinkGroup = linkProperties[state.selectedrFilter]
      if (!state.filteredrCategory.includes(newLinkGroup)) {
        state.filteredrCategory.push(newLinkGroup)
      }
      if (!state.selectedrGroup.includes(newLinkGroup)) {
        // if its not already selected, push it.
        state.selectedrGroup.push(newLinkGroup)
      } else {
        state.visiblerLinks.features.push(linkFeature)
      }
    },

    getConnectedLinks (state, payload) {
      const nodeIndex = payload.selectedNode.properties.index
      // get links connected to the node
      // use rLinks as we could moidified links that are not visible moving a node.
      state.connectedLinks = {
        b: state.rlinks.features.filter(link => link.properties.b === nodeIndex),
        a: state.rlinks.features.filter(link => link.properties.a === nodeIndex),
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
        // const time = distance / state.roadSpeed * 3600 // 20kmh hard code speed. time in secs
        const time = distance / link.properties.speed * 3600
        link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
        // add reverse direction time and length if it exist on the link
        if (link.properties.time_r) {
          const rtime = distance / link.properties.speed_r * 3600
          link.properties.time_r = Number(rtime.toFixed(0)) // rounded to 0 decimals
        }
        if (link.properties.length_r) link.properties.length_r = link.properties.length
      })
      state.connectedLinks.a.forEach(link => {
        link.geometry.coordinates = [payload.lngLat, ...link.geometry.coordinates.slice(1)]
        // update time and distance
        const distance = length(link)
        link.properties.length = Number((distance * 1000).toFixed(0)) // metres
        // const time = distance / state.roadSpeed * 3600 // 20kmh hard code speed. time in secs
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
      const time = distance / state.roadSpeed * 3600 // 20kmh hard code speed. time in secs
      link.properties.time = Number(time.toFixed(0)) // rounded to 0 decimals
    },
    deleteAnchorrNode (state, payload) {
      const linkIndex = payload.selectedNode.linkIndex
      const coordinatedIndex = payload.selectedNode.coordinatedIndex
      const link = state.visiblerLinks.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },
    deleterLink (state, payload) {
      const linkArr = new Set(payload.selectedIndex)
      state.rlinks.features = state.rlinks.features.filter(link => !linkArr.has(link.properties.index))
      state.visiblerLinks.features = state.visiblerLinks.features.filter(link => !linkArr.has(link.properties.index))
      this.commit('getVisiblerNodes', { method: 'remove' })
      this.commit('deleteUnusedrNodes')
      this.commit('getFilteredrCat')
    },
    deleterGroup (state, payload) {
      const group = payload
      const cat = state.selectedrFilter
      state.rlinks.features = state.rlinks.features.filter(link => link.properties[cat] !== group)
      this.commit('refreshVisibleRoads')
      this.commit('deleteUnusedrNodes')
      this.commit('getFilteredrCat')
    },
    deleteUnusedrNodes (state) {
      // delete every every nodes not in links
      const a = state.rlinks.features.map(item => item.properties.a)
      const b = state.rlinks.features.map(item => item.properties.b)
      const nodesInLinks = new Set([...a, ...b])
      state.rnodes.features = state.rnodes.features.filter(node => nodesInLinks.has(node.properties.index))
    },

    editrGroupInfo (state, payload) {
      // edit line info on multiple trips at once.
      const groupInfo = payload.info
      const selectedLinks = payload.selectedLinks // observer of state.links
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(groupInfo).filter(key =>
        ((groupInfo[key].value !== '') || !groupInfo[key].placeholder))

      // if we change everything to 2 way. init links thats were one way with thoses values (ex:speed_r = speed)
      if (groupInfo.oneway?.value === '0') {
        const linksToSplit = selectedLinks.filter(link => link.properties.oneway === '1')
        linksToSplit.forEach(link => {
          state.reversedAttributes.forEach(
            (rkey) => link.properties[rkey] = link.properties[rkey.slice(0, -2)])
        })
        // delete reverse attribute for links going from 2 ways to one way
      } else if (groupInfo.oneway?.value === '1') {
        const linksToSplit = selectedLinks.filter(link => link.properties.oneway === '0')
        linksToSplit.forEach(link => {
          state.reversedAttributes.forEach(
            (rkey) => delete link.properties[rkey])
        })
      }

      // this is an oberver. modification will be applied to state.links.
      selectedLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = groupInfo[key].value))
      //  apply the group modification to the reverse links too (ex: speed = 10 and speed_r = 10)
      if (state.rlineAttributes.includes('oneway')) {
        const reversedProps = state.reversedAttributes.filter(rkey => props.includes(rkey.slice(0, -2)))
        selectedLinks.filter(link => link.properties.oneway === '0').forEach(
          (features) => reversedProps.forEach((rkey) => features.properties[rkey] = groupInfo[rkey.slice(0, -2)].value),
        )
      }
      this.commit('refreshVisibleRoads')
      this.commit('getFilteredrCat')
    },

  },

  getters: {
    rlinks: (state) => state.rlinks,
    rnodes: (state) => state.rnodes,
    roadSpeed: (state) => state.roadSpeed,
    rlinksHeader: (state) => state.rlinksHeader,
    rnodesHeader: (state) => state.rnodesHeader,
    rlineAttributes: (state) => state.rlineAttributes.sort(),
    selectedrGroup: (state) => state.selectedrGroup,
    selectedrFilter: (state) => state.selectedrFilter,
    filteredrCategory: (state) => state.filteredrCategory,
    visiblerLinks: (state) => state.visiblerLinks,
    visiblerNodes: (state) => state.visiblerNodes,
    defaultHighway: (state) => state.defaultHighway,
    rlinksIsEmpty: (state) => state.rlinks.features.length === 0,
    rcstAttributes: (state) => state.rcstAttributes,
    newrNode: (state) => state.newrNode,
    rundeletable: (state) => state.rundeletable,
    hasCycleway: (state) => state.rlineAttributes.includes('cycleway'),

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
}
