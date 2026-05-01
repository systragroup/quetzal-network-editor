/* eslint-disable no-case-declarations */
/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore, acceptHMRUpdate } from 'pinia'

import { serializer } from '@src/utils/serializer'
import { IndexAreDifferent, getModifiedKeys, getDifference, groupFormToDict,
  getUnusedNodes, deleteUnusedNodes } from '@src/utils/utils'
import { cloneDeep } from 'lodash'

import short from 'short-uuid'
import { AddRoadNodeInlinePayload,
  AttributesChoice, ChangeVisibleLinks, CreateRlinkPayload,
  EditRoadPayload, FilesPayload, MoveNode, NewAttribute, NewNodePayload, NonEmptyArray, RlinksStore,
  SelectedAnchor, SplitRoadPayload } from '@src/types/typesStore'
import { baseLineString, basePoint, LineStringFeatures, LineStringGeoJson,
  PointFeatures,
  PointGeoJson } from '@src/types/geojson'
import { rlinksConstantProperties, rnodesDefaultProperties,
  rlinksDefaultProperties, roadDefaultAttributesChoices } from '@src/constants/properties'
import { simplifyGeometry } from '@src/utils/spatial'
import { _addGeojsonFeatures, _deleteGeojsonFeatures, _editGeojsonFeatures,
  addDefaultValuesToVariants, calcLengthTimeorSpeed, getBaseAttributesWithVariants,
  getDefaultLink, getVariantsChoices,
  snapOnLink } from '@src/utils/network'
import { addReverseProperties, deleteReverseProperties } from '@src/utils/roadNetwork'
const $gettext = (s: string) => s

// import { useHistory } from '@src/composables/useHistory'
// import { toRaw } from 'vue'
// const { commit, state, initHistory, redo, undo } = useHistory({ links: {}, nodes: {} })

interface Commit {
  name: string
  newLinks?: LineStringFeatures[]
  newNodes?: PointFeatures[]
  deleteLinks?: Set<string>
  deleteNodes?: Set<string>
  updateLinks?: LineStringFeatures[]
  updateNodes?: PointFeatures[]
}

