/* eslint-disable @typescript-eslint/naming-convention */
import { ref, onUnmounted, Ref } from 'vue'
import chroma from 'chroma-js'
import { GeoJSONSource, Map } from 'mapbox-gl'
import { baseLineString, LineStringFeatures } from '@src/types/geojson'
import { cloneDeep } from 'lodash'
const YELLOW = '#FFD400'
const BLUE = '#00BFFF'
const SOURCEID = 'highlightLink'

const highlightTrip = ref<string | null>(null)

function _getColor(color: string | undefined) {
  if (!color) return YELLOW
  const diff = chroma.distance(color.trim(), YELLOW)
  return diff > 50 ? YELLOW : BLUE
}

export function useHighlight() {
  // add a Highlight layer on the map
  //
  function setHighlightTrip(val: string | null) {
    // change highlightTrip. then watch this value in the map copmponent to setData
    highlightTrip.value = val
  }

  function setHighlightData(map: Ref<Map>, features: LineStringFeatures[]) {
    if (!map) return
    const source = map.value.getSource(SOURCEID) as GeoJSONSource
    if (!source) return
    const highlightLinks = baseLineString()
    highlightLinks.features = cloneDeep(features)
    const highlightColor = _getColor(features[0]?.properties.route_color)
    source.setData(highlightLinks)
    map.value.setPaintProperty(SOURCEID, 'line-color', highlightColor)
    map.value.setPaintProperty(`${SOURCEID}-arrows`, 'icon-color', highlightColor)
  }

  function _unmount(map: Ref<Map>) {
    // this is added to onUnmounted() when we init. making sure we have a map.
    setHighlightTrip(null)
    if (map.value.getSource(SOURCEID)) return // layer already init on map
    map.value.removeLayer(`${SOURCEID}-arrows`)
    map.value.removeLayer(SOURCEID)
    map.value.removeSource(SOURCEID)
  }

  function initLayer(map: Ref<Map>) {
    // we dont want to have a map ref in the composable as components without map call it (like side panel)
    // the only way would be to have a copy of the map, but this not the best for performance
    onUnmounted(() => _unmount(map))
    if (map.value.getSource(SOURCEID)) return // layer already init on map
    map.value.addSource(SOURCEID, {
      type: 'geojson',
      data: baseLineString(),
      promoteId: 'index',
    })

    map.value.addLayer({
      id: SOURCEID,
      type: 'line',
      source: SOURCEID,
      paint: {
        'line-color': YELLOW,
        'line-opacity': 1,
        'line-width': 5,
      },
    })

    map.value.addLayer({
      id: `${SOURCEID}-arrows`,
      source: SOURCEID,
      type: 'symbol',
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 30,
        'icon-ignore-placement': true,
        'icon-image': 'arrow',
        'icon-size': 0.5,
        'icon-rotate': 90,
      },
      paint: {
        'icon-color': YELLOW,

      },
    })
  }

  return {
    highlightTrip,
    setHighlightTrip,
    setHighlightData,
    initLayer,
  }
}
