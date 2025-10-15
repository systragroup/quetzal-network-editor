<script setup lang="ts">
import MapLegend from '@comp/utils/MapLegend.vue'
import { onBeforeUnmount, toRefs, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useResult } from '@comp/results/results'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { useTheme } from 'vuetify'
import { Map } from 'mapbox-gl'
import { Style } from '@src/types/typesStore'
const theme = useTheme()
// set visibility. to render or not by fetching the data.
// we need to create all the statics link (even without the data)
// for the correct z-order. if not, they are drawn over the links.
interface Props {
  preset: Style
  map: Map
  order: number
  visibleLayers: string[]
}

// const props = defineProps(['preset', 'map', 'order', 'visibleLayers'])
const props = defineProps<Props>()
const { preset, map, order: zorder, visibleLayers } = toRefs(props)
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const store = useIndexStore()
const name = preset.value.name
const sourceId = name + '-source'
const layerId = name + '-layer'
const labelId = name + '-labels'

const {
  visibleLayer, type, loadLayer, displaySettings, colorScale, isIndexAvailable, changeOD } = useResult()

const opacity = preset.value.displaySettings.opacity
const offsetValue = preset.value.displaySettings.offset ? -1 : 1
const labels = preset.value.displaySettings.labels

async function changeLayer (layer: string, preset: Style | null = null) {
  switch (layer) {
    case 'links':
      loadLayer(linksStore.links, null, preset)
      break
    case 'rlinks':
      loadLayer(rlinksStore.rlinks, null, preset)
      break
    case 'nodes':
      loadLayer(linksStore.nodes, null, preset)
      break
    case 'rnodes':
      loadLayer(rlinksStore.rnodes, null, preset)
      break
    case 'od':
      loadLayer(ODStore.layer, null, preset)
      break
    default:
      const data = await store.getOtherFile(layer, 'geojson')
      const matrix = await store.getOtherFile(layer, 'json')
      loadLayer(data, matrix, preset)
      break
  }
}

onMounted(async () => {
  await changeLayer(preset.value.layer, preset.value)

  // if its an OD. click on the selected index.
  if (preset.value?.selectedIndex && isIndexAvailable(preset.value.selectedIndex)) {
    changeOD(preset.value.selectedIndex)
    store.changeNotification({ text: '' })
  }
  // simplify it
  visibleLayer.value.features = visibleLayer.value.features.map(obj => {
    return {
      type: 'Feature',
      geometry: obj.geometry,
      properties: {
        display_color: obj.properties.display_color,
        display_width: obj.properties.display_width,
        label: obj.properties[labels],
      },
    }
  })

  addLayer()
  moveLayer()
})

function addLayer () {
  map.value.addSource(sourceId, {
    type: 'geojson',
    data: visibleLayer.value as any
    ,
  })

  if (type.value === 'LineString') {
    map.value.addLayer({
      id: layerId,
      type: 'line',
      minzoom: 5,
      source: sourceId,
      layout: {
        'line-sort-key': ['to-number', ['get', 'display_width']],
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'display_color'],
        'line-opacity': opacity / 100,
        'line-offset': ['*', offsetValue * 0.5, ['to-number', ['get', 'display_width']]],
        'line-width': ['get', 'display_width'],
      },
    })
  } else if (type.value === 'Point') {
    map.value.addLayer({
      id: layerId,
      type: 'circle',
      minzoom: 5,
      source: sourceId,
      layout: {
        'circle-sort-key': ['to-number', ['get', 'display_width']],
      },
      paint: {
        'circle-color': ['get', 'display_color'],
        'circle-radius': ['get', 'display_width'],
        'circle-opacity': opacity / 100,
      },
    })
  } else if (['MultiPolygon', 'Polygon'].includes(type.value) && !displaySettings.value.extrusion) {
    map.value.addLayer({
      id: layerId,
      type: 'fill',
      minzoom: 5,
      source: sourceId,
      paint: {
        'fill-color': ['get', 'display_color'],
        'fill-opacity': opacity / 100,
      },
    })
  } else if (['MultiPolygon', 'Polygon'].includes(type.value) && displaySettings.value.extrusion) {
    map.value.addLayer({
      id: layerId,
      type: 'fill-extrusion',
      minzoom: 5,
      source: sourceId,
      paint: {
        'fill-extrusion-color': ['get', 'display_color'],
        'fill-extrusion-opacity': opacity / 100,
        'fill-extrusion-height': ['*', 1000, ['to-number', ['get', 'display_width']]],

      },
    })
  }
  if (labels !== null) {
    map.value.addLayer({
      id: labelId,
      source: sourceId,
      type: 'symbol',
      layout: {
        'text-field': ['get', 'label'],
        'text-variable-anchor': ['top'],
        'text-radial-offset': 0.6,
        'text-justify': 'auto',
      },
      paint: { 'text-color': theme.current.value.colors.black },
    })
  }
}
function moveLayer () {
  // move layer in the correct order. must move layer under another layer.
  // as the layers load async. the "under layer" may not exist yet. so we check every layers on the map
  // and place it under the closest one. if none are loaded (or first) place on top.
  // ex: order: 1,2,3,4. only 1,2 are loaded when 4 is mounted. place 4 under 2. it works because
  // when 3 will mount. it will go under 2 => 1,2,3,4.
  const styles = map.value.getStyle()
  if (!styles) {
    return
  }
  const layersList = styles.layers.map(layer => layer.id)
  const index = visibleLayers.value.indexOf(name)
  let previousLayers = visibleLayers.value.map(layer => layer + '-layer').splice(0, index)
  previousLayers = previousLayers.filter(layer => layersList.includes(layer))
  const previousLayer = previousLayers.slice(-1)[0] // take last one. [1,2,3,4]. 5 is under 4, last one.
  if (previousLayer) {
    // layerId under previousLayer
    map.value.moveLayer(layerId, previousLayer)
  } else {
    // no previous layer loaded yet (or first one). move on top.
    moveLayerOnTop()
  }
}

function moveLayerOnTop () {
  // move layer on top. top depend on which map is loaded and with layer (rlinks or links)
  if (map.value.getLayer('results')) {
    map.value.moveLayer(layerId, 'results')
  } else if (map.value.getLayer('rlinks')) {
    map.value.moveLayer(layerId, 'rlinks')
  } else if (map.value.getLayer('links')) {
    map.value.moveLayer(layerId, 'links')
  }
}
onBeforeUnmount(() => {
  if (map.value.getLayer(labelId)) {
    map.value.removeLayer(labelId)
  }
  if (map.value.getLayer(layerId)) {
    map.value.removeLayer(layerId)
    map.value.removeSource(sourceId)
  }
})

</script>
<template>
  <section>
    <div
      class="map-legend"
    >
      <MapLegend
        :color-scale="colorScale"
        :display-settings="displaySettings"
        :order="zorder"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.map-legend {
  height: 100%;
  bottom: 0;
  position: absolute;
}
</style>
