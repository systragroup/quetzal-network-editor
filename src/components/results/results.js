// mouse.js
import { cloneDeep } from 'lodash'
import { ref } from 'vue'
import { useIndexStore } from '@src/store/index'
import chroma from 'chroma-js'
import { seedrandom } from 'seedrandom'
const $gettext = s => s

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

// by convention, composable function names start with "use"
export function useResult () {
  // state encapsulated and managed by the composable
  const store = useIndexStore()
  const layer = ref({ crs: {}, type: 'FeatureCollection', features: [] })
  const header = ref({ crs: {}, type: '', features: [] })
  const visibleLayer = ref({ crs: {}, type: '', features: [] })
  const NaNLayer = ref({ crs: {}, type: '', features: [] })
  const type = ref('')
  const attributes = ref([])
  const displaySettings = ref(cloneDeep(defaultSettings))
  const selectedFilter = ref('')
  const selectedCategory = ref([])
  const hasOD = ref(false)
  const ODindex = ref({})
  const matAvailableIndex = ref({})

  function loadLayer (geojson, mat, matIndex, selectedFeature) {
    // TODO:
    // state.displaySettings = structuredClone(defaultSettings)
    // this.commit(`${state.namespace}/cleanLinks`)
    // Maybe. serializer. but we should do it in import. not here...
    // file.content = serializer(file.content, file.path, null, false)
    layer.value = cloneDeep(geojson)
    type.value = layer.value.features[0]?.geometry.type
    // change Multipolygon to polygon type. just as they the same for mapbox and the app.
    type.value = type.value === 'MultiPolygon' ? 'Polygon' : type.value
    // extrusion only for polygon right now. set to false if not a polygon
    if (type.value !== 'Polygon') { displaySettings.value.extrusion = false }
    hasOD.value = mat !== null
    ODindex.value = matIndex || {}
    if (['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(layer.value.crs.properties.name)) {
      const linksHeader = cloneDeep(layer)
      linksHeader.value.features = []
      header.value = linksHeader
      visibleLayer.value.crs = cloneDeep(linksHeader.value.crs)
      visibleLayer.value.type = cloneDeep(linksHeader.value.type)
      NaNLayer.value = cloneDeep(linksHeader)
      // set all trips visible
      getLinksProperties()
      if (attributes.value.includes(selectedFeature)) {
        displaySettings.value.selectedFeature = selectedFeature
      } else {
        displaySettings.value.selectedFeature = null
      }
      refreshVisibleLinks()
      updateSelectedFeature()
    } else { alert('invalid CRS. use CRS84 / EPSG:4326') }
  }
  function updateLayer (geojson) {
    layer.value = cloneDeep(geojson)
    refreshVisibleLinks()
    updateSelectedFeature()
  }
  function getLinksProperties () {
    const header = new Set([])
    layer.value.features.forEach(element => {
      Object.keys(element.properties).forEach(key => header.add(key))
    })
    attributes.value = Array.from(header)
    attributes.value = attributes.value.filter(attr => !['display_width', 'display_color'].includes(attr))

    // eslint-disable-next-line max-len
    selectedFilter.value = header.has('route_type') ? 'route_type' : header.has('highway') ? 'highway' : attributes.value[0]
    selectedCategory.value = Array.from(new Set(layer.value.features.map(
      item => item.properties[selectedFilter.value])))
  }
  function refreshVisibleLinks () {
    const group = new Set(selectedCategory.value)
    const cat = selectedFilter.value
    const key = displaySettings.value.selectedFeature
    visibleLayer.value.features = layer.value.features.filter(link => group.has(link.properties[cat]))
    if (!displaySettings.value.showNaN) {
      // keep track of NaN links to display them when we have a polygon
      NaNLayer.value.features = visibleLayer.value.features.filter(link => !link.properties[key])
      const allNaN = layer.value.features.filter(link => link.properties[key]).length === 0
      if (allNaN && hasOD.value && Object.keys(ODindex.value).includes(key)) {
        // keep visible links as we want to show clickable links
      } else {
        // remove NaN from links
        visibleLayer.value.features = visibleLayer.value.features.filter(link => link.properties[key])
      }
    }
  }
  function updateSelectedFeature () {
    const key = displaySettings.value.selectedFeature
    const maxWidth = displaySettings.value.maxWidth
    const minWidth = displaySettings.value.minWidth
    const scale = displaySettings.value.scale
    const numStep = displaySettings.value.numStep
    const cmap = displaySettings.value.cmap
    const featureArr = visibleLayer.value.features.filter(
      link => link.properties[key]).map(
      link => link.properties[key])
    if (!displaySettings.value.fixScale) {
      const arrayMinMax = (arr) =>
        arr.reduce(([min, max], val) => [Math.min(min, val), Math.max(max, val)], [
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
        ])

      const [minV, maxV] = arrayMinMax(featureArr)
      displaySettings.value.minVal = Math.round(minV * 100) / 100
      displaySettings.value.maxVal = Math.round(maxV * 100) / 100
    }
    const minVal = displaySettings.value.minVal
    const maxVal = displaySettings.value.maxVal
    const reverse = displaySettings.value.reverseColor

    visibleLayer.value.features.forEach(
      link => {
        let val = link.properties[key]
        val = remap(val, minVal, maxVal, false, scale, true)
        link.properties.display_width = (maxWidth - minWidth) * val + minWidth
      },
    )
    let pad = cloneDeep(displaySettings.value.padding)
    pad = [pad[0] / 100, 1 - pad[1] / 100]
    pad = displaySettings.value.reverseColor ? pad.reverse() : pad
    const colorScale = chroma.scale(cmap).padding(pad)
      .domain([0, 1], scale).classes(numStep)

    visibleLayer.value.features.forEach(
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
    const allNaN = layer.value.features.filter(link => link.properties[key]).length === 0
    if (allNaN && hasOD.value && Object.keys(ODindex.value).includes(key)) {
      const indexList = new Set(ODindex.value[key])
      visibleLayer.value.features.forEach(
        link => {
          if (indexList.has(link.properties.index)) {
            link.properties.display_width = 10
            link.properties.display_color = '#4CAF50'
          }
        })
      store.changeNotification(
        { text: $gettext('Clickable element in green'), autoClose: true, color: 'success' })
    }
  }
  function changeSelectedFilter (payload) {
    selectedFilter.value = payload
    // set all visible
    selectedCategory.value = Array.from(new Set(layer.value.features.map(
      item => item.properties[selectedFilter.value])))
    refreshVisibleLinks()
  }
  function changeSelectedCategory (payload) {
    selectedCategory.value = payload
    refreshVisibleLinks()
  }
  function applySettings (payload) {
    const keys = Object.keys(payload)
    // apply all payload settings to state.displaySettings
    for (const key of keys) {
      displaySettings.value[key] = payload[key]
    }
    refreshVisibleLinks()
    updateSelectedFeature()
  }

  // expose managed state as return value
  return {
    layer,
    type,
    header,
    attributes,
    visibleLayer,
    NaNLayer,
    displaySettings,
    selectedFilter,
    selectedCategory,
    hasOD,
    ODindex,
    matAvailableIndex,
    loadLayer,
    updateLayer,
    getLinksProperties,
    refreshVisibleLinks,
    updateSelectedFeature,
    changeSelectedFilter,
    changeSelectedCategory,
    applySettings,
  }
}
