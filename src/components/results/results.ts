import { cloneDeep } from 'lodash'
import { ref, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { CRSis4326 } from '@src/utils/serializer'
import chroma from 'chroma-js'
import seedrandom from 'seedrandom'
import { arrayMinMax } from '@src/utils/utils'
import { baseLineString, GeoJson } from '@src/types/geojson'
import { DisplaySettings, Style } from '@src/types/typesStore'
const $gettext = (s: string) => s

export type FeatureName = string

export type MatrixData = Record<FeatureName, Record<string, string>>

export interface Preset extends Style {
  selectedFilter: string
  selectedCategory?: string[]
  selectedIndex?: string
}

const defaultSettings: DisplaySettings = {
  selectedFeature: '',
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
  labels: '',
}

function isHexColor (variable: string) {
  const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/i
  return hexRegex.test(variable)
}

function remap (val: number | string, minVal: number, maxVal: number,
  reverse: boolean, scale: string, isWidth: boolean) {
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
  const layer = ref<GeoJson>(baseLineString()) // pointer to the selected data
  const visibleLayer = ref<GeoJson>(baseLineString()) // actual values displayed
  const nanLayer = ref<GeoJson>(baseLineString())
  const type = ref('LineString')
  const displaySettings = ref(cloneDeep(defaultSettings))

  const attributes = ref<string[]>([]) // list of properties names
  const selectedFilter = ref<string>('') // selected filter (property name) ex: route_type
  const selectedCategory = ref<string[]>([]) // sellected values of that property ex: [bus,metro]

  const hasOD = ref<boolean>(false)
  const mat = ref<MatrixData>({}) // mat
  const matAvailableIndex = ref<Record<FeatureName, string[]>>({}) // list of clickable index.
  const matSelectedIndex = ref<FeatureName>('')

  function reset () {
    layer.value = baseLineString()
    visibleLayer.value = baseLineString()
    nanLayer.value = baseLineString()
    type.value = 'LineString'
    displaySettings.value = cloneDeep(defaultSettings)

    attributes.value = []
    selectedFilter.value = ''
    selectedCategory.value = []

    hasOD.value = false
    mat.value = {}
    matAvailableIndex.value = {}
    matSelectedIndex.value = ''
  }

  function loadLayer (data: GeoJson, matData: MatrixData | null, preset: Preset | null = null) {
    reset()
    layer.value = data
    // Handle type
    type.value = layer.value.features[0]?.geometry.type
    type.value = type.value === 'MultiPolygon' ? 'Polygon' : type.value // Multipolygon is polygon type.
    if (type.value !== 'Polygon') { displaySettings.value.extrusion = false }

    // handle OD
    hasOD.value = (typeof matData === 'object' && matData !== null)
    if (hasOD.value) { addMatrix(matData as MatrixData) }

    getLayerProperties() // TODO remove on static
    if (preset?.selectedFilter && attributes.value.includes(preset.selectedFilter)) {
      // if preset contain a filter. apply it if it exist.
      changeSelectedFilter(preset.selectedFilter)
      // if there is a list of cat. apply them, else its everything
      if (preset?.selectedCategory) {
        selectedCategory.value = preset.selectedCategory
      }
    }

    const settings = preset?.displaySettings
    if (settings) { applySettings(settings) }

    refreshVisibleLinks()
    updateSelectedFeature()

    if (!CRSis4326(layer.value)) {
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('invalid or missing CRS. use CRS84 / EPSG:4326'),
          autoClose: true, color: 'warning' })
    }
  }

  function applySettings (payload: DisplaySettings) {
    const keys = Object.keys(payload)
    // apply all payload settings to state.displaySettings
    for (const key of keys) {
      displaySettings.value[key] = payload[key]
    }
  }
  // OD stuff

  const attributesWithOD = computed(() => Object.keys(mat.value))

  function addMatrix (payload: MatrixData) {
    Object.keys(payload).forEach(key => { mat.value[`${key} (Interactive)`] = payload[key] })
    // force index to string
    layer.value.features.forEach(feat => feat.properties.index = String(feat.properties.index))
    attributesWithOD.value.forEach(attr => {
      // get all clickable indexes
      matAvailableIndex.value[attr] = Object.keys(mat.value[attr])
      // init all values in layer to null
      layer.value.features.forEach(feat => feat.properties[attr] = null)
    })
  }

  function isIndexAvailable (index: string) {
    // check if the selected index (from preset) is in the selected property (and if the selected property is an OD)
    const selectedProperty = displaySettings.value.selectedFeature
    if (selectedProperty && attributesWithOD.value.includes(selectedProperty)) {
      return matAvailableIndex.value[selectedProperty].includes(index)
    } else {
      return false
    }
  }

  function changeOD (index: string) {
    const selectedProperty = displaySettings.value.selectedFeature
    if (selectedProperty && attributesWithOD.value.includes(selectedProperty) && hasOD.value) {
      matSelectedIndex.value = index
      const row = mat.value[selectedProperty][matSelectedIndex.value]
      // apply new value to each zone. (zone_1 is selected, apply time to zone_1 to every zone)
      // if there is no data, put null (ex: sparse matrix)
      layer.value.features.forEach(
        feat => feat.properties[selectedProperty] = row ? row[feat.properties.index] : null)
    }
    refreshVisibleLinks()
    updateSelectedFeature()
  }

  // Layer manipulation

  function simplifyLayer() {
    const key = displaySettings.value.selectedFeature
    const label = displaySettings.value.labels
    visibleLayer.value.features = visibleLayer.value.features.map(feat => {
      return {
        type: 'Feature',
        geometry: feat.geometry,
        properties: {
          [key]: feat.properties[key],
          [label]: feat.properties[label],
          index: feat.properties?.index, // index for OD
        },
      }
    })
  }

  function getNaNLayer() {
    // keep track of NaN links to display them when we have a polygon
    const hideNaN = !displaySettings.value.showNaN
    if (hideNaN) {
      const key = displaySettings.value.selectedFeature
      nanLayer.value.features = visibleLayer.value.features.filter(link => !link.properties[key])
    } else {
      nanLayer.value = baseLineString()
    }
  }

  function removeNaN() {
    const hideNaN = !displaySettings.value.showNaN
    if (hideNaN) {
      const key = displaySettings.value.selectedFeature
      const allNaN = layer.value.features.filter(link => link.properties[key]).length === 0
      const isODKey = Object.keys(matAvailableIndex.value).includes(key)
      // do not remove NaN if its interactive selection map (show green)
      if (allNaN && isODKey && hasOD.value) return
      // else remove NaN
      visibleLayer.value.features = visibleLayer.value.features.filter(link => link.properties[key])
    }
  }

  function refreshVisibleLinks () {
    const group = new Set(selectedCategory.value)
    const cat = selectedFilter.value
    visibleLayer.value.features = layer.value.features.filter(link => group.has(link.properties[cat]))
    if (type.value === 'Polygon') getNaNLayer()
    removeNaN()
    simplifyLayer()
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
    if (displaySettings.value.reverseColor) pad.reverse()
    const chromaScale = chroma.scale(cmap).padding(pad)
      .domain([0, 1], 0, scale).classes(numStep)

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
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('Clickable element in green'), autoClose: true, color: 'success' })
    }
  }

  // filtering

  function getLayerProperties () {
    // get all Properties, and set the filter
    const attrs: Set<string> = new Set([])
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

  function changeSelectedFilter (payload: string) {
    selectedFilter.value = payload
    // set all visible
    selectedCategory.value = Array.from(new Set(layer.value.features.map(
      item => item.properties[selectedFilter.value])))
  }

  function changeSelectedCategory (payload: string[]) {
    selectedCategory.value = payload
  }

  const filteredCategory = computed(() => {
    // for a given filter (key) get array of unique value
    // e.g. get ['bus','subway'] for route_type
    let val = Array.from(new Set(layer.value.features.map(
      item => item.properties[selectedFilter.value])))
    val = val.sort((a, b) => a - b)
    return val
  })

  // colorScale component (on bottom of map)

  const colorScale = computed(() => {
    const arr = []
    let pad = displaySettings.value.padding
    pad = [pad[0] / 100, 1 - pad[1] / 100]
    if (displaySettings.value.reverseColor) pad.reverse()

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
    nanLayer,
    displaySettings,
    selectedFilter,
    selectedCategory,
    hasOD,
    attributesWithOD,
    matAvailableIndex,
    matSelectedIndex,
    changeOD,
    isIndexAvailable,
    loadLayer,
    getLayerProperties,
    refreshVisibleLinks,
    updateSelectedFeature,
    changeSelectedFilter,
    changeSelectedCategory,
    applySettings,
    filteredCategory,
    colorScale,
  }
}
