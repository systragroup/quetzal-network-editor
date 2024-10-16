/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import { defineStore } from 'pinia'

import Point from 'turf-point'
import { serializer, CRSis4326 } from '@comp/utils/serializer.js'
import { IndexAreDifferent } from '@comp/utils/utils.js'
import { cloneDeep } from 'lodash'
import short from 'short-uuid'
import geojson from '@constants/geojson'
const $gettext = s => s

export const useODStore = defineStore('od', {
  state: () => ({
    layer: {},
    visibleLayer: {},
    layerAttributes: [], // all the available attributes (columns in pandas)
    filteredCategory: [], // all possible category (to be in selectedCat)
    selectedFilter: '', // ex: highway
    selectedCategory: [], // ex: [motorway, residential] visible one.

  }),

  actions: {
    loadLayer (payload) {
      this.layer = cloneDeep(payload)
      if (CRSis4326(this.layer)) {
        this.visibleLayer = cloneDeep(geojson)
        // set all trips visible
        this.getProperties()
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadODFiles (payload) {
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

    appendNewOD (payload) {
      // append new links and node to the project (import page)
      function getFirstAndLast (arr) {
        return [arr[0], arr[arr.length - 1]]
      }

      payload.features.forEach(link => link.geometry.coordinates = getFirstAndLast(link.geometry.coordinates))

      payload.features.forEach(link => this.layer.features.push(link))
      this.getProperties()
      this.getFilteredCategory()
      this.refreshVisibleLayer()
    },

    changeSelectedFilter (payload) {
      this.selectedFilter = payload
      this.refreshVisibleLayer()
      this.getFilteredCategory()
    },
    changeSelectedCategory (payload) {
      this.selectedCategory = payload
      this.refreshVisibleLayer()
    },

    getProperties () {
      const header = new Set([])
      this.layer.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index', 'name']
      defaultAttributes.forEach(att => header.add(att))
      this.layerAttributes = Array.from(header)
      this.selectedFilter = 'name'
      // set all visible
      // this.selectedCategory = Array.from(new Set(this.layer.features.map(
      //  item => item.properties[this.selectedFilter])))
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
    deleteOD (payload) {
      const linkArr = new Set(payload.selectedIndex)
      this.layer.features = this.layer.features.filter(link => !linkArr.has(link.properties.index))
      this.refreshVisibleLayer()
      this.getFilteredCategory()
    },

    deleteGroup (payload) {
      const group = payload
      const cat = this.selectedFilter
      this.layer.features = this.layer.features.filter(link => link.properties[cat] !== group)
      this.refreshVisibleLayer()
      this.getFilteredCategory()
    },

    moveNode (payload) {
      const linkIndex = payload.selectedFeature.properties.linkIndex
      const coordinatedIndex = payload.selectedFeature.properties.coordinatedIndex

      const link = this.visibleLayer.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },

    createNewLink (payload) {
      const linkGeometry = {
        coordinates: [payload.lngLat, payload.lngLat],
        type: 'LineString',
      }

      const linkProperties = {}
      // set default links values
      this.layerAttributes.forEach((key) => linkProperties[key] = null)
      linkProperties.index = payload.index
      linkProperties.name = payload.index
      // linkProperties.route_color = this.rlinksDefaultColor
      const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
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

    editLinkInfo (payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedLinkId, info } = payload
      const props = Object.keys(info)
      this.visibleLayer.features.filter(
        // eslint-disable-next-line array-callback-return
        function (link) {
          if (link.properties.index === selectedLinkId) {
            props.forEach((key) => link.properties[key] = info[key].value)
          }
        },
      )
      this.getFilteredCategory()
    },

    editGroupInfo (payload) {
      // edit line info on multiple trips at once.
      const groupInfo = payload.info
      const selectedLinks = payload.selectedLinks // observer of this.links
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(groupInfo).filter(key =>
        ((groupInfo[key].value !== '') || !groupInfo[key].placeholder))
      // this is an oberver. modification will be applied to this.links.
      selectedLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = groupInfo[key].value))

      this.getFilteredCategory()
      this.refreshVisibleLayer()
    },
    addPropertie (payload) {
      // payload = name
      // when a new line properties is added (in dataframe page)
      this.layer.features.map(link => link.properties[payload] = null)
      this.visibleLayer.features.map(link => link.properties[payload] = null)
      this.layerAttributes.push(payload)
    },
    deletePropertie (payload) {
      // when a link property is deleted
      this.layer.features.filter(link => delete link.properties[payload.name])
      this.visibleLayer.features.filter(link => delete link.properties[payload.name])
      this.layerAttributes = this.layerAttributes.filter(item => item !== payload.name)
    },
  },

  getters: {
    layerIsEmpty: (state) => state.layer.features.length === 0,
    groupLayer: (state) => (category, group) => {
      return state.layer.features.filter(link => group === link.properties[category])
    },
    linkForm: (state) => (linkIndex) => {
      const uneditable = ['index']
      const editorForm = state.visibleLayer.features.filter(
        (link) => link.properties.index === linkIndex)[0].properties

      // filter properties to only the one that are editable.
      const form = {}
      state.layerAttributes.forEach(key => {
        form[key] = {
          value: editorForm[key],
          disabled: uneditable.includes(key),
          placeholder: false,
        }
      })
      return form
    },
    nodes: () => (layer) => {
      const nodes = cloneDeep(geojson)
      layer.features.forEach(
        feature => {
          const Index = feature.properties.index
          feature.geometry.coordinates.forEach(
            (point, idx) => nodes.features.push(Point(
              point,
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
