/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */
import Point from 'turf-point'
import { serializer } from '@comp/utils/serializer.js'
import { IndexAreDifferent } from '@comp/utils/utils.js'
const short = require('short-uuid')
const $gettext = s => s

export default {
  namespaced: true,
  state: {
    layer: {},
    visibleLayer: {},
    layerHeader: {}, // empty geojson
    layerAttributes: [], // all the available attributes (columns in pandas)
    filteredCategory: [], // all possible category (to be in selectedCat)
    selectedFilter: '', // ex: highway
    selectedCategory: [], // ex: [motorway, residential] visible one.

  },

  mutations: {
    loadLayer (state, payload) {
      state.layer = payload
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.layer.crs.properties.name)) {
        const layerHeader = { ...state.layer }
        layerHeader.features = []
        state.layerHeader = layerHeader
        state.visibleLayer = structuredClone(layerHeader)
        // set all trips visible
        // this.commit('results/changeSelectedTrips', state.tripId)
        this.commit('od/getProperties')
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    loadODFiles (state, payload) {
      // payload = [{path,content},...]
      for (const file of payload) {
        if (IndexAreDifferent(file.content, state.layer)) {
          this.commit('od/appendNewOD', serializer(file.content, file.path, 'LineString'))
        } else {
          const err = new Error($gettext(' there is duplicated index, ') + file.path)
          err.name = 'ImportError'
          throw err
        }
      }
    },

    appendNewOD (state, payload) {
      // append new links and node to the project (import page)
      function getFirstAndLast (arr) {
        return [arr[0], arr[arr.length - 1]]
      }

      payload.features.forEach(link => link.geometry.coordinates = getFirstAndLast(link.geometry.coordinates))

      payload.features.forEach(link => state.layer.features.push(link))
      this.commit('od/getProperties')
      this.commit('od/getFilteredCategory')
      this.commit('od/refreshVisibleLayer')
    },

    changeSelectedFilter (state, payload) {
      state.selectedFilter = payload
      this.commit('od/refreshVisibleLayer')
      this.commit('od/getFilteredCategory')
    },
    changeSelectedCategory (state, payload) {
      state.selectedCategory = payload
      this.commit('od/refreshVisibleLayer')
    },

    getProperties (state) {
      const header = new Set([])
      state.layer.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      // add all default attributes
      const defaultAttributes = [
        'index']
      defaultAttributes.forEach(att => header.add(att))
      state.layerAttributes = Array.from(header)
      state.selectedFilter = state.layerAttributes[0]
      state.selectedCategory = Array.from(new Set(state.layer.features.map(
        item => item.properties[state.selectedFilter])))
    },

    refreshVisibleLayer (state) {
      const group = new Set(state.selectedCategory)
      const cat = state.selectedFilter
      state.visibleLayer.features = state.layer.features.filter(link => group.has(link.properties[cat]))
    },
    getFilteredCategory (state) {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(state.layer.features.map(
        item => item.properties[state.selectedFilter])))
      state.filteredCategory = val
    },

    // actions
    deleteOD (state, payload) {
      const linkArr = new Set(payload.selectedIndex)
      state.layer.features = state.layer.features.filter(link => !linkArr.has(link.properties.index))
      this.commit('od/refreshVisibleLayer')
      this.commit('od/getFilteredCategory')
    },

    deleteGroup (state, payload) {
      const group = payload
      const cat = state.selectedFilter
      state.layer.features = state.layer.features.filter(link => link.properties[cat] !== group)
      this.commit('od/refreshVisibleLayer')
      this.commit('od/getFilteredCategory')
    },

    moveNode (state, payload) {
      const linkIndex = payload.selectedFeature.properties.linkIndex
      const coordinatedIndex = payload.selectedFeature.properties.coordinatedIndex

      const link = state.visibleLayer.features.filter(feature => feature.properties.index === linkIndex)[0]
      link.geometry.coordinates = [...link.geometry.coordinates.slice(0, coordinatedIndex),
        payload.lngLat,
        ...link.geometry.coordinates.slice(coordinatedIndex + 1)]
    },

    createNewLink (state, payload) {
      const linkGeometry = {
        coordinates: [payload.lngLat, payload.lngLat],
        type: 'LineString',
      }

      const linkProperties = {}
      // set default links values
      state.layerAttributes.forEach((key) => linkProperties[key] = null)
      linkProperties.index = payload.index
      // linkProperties.route_color = state.rlinksDefaultColor
      const linkFeature = { geometry: linkGeometry, properties: linkProperties, type: 'Feature' }
      state.layer.features.push(linkFeature)

      this.commit('od/getFilteredCategory')
      // add newly create link to the visible
      const newCat = linkProperties[state.selectedFilter]
      const selectedCategorySet = new Set(state.selectedCategory)
      if (!selectedCategorySet.has(newCat)) {
        state.selectedCategory.push(newCat)
      }
      this.commit('od/refreshVisibleLayer')
    },

    editLinkInfo (state, payload) {
      // get selected node in editorNodes and modify the changes attributes.
      const { selectedLinkId, info } = payload
      const props = Object.keys(info)
      state.visibleLayer.features.filter(
        // eslint-disable-next-line array-callback-return
        function (link) {
          if (link.properties.index === selectedLinkId) {
            props.forEach((key) => link.properties[key] = info[key].value)
          }
        },
      )
      this.commit('od/getFilteredCategory')
    },

    editGroupInfo (state, payload) {
      // edit line info on multiple trips at once.
      const groupInfo = payload.info
      const selectedLinks = payload.selectedLinks // observer of state.links
      // get only keys that are not unmodified multipled Values (value=='' and placeholder==true)
      const props = Object.keys(groupInfo).filter(key =>
        ((groupInfo[key].value !== '') || !groupInfo[key].placeholder))
      // this is an oberver. modification will be applied to state.links.
      selectedLinks.forEach(
        (features) => props.forEach((key) => features.properties[key] = groupInfo[key].value))

      this.commit('od/getFilteredCategory')
      this.commit('od/refreshVisibleLayer')
    },
    addPropertie (state, payload) {
      // payload = name
      // when a new line properties is added (in dataframe page)
      state.layer.features.map(link => link.properties[payload] = null)
      state.visibleLayer.features.map(link => link.properties[payload] = null)
      state.layerAttributes.push(payload)
    },
    deletePropertie (state, payload) {
      // when a link property is deleted
      state.layer.features.filter(link => delete link.properties[payload.name])
      state.visibleLayer.features.filter(link => delete link.properties[payload.name])
      state.layerAttributes = state.layerAttributes.filter(item => item !== payload.name)
    },
  },

  getters: {
    layer: (state) => state.layer,
    visibleLayer: (state) => state.visibleLayer,
    layerIsEmpty: (state) => state.layer.features.length === 0,
    layerHeader: (state) => state.layerHeader,
    selectedTrips: (state) => state.selectedTrips,
    layerAttributes: (state) => state.layerAttributes.sort(),
    selectedFilter: (state) => state.selectedFilter,
    filteredCategory: (state) => state.filteredCategory,
    selectedCategory: (state) => state.selectedCategory,
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
    nodes: (state) => (layer) => {
      const nodes = structuredClone(state.layerHeader)
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
}
