import { cloneDeep } from 'lodash'
import { ref, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { CRSis4326 } from '@comp/utils/serializer.js'
import chroma from 'chroma-js'
import seedrandom from 'seedrandom'
import geojson from '@constants/geojson'
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
  labels: null,
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
  const layer = ref(geojson)
  const visibleLayer = ref(geojson)
  const NaNLayer = ref(geojson)
  const type = ref('LineString')
  const attributes = ref([])
  const displaySettings = ref(cloneDeep(defaultSettings))
  const selectedFilter = ref('')
  const selectedCategory = ref([])

  const hasOD = ref(false)
  const mat = ref({})
  const ODfeatures = ref([])
  const matAvailableIndex = ref({})
  const matSelectedIndex = ref({})

  function reset () {
    layer.value = cloneDeep(geojson)
    visibleLayer.value = cloneDeep(geojson)
    NaNLayer.value = cloneDeep(geojson)
    type.value = 'LineString'
    attributes.value = []
    displaySettings.value = cloneDeep(defaultSettings)
    selectedFilter.value = ''
    selectedCategory.value = []

    hasOD.value = false
    mat.value = {}
    ODfeatures.value = []
    matAvailableIndex.value = {}
    matSelectedIndex.value = null
  }

  function loadLayer (data, matData, settings = null) {
    reset()
    // Maybe. serializer. but we should do it in import. not here...
    // file.content = serializer(file.content, file.path, null, false)
    layer.value = cloneDeep(data)
    type.value = layer.value.features[0]?.geometry.type
    // change Multipolygon to polygon type. just as they the same for mapbox and the app.
    type.value = type.value === 'MultiPolygon' ? 'Polygon' : type.value
    // extrusion only for polygon right now. set to false if not a polygon
    if (type.value !== 'Polygon') { displaySettings.value.extrusion = false }

    hasOD.value = (typeof matData === 'object' && matData !== null)
    if (hasOD.value) { addMatrix(matData) }

    if (CRSis4326(layer.value)) {
      // apply settings
      getLinksProperties()
      if (attributes.value.includes(settings?.selectedFeature)) {
        displaySettings.value.selectedFeature = settings?.selectedFeature
      } else {
        displaySettings.value.selectedFeature = null
      }
      if (settings != null) {
        applySettings(settings, true)
      }
      refreshVisibleLinks()
      updateSelectedFeature()
    } else {
      store.changeNotification(
        { text: $gettext('invalid or missing CRS. use CRS84 / EPSG:4326'),
          autoClose: true, color: 'warning' })
    }
  }
  function addMatrix (matData) {
    // payload is a matrix
    Object.keys(matData).forEach(key => { mat.value[key + ' (OD)'] = matData[key] })
    ODfeatures.value = Object.keys(mat.value)
    // force index to string
    // eslint-disable-next-line no-return-assign
    layer.value.features.forEach(zone => zone.properties.index = String(zone.properties.index))
    // if init with nothing, do nothing.
    if (layer.value.features.length > 0) {
      ODfeatures.value.forEach(
        prop => {
          // get all clickable indexes
          matAvailableIndex.value[prop] = Object.keys(mat.value[prop])
          // for each properties in matrix, init the zones to null.
          layer.value.features.forEach(
            // eslint-disable-next-line no-return-assign
            zone => zone.properties[prop] = null,
          )
        },
      )
    }
  }

  function isIndexAvailable (index) {
    // check if the selected index (from preset) is in the selected property (and if the selected property is an OD)
    const selectedProperty = displaySettings.value.selectedFeature

    if (ODfeatures.value.includes(selectedProperty)) {
      return matAvailableIndex.value[selectedProperty].includes(index)
    } else { return false }
  }
  function changeOD (index) {
    const selectedProperty = displaySettings.value.selectedFeature
    if (ODfeatures.value.includes(selectedProperty) && hasOD.value) {
      matSelectedIndex.value = index
      const row = mat.value[selectedProperty][matSelectedIndex.value]
      // apply new value to each zone. (zone_1 is selected, apply time to zone_1 to every zone)
      // if there is no data, put null (ex: sparse matrix)
      layer.value.features.forEach(
        // eslint-disable-next-line no-return-assign
        zone => zone.properties[selectedProperty] = row ? row[zone.properties.index] : null)
    }
    refreshVisibleLinks()
    updateSelectedFeature()
  }

  function getLinksProperties () {
    const attrs = new Set([])
    layer.value.features.forEach(element => {
      Object.keys(element.properties).forEach(key => attrs.add(key))
    })
    attributes.value = Array.from(attrs)
    attributes.value = attributes.value.filter(attr => !['display_width', 'display_color'].includes(attr))

    // eslint-disable-next-line max-len
    selectedFilter.value = attrs.has('route_type') ? 'route_type' : attrs.has('highway') ? 'highway' : attributes.value[0]
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
      if (allNaN && hasOD.value && Object.keys(matAvailableIndex.value).includes(key)) {
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
    const chromaScale = chroma.scale(cmap).padding(pad)
      .domain([0, 1], scale).classes(numStep)

    visibleLayer.value.features.forEach(
      link => {
        const val = link.properties[key]
        if (isHexColor(val)) {
          link.properties.display_color = val
        } else {
          link.properties.display_color = chromaScale(
            remap(val, minVal, maxVal, reverse, scale, false)).hex()
        }
      },
    )

    //
    // if OD prop ans all NaN. put green on clickable links.
    //
    const allNaN = layer.value.features.filter(link => link.properties[key]).length === 0
    if (allNaN && hasOD.value && Object.keys(matAvailableIndex.value).includes(key)) {
      const indexList = new Set(matAvailableIndex.value[key])
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
  function applySettings (payload, skip = false) {
    const keys = Object.keys(payload)
    // apply all payload settings to state.displaySettings
    for (const key of keys) {
      displaySettings.value[key] = payload[key]
    }
    if (!skip) {
      refreshVisibleLinks()
      updateSelectedFeature()
    }
  }
  const filteredCategory = computed(() => {
    // for a given filter (key) get array of unique value
    // e.g. get ['bus','subway'] for route_type
    const val = Array.from(new Set(layer.value.features.map(
      item => item.properties[selectedFilter.value]))).sort()
    return val
  })

  const colorScale = computed(() => {
    const arr = []
    let pad = displaySettings.value.padding
    pad = [pad[0] / 100, 1 - pad[1] / 100]
    pad = displaySettings.value.reverseColor ? pad.reverse() : pad
    const chromaScale = chroma.scale(displaySettings.value.cmap).padding(pad)
      .domain([0, 1]).classes(displaySettings.value.numStep)
    for (let i = 0; i < 100; i++) {
      arr.push(chromaScale(remap(i, 0, 100, displaySettings.value.reverseColor, displaySettings.value.scale, false)))
    }
    return arr
  })

  // expose managed state as return value
  return {
    layer,
    type,
    attributes,
    visibleLayer,
    NaNLayer,
    displaySettings,
    selectedFilter,
    selectedCategory,
    hasOD,
    ODfeatures,
    matAvailableIndex,
    matSelectedIndex,
    changeOD,
    isIndexAvailable,
    loadLayer,
    getLinksProperties,
    refreshVisibleLinks,
    updateSelectedFeature,
    changeSelectedFilter,
    changeSelectedCategory,
    applySettings,
    filteredCategory,
    colorScale,
  }
}
