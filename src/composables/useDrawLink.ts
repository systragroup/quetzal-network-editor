/* eslint-disable @typescript-eslint/naming-convention */
import { baseLineString, createLinestringFeature } from '@src/types/geojson'
import { GeoJSONSource, Map, MapMouseEvent } from 'mapbox-gl'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useTheme } from 'vuetify'

export function useDrawLink(currentMap: Map) {
  const map = ref(currentMap)
  const name = 'drawlink'
  const layerId = `layer-${name}`
  const sourceId = `source-${name}`

  const drawMode = ref(false)
  const drawLink = ref(baseLineString([createLinestringFeature([[0, 0], [0, 0]], { nodeId: null })]))

  function updateDrawLink (event: MapMouseEvent) {
    showDraw()
    drawLink.value.features[0].geometry.coordinates[1] = Object.values(event.lngLat)
    setData()
  }

  function setData() {
    const mapSource = map.value.getSource(sourceId) as GeoJSONSource
    mapSource.setData(drawLink.value)
  }

  function showDraw () {
    map.value.setLayoutProperty(layerId, 'visibility', 'visible')
  }

  function hideDraw () {
    map.value.setLayoutProperty(layerId, 'visibility', 'none')
  }

  function stopDraw () {
    drawMode.value = false
    drawLink.value.features[0].geometry.coordinates = []
    hideDraw()
  }
  const theme = useTheme()

  function addLayer() {
    map.value.addSource(sourceId, {
      type: 'geojson',
      data: drawLink.value,
      dynamic: false,
    })

    map.value.addLayer({
      id: layerId,
      type: 'line',
      minzoom: 2,
      source: sourceId,
      paint: {
        'line-color': theme.current.value.colors.linksprimary,
        'line-width': 3,
        'line-dasharray': ['literal', [0, 2, 4]],
      },
    })
  }

  function removeLayer() {
    if (map.value.getLayer(layerId)) {
      map.value.removeLayer(layerId)
      map.value.removeSource(sourceId)
    }
  }

  onMounted(() => {
    addLayer()
    map.value.on('mouseout', hideDraw)
  })

  onBeforeUnmount(() => {
    removeLayer()
    map.value.off('mouseout', hideDraw)
  })

  return {
    map,
    drawMode,
    drawLink,
    updateDrawLink,
    hideDraw,
    stopDraw,
  }
}