export const userLinksStore = defineStore('rlinks', {
  state: (): RlinksStore => ({
    rlinks: baseLineString(),
    rnodes: basePoint(),
    // variant (periods)
    variant: '',
    variantChoice: [''], // should never be empty.
    // Defauts links and nodes properties
    linksDefaultAttributes: cloneDeep(rlinksDefaultProperties),
    nodesDefaultAttributes: cloneDeep(rnodesDefaultProperties),
    rlinksAttributesChoices: cloneDeep(roadDefaultAttributesChoices),
    // Filter
    selectedrFilter: '',
    selectedrGroup: [],
    filteredrCategory: [],
    // to tell mapbox what to dynamicly update
    updateLinks: [],
    updateNodes: [],
    // to Cancel edition
    editionMode: false,
    savedNetwork: { rlinks: '', rnodes: '' },
    networkWasModified: false, // update in Roadlinks.vue when map is updated (updateLinks and others are watch)
    // params
    speedTimeMethod: 'time',
  }),

  actions: {

    commitChanges(payload: Commit) {
      const { name, newLinks, newNodes, deleteLinks, deleteNodes, updateLinks, updateNodes } = payload
      console.log(name)
      if (newLinks) _addGeojsonFeatures(this.rlinks, newLinks)
      if (newNodes) _addGeojsonFeatures(this.rnodes, newNodes)// TODO method for array of nodes
      if (updateLinks) _editGeojsonFeatures(this.rlinks, updateLinks)
      if (updateNodes) _editGeojsonFeatures(this.rnodes, updateNodes) // TODO method for array of nodes
      if (deleteLinks) _deleteGeojsonFeatures(this.rlinks, deleteLinks)
      if (deleteNodes) _deleteGeojsonFeatures(this.rnodes, deleteNodes)

      // const links = Object.fromEntries(this.rlinks.features.map(item => [item.properties.index, toRaw(item)]))
      // const nodes = Object.fromEntries(this.rnodes.features.map(item => [item.properties.index, toRaw(item)]))
      // commit({ links: links, nodes: nodes }, name)
    },
    // redo() {
    //   if (redo()) {
    //     this.rlinks.features = Object.values(state.value.links).map(el => toRaw(el))
    //     this.rnodes.features = Object.values(state.value.nodes).map(el => toRaw(el))
    //   }
    // },
    // undo() {
    //   if (undo()) {
    //     this.rlinks.features = Object.values(state.value.links).map(el => toRaw(el))
    //     this.rnodes.features = Object.values(state.value.nodes).map(el => toRaw(el))
    //   }
    // },
    //
    // IO
    //
    loadRoadFiles (payload: FilesPayload[]) {
      // payload = [{path,content},...]
      // get rlinks. check that index are not duplicated, serialize them and then append to project
      // get rnodes. check that index are not duplicated, serialize them and then append to project

      for (const file of payload) {
        if (file.content.features.length === 0) { break } // empty file. do nothing
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

    appendNewrLinks (payload: LineStringGeoJson) {
      // append new links and node to the project (import page)
      simplifyGeometry(payload)
      // remove links with a == b
      payload.features = payload.features.filter(link => link.properties.a !== link.properties.b)
      payload.features.forEach(link => this.rlinks.features.push(link))
      this.getrLinksProperties()
      this.getVariants()
      this.deleteNonVariantAttributes()
      this._initOneways()
      this.initSelectedrFilter()
    },

    appendNewrNodes (payload: PointGeoJson) {
      // append new links and node to the project (import page)
      simplifyGeometry(payload)
      payload.features.forEach(node => this.rnodes.features.push(node))
      this.getrNodesProperties()
    },

    getrLinksProperties () {
      const header: Set<string> = new Set([])
      this.rlinks.features.forEach(feat => {
        Object.keys(feat.properties).forEach(key => header.add(key))
      })
      const newAttrs = getDifference(header, this.rlineAttributes)
      newAttrs.forEach(attr => this.linksDefaultAttributes.push({ name: attr, type: undefined }))

      // create _r attributes if they dont exist (like time_r if there is no time_r)
      const toReverse = this.rlineAttributes.filter(attr => !rlinksConstantProperties.includes(attr))
      const reversedAttributes = toReverse.map(attr => attr + '_r')
      const newReversedAttrs = getDifference(reversedAttributes, this.reversedAttributes)
      newReversedAttrs.forEach(attr => this.linksDefaultAttributes.push({ name: attr, type: undefined }))
    },

    getrNodesProperties () {
      const header: Set<string> = new Set([])
      this.rnodes.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const newAttrs = getDifference(header, this.rnodeAttributes)
      newAttrs.forEach(attr => this.nodesDefaultAttributes.push({ name: attr, type: undefined }))
    },

    _initOneways () {
      if (this.rlineAttributes.includes('oneway')) {
        // make sure oneway is '1' or '0'
        this.rlinks.features.forEach(link => {
          if ([true, 'true', '1', 1].includes(link.properties.oneway)) {
            link.properties.oneway = '1'
          } else {
            link.properties.oneway = '0'
          }
        })
        const toSplit = this.rlinks.features.filter(link => link.properties.oneway === '0')
        // this function only apply the non _r val if it doesnt exist.
        toSplit.forEach(link => {
          addReverseProperties(link, this.reversedAttributes)
        })
      }
    },

    loadrLinksAttributesChoices (payload: AttributesChoice) {
      Object.keys(payload).forEach(key => this.rlinksAttributesChoices[key] = payload[key])
      const attrs = Object.keys(this.rlinksAttributesChoices) // all attrbutes in attributesChoices
      let newAttrs = attrs.filter(item => !this.rlineAttributes.includes(item)) // ones not in rlinks
      // in all new attrs. put as cst the ones that does not have a _r defined. (dont create one.)
      const reversedAttrs = attrs.filter(item => item.endsWith('_r'))
      let cstAttrs = attrs.filter(attr => !reversedAttrs.includes(attr + '_r'))
      cstAttrs = cstAttrs.filter(attr => !rlinksConstantProperties.includes(attr)) // not already there
      cstAttrs.forEach(attr => rlinksConstantProperties.push(attr)) // push as constant
      newAttrs = newAttrs.filter(item => !item.endsWith('_r'))
      // if an attribute is not desined in its _r variant. we do not create a _r attrivbute
      // add eeach not _r attributes in the attributes.
      newAttrs.forEach(item => this.addLinksPropertie({ name: item }))
    },

    ChangeDefaultValues(payload: Record<string, any>) {
      Object.keys(payload).forEach(key => {
        this.linksDefaultAttributes.filter(el => el.name === key)[0].value = payload[key]
      })
    },

    getVariants() {
      this.variantChoice = getVariantsChoices(this.linksDefaultAttributes.filter(el => !el.name.endsWith('_r')))
      addDefaultValuesToVariants(this.linksDefaultAttributes)
    },

    deleteNonVariantAttributes() {
      // delete normal defaults Attributes if variants. (ex: no speed in defaultAttributes if speed#AM)
      const toDelete = getBaseAttributesWithVariants(this.linksDefaultAttributes)
      toDelete.forEach(attr => this.deleteLinksPropertie({ name: attr }))
    },

    //
    // Properties edition
    //

    addLinksPropertie (payload: NewAttribute) {
      // TODO _editLinkArray
      const { name } = payload
      const newAttr: Record<string, null> = { [name]: null }
      this.rlinks.features.forEach(link => Object.assign(link.properties, newAttr))
      // this.rlinks.features.map(link => link.properties[payload.name] = null)
      this.linksDefaultAttributes.push({ name: name, type: undefined })
      // add reverse attribute if its not one we dont want to duplicated (ex: route_width)
      if (!rlinksConstantProperties.includes(name)) {
        this.linksDefaultAttributes.push({ name: name + '_r', type: undefined })
      }
    },

    addNodesPropertie (payload: NewAttribute) {
      // todo: _editNodeArray
      const { name } = payload
      const newAttr: Record<string, null> = { [name]: null }
      this.rnodes.features.forEach(node => Object.assign(node.properties, newAttr))
      this.nodesDefaultAttributes.push({ name: name, type: undefined })
    },

    deleteLinksPropertie (payload: NewAttribute) {
      // TODO _editLinkArray

      this.rlinks.features.forEach(link => delete link.properties[payload.name])
      this.rlinks.features.forEach(link => delete link.properties[payload.name + '_r'])

      this.linksDefaultAttributes = this.linksDefaultAttributes.filter(item => item.name !== payload.name)
      this.linksDefaultAttributes = this.linksDefaultAttributes.filter(item => item.name !== payload.name + '_r')
    },

    deleteNodesPropertie (payload: NewAttribute) {
      // todo: _editNodeArray
      this.rnodes.features.forEach(node => delete node.properties[payload.name])
      this.nodesDefaultAttributes = this.nodesDefaultAttributes.filter(item => item.name !== payload.name)
    },

    //
    // snapshot
    //

    startEditing () {
      this.savedNetwork = { rlinks: JSON.stringify(this.rlinks), rnodes: JSON.stringify((this.rnodes)) }

      // const links = Object.fromEntries(this.rlinks.features.map(item => [item.properties.index, toRaw(item)]))
      // const nodes = Object.fromEntries(this.rnodes.features.map(item => [item.properties.index, toRaw(item)]))
      // initHistory({ links: links, nodes: nodes })

      this.editionMode = true
      this.networkWasModified = false
    },

    saveEdition() {
      this.savedNetwork = { rlinks: '', rnodes: '' }
      this.editionMode = false
      this.networkWasModified = false
    },

    cancelEdition() {
      if (this.networkWasModified) {
        this.rlinks = JSON.parse(this.savedNetwork.rlinks)
        this.rnodes = JSON.parse(this.savedNetwork.rnodes)
        this.getrLinksProperties()
        this.getrNodesProperties()

        this.initSelectedrFilter()
        this.updateLinks = [] // refresh rlinks
      }

      this.savedNetwork = { rlinks: '', rnodes: '' }
      this.editionMode = false
    },

    //
    // filtering
    //

    changeSelectedrFilter (payload: string) {
      this.selectedrFilter = payload
      this.getFilteredrCat()
    },

    initSelectedrFilter() {
      const selectedFilter = this.rlineAttributes.includes('highway') ? 'highway' : this.rlineAttributes[0]
      this.changeSelectedrFilter(selectedFilter)
    },

    getFilteredrCat () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      // replace undefined with null here. the filter will not work if undefined.
      const val = Array.from(new Set(this.rlinks.features.map(item => item.properties[this.selectedrFilter] || null)))
      this.filteredrCategory = val
    },

    changeVisibleRoads (payload: ChangeVisibleLinks) {
      this.selectedrFilter = payload.category
      this.selectedrGroup = payload.data
    },

    //
    // edition (properties)
    //

    editLinkInfo (payload: EditRoadPayload) {
      // get selected link in editorLinks and modify the changes attributes.
      const { selectedArr, infoArr } = payload

      const editedList = []
      for (let i = 0; i < selectedArr.length; i++) {
        const formData = infoArr[i]
        const linkIndex = selectedArr[i]
        const link = cloneDeep(this.rlinks.features.filter((link) => link.properties.index === linkIndex)[0])
        // applied all properties.
        Object.keys(formData).forEach((key) => link.properties[key] = formData[key].value)

        // if we change a one way to a 2 way, copy oneway properties to the reverse one.
        const onewayValue = formData.oneway?.value
        const onewayChanged = onewayValue !== link.properties.oneway

        if (onewayChanged && onewayValue === '0') {
          addReverseProperties(link, this.reversedAttributes)
        // if we change from 2way to oneway delete _r attrs
        } else if (onewayChanged && onewayValue === '1') {
          deleteReverseProperties(link, this.reversedAttributes)
        }
        // push changes
        editedList.push(link)
      }
      this.commitChanges({ name: 'editLinkInfo', updateLinks: editedList })
      this.updateLinks = [...editedList]
    },

    editNodeInfo (payload: EditRoadPayload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedArr, infoArr } = payload
      const selectedIndex = selectedArr[0]
      const formData = infoArr[0]
      const node = cloneDeep(this.rnodes.features.filter(node => node.properties.index === selectedIndex)[0])
      Object.keys(formData).forEach(key => node.properties[key] = formData[key].value)

      this.commitChanges({ name: 'editNodeInfo', updateNodes: [node] })
      this.updateNodes = [node]
    },

    editGroupInfo (payload: EditRoadPayload) {
      // edit line info on multiple trips at once.
      const { selectedArr, infoArr } = payload
      const groupInfo = infoArr[0]
      const selectedIndex = new Set(selectedArr)
      const selectedLinks = cloneDeep(this.rlinks.features.filter(link => selectedIndex.has(link.properties.index)))
      const onewayValue = groupInfo.oneway?.value

      // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
      const props = getModifiedKeys(groupInfo)
      const dict = groupFormToDict(props, groupInfo)
      selectedLinks.forEach((feature) => Object.assign(feature.properties, dict))
      // change all reversed values too.
      if (onewayValue === '0') {
        selectedLinks.forEach(link => addReverseProperties(link, this.reversedAttributes))
      } else if (onewayValue === '1') {
        selectedLinks.forEach(link => deleteReverseProperties(link, this.reversedAttributes))
      }
      // // apply speed (get time on each link for the new speed.)
      const modifiedSpeeds = this.timeVariants.filter(v => props.includes(`speed${v}`))
      if (modifiedSpeeds.length > 0) {
        selectedLinks.forEach(link =>
          calcLengthTimeorSpeed(link, modifiedSpeeds as NonEmptyArray<string>, this.speedTimeMethod),
        )
      }

      this.commitChanges({ name: 'editGroupInfo', updateLinks: selectedLinks })
      this.getFilteredrCat()
      this.updateLinks = selectedLinks
    },

    //
    // edition (geometry)
    //

    _getNewNode (payload: NewNodePayload) {
      const { nodeCopyId, coordinates } = payload
      const newNode = basePoint()
      const features = cloneDeep(this.rnodes.features.filter(node => node.properties.index === nodeCopyId)[0])
      features.properties.index = 'rnode_' + short.generate()
      features.geometry.coordinates = coordinates
      newNode.features = [features]
      return features
    },

    _splitLink (payload: SplitRoadPayload) {
      // distance du point (entre 0 et 1) sur le lien original
      const { sliceIndex, newNode, selectedLink } = payload
      const newCoords = newNode.geometry.coordinates

      const link1 = cloneDeep(selectedLink)
      const link2 = cloneDeep(link1)

      link2.properties.index = 'rlink_' + short.generate() // link2.properties.index+ '-2'

      link1.properties.b = newNode.properties.index
      link2.properties.a = newNode.properties.index

      link1.geometry.coordinates = link1.geometry.coordinates.slice(0, sliceIndex)
      link1.geometry.coordinates.push(newCoords)

      link2.geometry.coordinates = link2.geometry.coordinates.slice(sliceIndex)
      link2.geometry.coordinates.splice(0, 0, newCoords)

      const variants = this._getTimeVariants(link1)
      calcLengthTimeorSpeed(link1, variants, this.speedTimeMethod)
      calcLengthTimeorSpeed(link2, variants, this.speedTimeMethod)

      return [link1, link2]
    },

    addNodeInline (payload: AddRoadNodeInlinePayload) {
      const { newLinks, modifiedLinks, newNode } = this._addNodeInline(payload)
      this.commitChanges({ name: 'addNodeInline', newLinks: newLinks, updateLinks: modifiedLinks, newNodes: [newNode] })
      this.updateLinks = [...modifiedLinks, ...newLinks]
      this.updateNodes = [newNode]
    },

    _addNodeInline (payload: AddRoadNodeInlinePayload) {
      // splt
      const { lngLat, selectedIndex } = payload
      const selectedLinks = this.rlinks.features.filter((link) => selectedIndex.includes(link.properties.index))
      let newNode = basePoint().features[0]
      const newLinks = []
      const modifiedLinks = []
      // for each selected links add the node and split.
      for (let i = 0; i < selectedLinks.length; i++) {
        const link = selectedLinks[i]
        const { sliceIndex, newCoords } = snapOnLink(link.geometry.coordinates, lngLat)
        // only add one node, takes the first one.
        if (i === 0) {
          newNode = this._getNewNode({ nodeCopyId: link.properties.b, coordinates: newCoords })
        }
        const [link1, link2] = this._splitLink({ selectedLink: link, sliceIndex, newNode })
        modifiedLinks.push(link1)
        newLinks.push(link2)
      }

      return { newLinks, modifiedLinks, newNode }
    },

    addAnchor (payload: AddRoadNodeInlinePayload) {
      const { lngLat, selectedIndex } = payload
      const selectedLinks = this.rlinks.features.filter((link) => selectedIndex.includes(link.properties.index))
      const modifiedLinks = []
      // for each selected links add the node and split.
      for (let i = 0; i < selectedLinks.length; i++) {
        const link = cloneDeep(selectedLinks[i])
        const { sliceIndex, newCoords } = snapOnLink(link.geometry.coordinates, lngLat)
        link.geometry.coordinates.splice(sliceIndex, 0, newCoords)
        modifiedLinks.push(link)
      }

      this.commitChanges({ name: 'addAnchor', updateLinks: modifiedLinks })

      this.updateLinks = [...modifiedLinks]
    },

    createLink (payload: CreateRlinkPayload) {
      // nodeIdA: node id, nodeIdB: node id, geom: array geom where we clicked, layerId: str. the layer id rnodes,rlinks
      // 3 cases.
      // 1) click on the map. create a node b then connect.
      // 2) click on a node. create a link between node a and b
      // 3) click on a link. create node inline b then create link a to b.
      // create a node if we click on the map (case 1)
      const nodeIdA = payload.nodeIdA
      const geom = payload.geom

      const linksId = payload.linksId
      let nodeIdB = payload.nodeIdB

      const rnodeA = this.rnodes.features.filter(node => node.properties.index === nodeIdA)[0]
      let rnodeB = cloneDeep(this.rnodes.features.filter(node => node.properties.index === nodeIdB)[0])
      // clicked on a link. create node and split link
      // else if: clicked no where: create a node
      const newLinksArr = []
      const modifiedLinksArr = []
      const newNodeArr = []
      if (linksId) {
        // create a node inline and then the new link
        const lnglat = { lng: geom[0], lat: geom[1] }
        const { newLinks, modifiedLinks, newNode } = this._addNodeInline({ selectedIndex: linksId, lngLat: lnglat })
        newLinksArr.push(...newLinks)
        modifiedLinksArr.push(...modifiedLinks)
        newNodeArr.push(newNode)
        rnodeB = newNode
      } else if (!nodeIdB) {
        const newNode = this._getNewNode({ coordinates: geom, nodeCopyId: nodeIdA })
        rnodeB = newNode
        newNodeArr.push(newNode)
      }

      const linkFeature = getDefaultLink(this.linksDefaultAttributes).features[0]
      const linkGeometry = linkFeature.geometry

      linkFeature.properties.index = 'rlink_' + short.generate()
      linkFeature.properties.a = nodeIdA
      linkFeature.properties.b = rnodeB.properties.index
      // add length, speed, time now that we have a geometry.
      linkGeometry.coordinates = [rnodeA.geometry.coordinates, rnodeB.geometry.coordinates]
      calcLengthTimeorSpeed(linkFeature, this.timeVariants, this.speedTimeMethod)
      if (this.rlineAttributes.includes('oneway')) {
        linkFeature.properties.oneway = '0'
        addReverseProperties(linkFeature, this.reversedAttributes)
      }

      newLinksArr.push(linkFeature)

      // add newly generated group (i.e. highway == quenedi), to visibles checked groups.
      const newLinkGroup = linkFeature.properties[this.selectedrFilter]
      if (!this.filteredrCategory.includes(newLinkGroup)) {
        this.filteredrCategory.push(newLinkGroup)
      }
      if (!this.selectedrGroup.includes(newLinkGroup)) {
        // if its not already selected, push it.
        this.selectedrGroup = [...this.selectedrGroup, newLinkGroup]
      } else {
      }

      const commit: Commit = { name: 'createLink', newLinks: newLinksArr, updateLinks: modifiedLinksArr }
      if (newNodeArr.length > 0) commit.newNodes = newNodeArr
      this.commitChanges(commit)

      this.updateLinks = newLinksArr
      this.updateNodes = [rnodeB]
      return rnodeB
    },

    moverNode (payload: MoveNode) {
      const nodeIndex = payload.selectedNode.properties.index
      const geom = payload.lngLat
      // change node geometry
      const node = cloneDeep(this.rnodes.features.filter(node => node.properties.index === nodeIndex)[0])
      node.geometry.coordinates = geom

      const linksB = cloneDeep(this.rlinks.features.filter(link => link.properties.b === nodeIndex))
      const linksA = cloneDeep(this.rlinks.features.filter(link => link.properties.a === nodeIndex))

      // update links geometry.
      linksB.forEach(link => {
        link.geometry.coordinates[link.geometry.coordinates.length - 1] = geom
        const variants = this._getTimeVariants(link)
        calcLengthTimeorSpeed(link, variants, this.speedTimeMethod)
      })
      linksA.forEach(link => {
        link.geometry.coordinates[0] = geom
        const variants = this._getTimeVariants(link)
        calcLengthTimeorSpeed(link, variants, this.speedTimeMethod)
      })

      const visibleLinksList = this.visiblerLinks.features.filter(link =>
        (link.properties.a === nodeIndex) || (link.properties.b === nodeIndex))

      this.commitChanges({ name: 'moveNode', updateLinks: [...linksA, ...linksB], updateNodes: [node] })
      this.updateLinks = [...visibleLinksList]
      this.updateNodes = [node]
    },

    moverAnchor (payload: MoveNode) {
      const { selectedNode, lngLat } = payload
      const coordinatedIndex = selectedNode.properties.coordinatedIndex
      const linkIndex = selectedNode.properties.linkIndex

      const link = cloneDeep(this.rlinks.features.filter(feature => feature.properties.index === linkIndex)[0])
      link.geometry.coordinates[coordinatedIndex] = lngLat // replace value
      const variants = this._getTimeVariants(link)
      calcLengthTimeorSpeed(link, variants, this.speedTimeMethod)
      this.commitChanges({ name: 'modeAnchor', updateLinks: [link] })
      this.updateLinks = [link]
    },

    //
    // edition (deletion)
    //

    deleteAnchorNode (payload: SelectedAnchor) {
      const { linkIndex, coordinatedIndex } = payload
      const link = cloneDeep(this.rlinks.features.filter(feature => feature.properties.index === linkIndex)[0])

      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]

      const variants = this._getTimeVariants(link)
      calcLengthTimeorSpeed(link, variants, this.speedTimeMethod)
      this.commitChanges({ name: 'deleteAnchor', updateLinks: [link] })

      this.updateLinks = [link]
    },

    deleteLink (selectedIndexes: string[]) {
      const linkArr = new Set(selectedIndexes)
      // nodes are deleted base on deleted links. but we want to commit links and ndoes cchanges at the same time.
      // so we double compute what links are deleted...
      const filtered = baseLineString()
      filtered.features = this.rlinks.features.filter(link => !linkArr.has(link.properties.index))
      const toDelete = new Set(getUnusedNodes(this.rnodes, filtered))

      this.commitChanges({ name: 'deleteLink', deleteLinks: linkArr, deleteNodes: toDelete })
      this.getFilteredrCat()

      // update map
      // we are working on visible links already. but nodes could stay visible if they are used by another group
      this.updateLinks = Array.from(linkArr).map(idx => { return { type: 'Feature', id: idx } })
      const nodesToUpdate = getUnusedNodes(this.visiblerNodes, this.visiblerLinks)
      this.updateNodes = Array.from(nodesToUpdate).map(idx => { return { type: 'Feature', id: idx } })
    },

    deleterGroup (group: string) {
      const cat = this.selectedrFilter
      const filtered = this.rlinks.features.filter(link => link.properties[cat] === group)
      const selectedIndex = filtered.map(link => link.properties.index)
      this.deleteLink(selectedIndex)
    },

  },

  getters: {
    visiblerLinks(): LineStringGeoJson {
      const filtered = baseLineString()
      const group = new Set(this.selectedrGroup)
      const cat = this.selectedrFilter
      filtered.features = this.rlinks.features.filter(link => group.has(link.properties[cat]))
      return filtered
    },
    visiblerNodes(): PointGeoJson {
      const filtered = basePoint()
      filtered.features = deleteUnusedNodes(this.rnodes, this.visiblerLinks)
      return filtered
    },
    rlinksIsEmpty: (state) => state.rlinks.features.length === 0,
    rlineAttributes: (state) => state.linksDefaultAttributes.filter(el => !el.name.endsWith('_r')).map(el => el.name),
    reversedAttributes: (state) => state.linksDefaultAttributes.filter(el => el.name.endsWith('_r')).map(el => el.name),
    timeVariants: (state) => {
      const attrs = new Set(state.linksDefaultAttributes.map(attr => attr.name))
      const timeVariants = state.variantChoice.filter(v => attrs.has(`time${v}`) || attrs.has(`speed${v}`))
      return (timeVariants.length > 0 ? timeVariants : ['']) as NonEmptyArray<string>
    },
    _getTimeVariants() {
      // return time variant and reversed time variant if it has reverse direction: ex: ['', '_r']
      return (link: LineStringFeatures) => {
        if (link.properties.time_r) {
          const reversedVariants = this.timeVariants.map(v => `${v}_r`) as NonEmptyArray<string>
          return [...this.timeVariants, ...reversedVariants] as NonEmptyArray<string>
        } else {
          return this.timeVariants
        }
      }
    },
    hasCycleway: (state) => state.linksDefaultAttributes.map(attr => attr.name).includes('cycleway'),
    rnodeAttributes: (state) => state.nodesDefaultAttributes.map(el => el.name),
    attributesChoicesChanged: (state) =>
      JSON.stringify(state.rlinksAttributesChoices) !== JSON.stringify(roadDefaultAttributesChoices),
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(userLinksStore, import.meta.hot))
}
