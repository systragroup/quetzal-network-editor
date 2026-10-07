/* eslint-disable @typescript-eslint/naming-convention */
import { ref, onUnmounted, shallowRef } from 'vue'
import chroma from 'chroma-js'
import { GeoJSONSource, Map } from 'mapbox-gl'
import { baseLineString, LineStringFeatures } from '@src/types/geojson'
import { cloneDeep } from 'lodash'
const YELLOW = '#FFD400'
const BLUE = '#00BFFF'
const SOURCEID = 'highlightLink'

const highlightTrip = ref<string | null>(null)
const map = shallowRef<Map>()

function _getColor(color: string | undefined) {
  if (!color) return YELLOW
  const diff = chroma.distance(color.trim(), YELLOW)
  return diff > 50 ? YELLOW : BLUE
}

export function useHighlight() {
  //
  // add a Highlight layer on the map
  //
  function setHighlightTrip(val: string | null) {
    // change highlightTrip. then watch this value in the map copmponent to setData
    highlightTrip.value = val
  }

  let currentColor = YELLOW

  function setHighlightData(features: LineStringFeatures[]) {
    if (!map?.value) return
    const source = map.value.getSource(SOURCEID) as GeoJSONSource
    if (!source) return
    // hide if nothing. show if something
    if (features.length == 0) {
      map.value.setLayoutProperty(SOURCEID, 'visibility', 'none')
      map.value.setLayoutProperty(`${SOURCEID}-arrows`, 'visibility', 'none')
    } else {
      const highlightLinks = baseLineString()
      highlightLinks.features = cloneDeep(features)
      source.setData(highlightLinks)
      map.value.setLayoutProperty(SOURCEID, 'visibility', 'visible')
      map.value.setLayoutProperty(`${SOURCEID}-arrows`, 'visibility', 'visible')
      // set color if needed
      const highlightColor = _getColor(features[0]?.properties.route_color)
      if (highlightColor !== currentColor) {
        currentColor = highlightColor
        map.value.setPaintProperty(SOURCEID, 'line-color', highlightColor)
        map.value.setPaintProperty(`${SOURCEID}-arrows`, 'icon-color', highlightColor)
      }
    }
  }

  onUnmounted(() => {
    setHighlightTrip(null)
    if (!map.value) return
    if (map.value.getSource(SOURCEID)) return // layer already init on map
    map.value.removeLayer(`${SOURCEID}-arrows`)
    map.value.removeLayer(SOURCEID)
    map.value.removeSource(SOURCEID)
  })

  function initLayer(mapRef: Map) {
    // init the composable with the map. can be call with other component then
    map.value = mapRef
    // localMap.value = map
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
