/* eslint-disable array-callback-return */
/* eslint-disable no-return-assign */

import chroma from 'chroma-js'
const seedrandom = require('seedrandom')
const $gettext = s => s

function isHexColor (variable) {
  const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/i
  return hexRegex.test(variable)
}
function remap (val, minVal, maxVal, reverse, scale, isWidth) {
  // if String. classify with random number
  if (typeof (val) === 'string') {
    if (isWidth) {
      return 0
    } else {
      const rng = seedrandom(val)
      return rng()
    }
  }

  if (isWidth) {
    // with Width, we want an absolute value (-10 is the same with as 10)
    // value out of range. force to min/max scale
    if (val < minVal) {
      val = minVal
    } else if (val > maxVal) {
      val = maxVal
    }

    val = Math.abs(val)
    if (minVal < 0 && maxVal > 0) {
      // if scale around 0 (ex: [-20,10]). min is 0 and max is now 20.
      maxVal = Math.max(Math.abs(minVal), Math.abs(maxVal))
      minVal = 0
    } else if (minVal < 0 && maxVal <= 0) {
      // if both negative. find the minimum and maximum in abs value.
      const tmpMaxVal = Math.abs(maxVal)
      maxVal = Math.max(Math.abs(minVal), tmpMaxVal)
      minVal = Math.min(Math.abs(minVal), tmpMaxVal)
    }
  } else {
    // if its Color. no absolute value
    // value out of range. return 0 or 1 for colors
    if (val < minVal) {
      return reverse ? 1 : 0
    } else if (val > maxVal) {
      return reverse ? 0 : 1
    }
    if (minVal < 0) { // for colors when scale <0
      // remap Value to [0, maxVal - minVal]
      val = val - minVal
      maxVal = maxVal - minVal
      minVal = 0
    }
  }

  let res = val

  if (scale === 'log') {
    if (minVal < 1) {
      // no 0 for Log scale (as its inf). add +1
      maxVal += 1
      val += 1
      minVal += 1
    }

    minVal = minVal > 0 ? Math.log10(minVal) : 0
    maxVal = maxVal > 0 ? Math.log10(maxVal) : 0
    res = val > 0 ? Math.log10(val) : 0
  } else if (scale === 'sqrt') {
    minVal = Math.sqrt(minVal)
    maxVal = Math.sqrt(maxVal)
    res = Math.sqrt(val)
  } else if (scale === 'exp') {
    // need to normalize first. 10**big number is not working
    minVal = minVal / maxVal
    val = val / maxVal
    maxVal = 1
    minVal = 10 ** (minVal)
    maxVal = 10 ** (maxVal)
    res = 10 ** (val)
  } else if (scale === 'quad') {
    // need to normalize first. 10**big number is not working
    minVal = (minVal) ** 2
    maxVal = (maxVal) ** 2
    res = (val) ** 2
  }

  if (reverse) {
    res = (-res + maxVal) / (maxVal - minVal)
  } else {
    res = (res - minVal) / (maxVal - minVal)
  }
  return res
}

const defaultSettings = {
  selectedFeature: null,
  maxWidth: 10,
  minWidth: 1,
  numStep: 100,
  scale: 'linear', // 'log', 'sqrt'
  fixScale: false,
  minVal: 0, // option to blocked them. so its an input and its not recompute
  maxVal: 1,
  cmap: 'OrRd',
  opacity: 100,
  offset: false,
  showNaN: true,
  reverseColor: false,
  extrusion: false,
  padding: [0, 100],
}

