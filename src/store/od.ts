/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore } from 'pinia'

import { point as Point } from '@turf/helpers'
import { serializer, CRSis4326 } from '@src/utils/serializer'
import { getModifiedKeys, getDifference, IndexAreDifferent } from '@src/utils/utils'
import { cloneDeep } from 'lodash'
import short from 'short-uuid'
import { Attributes, EditGroupPayload, FilesPayload, MoveNode, NewODPayload, ODStore } from '@src/types/typesStore'
import { baseLineString, basePoint, LineStringFeatures,
  LineStringGeoJson, LineStringGeometry } from '@src/types/geojson'
import { ODDefaultProperties } from '@src/constants/properties'
const $gettext = (s: string) => s

export const useODStore = defineStore('od', {
  state: (): ODStore => ({
    layer: baseLineString(),
    visibleLayer: baseLineString(),
    defaultAttributes: ODDefaultProperties,
    filteredCategory: [], // all possible category (to be in selectedCat)
    selectedFilter: '', // ex: highway
    selectedCategory: [], // ex: [motorway, residential] visible one.

  }),

  actions: {
    loadLayer (payload: LineStringGeoJson) {
      this.layer = cloneDeep(payload)
      if (CRSis4326(this.layer)) {
        this.visibleLayer = baseLineString()
        // set all trips visible
        this.getProperties()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadODFiles (payload: FilesPayload[]) {
      // payload = [{path,content},...]
      for (const file of payload) {
        if (IndexAreDifferent(file.content, this.layer)) {
          this.appendNewOD(serializer(file.content, file.path, 'LineString'))
        } else {
          const err = new Error($gettext(' there is duplicated index, ') + file.path)
          err.name = 'ImportError'
          throw err
        }
      }
    },

    appendNewOD (payload: LineStringGeoJson) {
      // append new links and node to the project (import page)
      function getFirstAndLast (arr: number[][]) {
        return [arr[0], arr[arr.length - 1]]
      }

      payload.features.forEach(link => link.geometry.coordinates = getFirstAndLast(link.geometry.coordinates))

      payload.features.forEach(link => this.layer.features.push(link))
      this.getProperties()
      this.getFilteredCategory()
      this.refreshVisibleLayer()
    },

    changeSelectedFilter (payload: string) {
      this.selectedFilter = payload
      this.refreshVisibleLayer()
      this.getFilteredCategory()
    },
    changeSelectedCategory (payload: string[]) {
      this.selectedCategory = payload
      this.refreshVisibleLayer()
    },

    getProperties () {
      const header: Set<string> = new Set([])
      this.layer.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const newAttrs = getDifference(header, this.layerAttributes)
      newAttrs.forEach(attr => this.defaultAttributes.push({ name: attr, type: 'String' }))

      this.selectedFilter = 'name'
    },

    refreshVisibleLayer () {
      const group = new Set(this.selectedCategory)
      const cat = this.selectedFilter
      this.visibleLayer.features = this.layer.features.filter(link => group.has(link.properties[cat]))
    },
    getFilteredCategory () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.layer.features.map(
        item => item.properties[this.selectedFilter])))
      this.filteredCategory = val
    },

    // actions
    deleteOD (selectedIndexes: string[]) {
      const linkArr = new Set(selectedIndexes)
      this.layer.features = this.layer.features.filter(link => !linkArr.has(link.properties.index))
      this.refreshVisibleLayer()
      this.getFilteredCategory()
    },

    moveNode (payload: MoveNode) {
      const linkIndex = payload.selectedNode.properties.linkIndex
      const coordinatedIndex = payload.selectedNode.properties.coordinatedIndex

      const link = this.visibleLayer.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },

    createNewLink (payload: NewODPayload) {
      const linkGeometry: LineStringGeometry = {
        coordinates: [payload.lngLat, payload.lngLat],
        type: 'LineString',
      }

      // set default links values
      const linkProperties = this.defaultAttributes.reduce((dict: Record<string, any>, attr: Attributes) => {
        dict[attr.name] = attr.value
        return dict
      }, {})

      linkProperties.index = payload.index
      linkProperties.name = payload.index
      const linkFeature: LineStringFeatures = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
      this.layer.features.push(linkFeature)

      this.getFilteredCategory()
      // add newly create link to the visible
      const newCat = linkProperties[this.selectedFilter]
      const selectedCategorySet = new Set(this.selectedCategory)
      if (!selectedCategorySet.has(newCat)) {
        this.selectedCategory.push(newCat)
      }
      this.refreshVisibleLayer()
    },

    editGroupInfo (payload: EditGroupPayload) {
      // edit line info on multiple trips at once.
      const groupInfo = payload.info
      const selectedSet = new Set(payload.selectedArray)
      const features = this.layer.features.filter(el => selectedSet.has(el.properties.index))

      // get only keys that are not unmodified multipled Values (value==undefined and placeholder==true)
      const props = getModifiedKeys(groupInfo)

      features.forEach(
        (feature) => props.forEach((key) => feature.properties[key] = groupInfo[key].value))

      this.getFilteredCategory()
      this.refreshVisibleLayer()
    },
    addPropertie (name: string) {
      // payload = name
      // when a new line properties is added (in dataframe page)
      this.layer.features.map(link => link.properties[name] = null)
      this.visibleLayer.features.map(link => link.properties[name] = null)
      this.defaultAttributes.push({ name: name, type: 'String' })
    },
    deletePropertie (name: string) {
      // when a link property is deleted
      this.layer.features.filter(link => delete link.properties[name])
      this.visibleLayer.features.filter(link => delete link.properties[name])
      this.defaultAttributes = this.defaultAttributes.filter(item => item.name !== name)
    },
  },

  getters: {
    layerIsEmpty: (state) => state.layer.features.length === 0,
    layerAttributes: (state) => state.defaultAttributes.map(el => el.name),
    groupLayer: (state) => (category: string, group: string) => {
      return state.layer.features.filter(link => group === link.properties[category])
    },
    nodes: (state) => {
      const nodes = basePoint()
      state.visibleLayer.features.forEach(
        feature => {
          const Index = feature.properties.index
          feature.geometry.coordinates.forEach(
            (pt, idx) => nodes.features.push(Point(
              pt,
              { index: short.generate(), linkIndex: Index, coordinatedIndex: idx },
            ),
            ),

          )
        },
      )

      return nodes
    },

  },
})