export default {
  namespaced: true,
  // need a function ()=>. if not. diffent instance will share the same state.
  state: () => ({
    namespace: 'results', // to do commit on different instance.
    type: 'links',
    links: {},
    visibleLinks: {},
    NaNLinks: {},
    linksHeader: {},
    lineAttributes: [],
    selectedFilter: '',
    selectedCategory: [],
    hasOD: false,
    ODindex: {},
    displaySettings: {},

  }),

  mutations: {
    setNamespace (state, payload) { state.namespace = payload },
    unload (state) {
      this.commit(`${state.namespace}/cleanLinks`)
      state.type = 'links'
      state.links = {}
      state.visibleLinks = {}
      state.NaNLinks = {}
      state.linksHeader = {}
      state.lineAttributes = []
      state.selectedFilter = ''
      state.selectedCategory = []
      state.hasOD = false
      state.ODindex = {}
      state.displaySettings = structuredClone(defaultSettings)
      // TODO: remove display_width and display_color
    },

    loadLinks (state, payload) {
      state.displaySettings = structuredClone(defaultSettings)
      // TODO: remove display_width and display_color
      this.commit(`${state.namespace}/cleanLinks`)
      state.links = structuredClone(payload.geojson)
      state.type = payload.type
      // extrusion only for polygon right now. set to false if not a polygon
      if (state.type !== 'Polygon') { state.displaySettings.extrusion = false }
      state.hasOD = payload.hasOD ? payload.hasOD : false
      state.ODindex = payload.ODindex ? payload.ODindex : {}
      if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(state.links.crs.properties.name)) {
        const linksHeader = structuredClone(state.links)
        linksHeader.features = []
        state.linksHeader = linksHeader
        state.visibleLinks = structuredClone(linksHeader)
        state.NaNLinks = structuredClone(linksHeader)
        // set all trips visible
        this.commit(`${state.namespace}/getLinksProperties`)
        if (state.lineAttributes.includes(payload.selectedFeature)) {
          state.displaySettings.selectedFeature = payload.selectedFeature
        } else {
          state.displaySettings.selectedFeature = null
        }
        this.commit(`${state.namespace}/refreshVisibleLinks`)
        this.commit(`${state.namespace}/updateSelectedFeature`)
      } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
    },

    updateLinks (state, payload) {
      state.links = payload
      this.commit(`${state.namespace}/refreshVisibleLinks`)
      this.commit(`${state.namespace}/updateSelectedFeature`)
    },

    cleanLinks (state) {
      if (Object.keys(state.links).length !== 0) {
        state.links.features.filter(link => delete link.properties.display_width)
        state.links.features.filter(link => delete link.properties.display_color)
      }
    },

    changeSelectedFilter (state, payload) {
      state.selectedFilter = payload
      // set all vvisible
      state.selectedCategory = Array.from(new Set(state.links.features.map(
        item => item.properties[state.selectedFilter])))
      this.commit(`${state.namespace}/refreshVisibleLinks`)
    },
    changeSelectedCategory (state, payload) {
      state.selectedCategory = payload
      this.commit(`${state.namespace}/refreshVisibleLinks`)
    },

    getLinksProperties (state) {
      const header = new Set([])
      state.links.features.forEach(element => {
        Object.keys(element.properties).forEach(key => header.add(key))
      })
      state.lineAttributes = Array.from(header)
      state.lineAttributes = state.lineAttributes.filter(attr => !['display_width', 'display_color'].includes(attr))

      // eslint-disable-next-line max-len
      state.selectedFilter = header.has('route_type') ? 'route_type' : header.has('highway') ? 'highway' : state.lineAttributes[0]
      state.selectedCategory = Array.from(new Set(state.links.features.map(
        item => item.properties[state.selectedFilter])))
    },
    applySettings (state, payload) {
      const keys = Object.keys(payload)
      // apply all payload settings to state.displaySettings
      keys.forEach(key => state.displaySettings[key] = payload[key])
      this.commit(`${state.namespace}/refreshVisibleLinks`)
      this.commit(`${state.namespace}/updateSelectedFeature`)
    },

    updateSelectedFeature (state) {
      const key = state.displaySettings.selectedFeature
      const maxWidth = state.displaySettings.maxWidth
      const minWidth = state.displaySettings.minWidth
      const scale = state.displaySettings.scale
      const numStep = state.displaySettings.numStep
      const cmap = state.displaySettings.cmap
      const featureArr = state.visibleLinks.features.filter(
        link => link.properties[key]).map(
        link => link.properties[key])
      if (!state.displaySettings.fixScale) {
        const arrayMinMax = (arr) =>
          arr.reduce(([min, max], val) => [Math.min(min, val), Math.max(max, val)], [
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
          ])

        const [minV, maxV] = arrayMinMax(featureArr)
        state.displaySettings.minVal = Math.round(minV * 100) / 100
        state.displaySettings.maxVal = Math.round(maxV * 100) / 100
      }
      const minVal = state.displaySettings.minVal
      const maxVal = state.displaySettings.maxVal
      const reverse = state.displaySettings.reverseColor

      state.visibleLinks.features.forEach(
        link => {
          let val = link.properties[key]
          val = remap(val, minVal, maxVal, false, scale, true)
          link.properties.display_width = (maxWidth - minWidth) * val + minWidth
        },
      )
      let pad = structuredClone(state.displaySettings.padding)
      pad = [pad[0] / 100, 1 - pad[1] / 100]
      pad = state.displaySettings.reverseColor ? pad.reverse() : pad
      const colorScale = chroma.scale(cmap).padding(pad)
        .domain([0, 1], scale).classes(numStep)

      state.visibleLinks.features.forEach(
        link => {
          const val = link.properties[key]
          if (isHexColor(val)) {
            link.properties.display_color = val
          } else {
            link.properties.display_color = colorScale(
              remap(val, minVal, maxVal, reverse, scale, false)).hex()
          }
        },
      )
      //
      // if OD prop ans all NaN. put green on clickable links.
      //
      const allNaN = state.links.features.filter(link => link.properties[key]).length === 0
      if (allNaN && state.hasOD && Object.keys(state.ODindex).includes(key)) {
        const indexList = new Set(state.ODindex[key])
        state.visibleLinks.features.forEach(
          link => {
            if (indexList.has(link.properties.index)) {
              link.properties.display_width = 10
              link.properties.display_color = '#4CAF50'
            }
          })
        this.commit('changeNotification',
          { text: $gettext('Clickable element in green'), autoClose: true, color: 'success' })
      }
    },
    refreshVisibleLinks (state) {
      const group = new Set(state.selectedCategory)
      const cat = state.selectedFilter
      const key = state.displaySettings.selectedFeature
      state.visibleLinks.features = state.links.features.filter(link => group.has(link.properties[cat]))
      if (!state.displaySettings.showNaN) {
        // keep track of NaN links to display them when we have a polygon
        state.NaNLinks.features = state.visibleLinks.features.filter(link => !link.properties[key])
        const allNaN = state.links.features.filter(link => link.properties[key]).length === 0
        if (allNaN && state.hasOD && Object.keys(state.ODindex).includes(key)) {
          // keep visible links as we want to show clickable links
        } else {
          // remove NaN from links
          state.visibleLinks.features = state.visibleLinks.features.filter(link => link.properties[key])
        }
      }
    },
  },

  getters: {
    links: (state) => state.links,
    visibleLinks: (state) => state.visibleLinks,
    displayLinks: (state) => {
      const layer = structuredClone(state.linksHeader)
      layer.features = state.visibleLinks.features.map(obj => {
        return {
          geometry: obj.geometry,
          properties: {
            display_color: obj.properties.display_color,
            display_width: obj.properties.display_width,
          },

        }
      })
      return layer
    },
    type: (state) => {
      // if 3D selected and a polygon. change type to extrusion.
      if (state.displaySettings.extrusion && state.type === 'Polygon') {
        return 'extrusion'
      } else { return state.type }
    },
    NaNLinks: (state) => state.NaNLinks,
    linksHeader: (state) => state.linksHeader,
    lineAttributes: (state) => state.lineAttributes.sort(),
    selectedFilter: (state) => state.selectedFilter,
    selectedCategory: (state) => state.selectedCategory,
    displaySettings: (state) => state.displaySettings,
    selectedFeature: (state) => state.displaySettings.selectedFeature,
    maxWidth: (state) => state.displaySettings.maxWidth,
    minWidth: (state) => state.displaySettings.minWidth,
    numStep: (state) => state.displaySettings.numStep,
    scale: (state) => state.displaySettings.scale,
    opacity: (state) => state.displaySettings.opacity,
    colorScale: (state) => {
      const arr = []
      let pad = state.displaySettings.padding
      pad = [pad[0] / 100, 1 - pad[1] / 100]
      pad = state.displaySettings.reverseColor ? pad.reverse() : pad
      const colorScale = chroma.scale(state.displaySettings.cmap).padding(pad)
        .domain([0, 1]).classes(state.displaySettings.numStep)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(remap(i, 0, 100, state.displaySettings.reverseColor, state.displaySettings.scale, false)))
      }
      return arr
    },
  },
}
