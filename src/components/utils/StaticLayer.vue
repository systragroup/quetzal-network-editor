<!-- eslint-disable no-case-declarations -->
<script setup>
import MapLegend from '@comp/utils/MapLegend.vue'
import { onBeforeUnmount, toRefs, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useResult } from '@comp/results/results.js'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { useTheme } from 'vuetify'
const theme = useTheme()
// set visibility. to render or not by fetching the data.
// we need to create all the statics link (even without the data)
// for the correct z-order. if not, they are drawn over the links.

const props = defineProps(['preset', 'map', 'order', 'visibleRasters'])
const { preset, map, order: zorder, visibleRasters } = toRefs(props)
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const store = useIndexStore()
const name = preset.value.name
const sourceId = name + '-source'
const layerId = name + '-layer'
const labelId = name + '-labels'

const {
  visibleLayer, type, loadLayer, displaySettings, attributes, changeSelectedFilter,
  changeSelectedCategory, colorScale, isIndexAvailable, changeOD,
} = useResult()

const opacity = preset.value.displaySettings.opacity
const offsetValue = preset.value.displaySettings.offset ? -1 : 1
const labels = preset.value.displaySettings.labels

async function changeLayer (layer, settings = null) {
  switch (layer) {
    case 'links':
      await loadLayer(linksStore.links, null, settings)
      break
    case 'rlinks':
      await loadLayer(rlinksStore.rlinks, null, settings)
      break
    case 'nodes':
      await loadLayer(linksStore.nodes, null, settings)
      break
    case 'rnodes':
      await loadLayer(rlinksStore.rnodes, null, settings)
      break
    case 'od':
      await loadLayer(ODStore.layer, null, settings)
      break
    default:
      const data = await store.getOtherFile(layer, 'geojson')
      const matrix = await store.getOtherFile(layer, 'json')
      await loadLayer(data, matrix, settings)

      break
  }
}

onMounted(async () => {
  await changeLayer(preset.value.layer, preset.value.displaySettings)

  if (attributes.value.includes(preset.value?.selectedFilter)) {
    // if preset contain a filter. apply it if it exist.
    changeSelectedFilter(preset.value.selectedFilter)
    // if there is a list of cat. apply them, else its everything
    if (Object.keys(preset.value).includes('selectedCategory')) {
      changeSelectedCategory(preset.value.selectedCategory)
    } // else it will show all
  } else {
    // if the filter is in the preset but not the the layer. just put a warning.
    if (Object.keys(preset.value).includes('selectedFilter')) {
      store.changeNotification(
        {
          text: preset.value.selectedFilter + ' ' + $gettext('filter does not exist. use default one'),
          autoClose: true,
          color: 'error',
        })
    }
  }

  // if its an OD. click on the selected index.
  if (Object.keys(preset.value).includes('selectedIndex') && isIndexAvailable(preset.value.selectedIndex)) {
    changeOD(preset.value.selectedIndex)
    store.changeNotification({})
  }
  // simplify it
  visibleLayer.value.features = visibleLayer.value.features.map(obj => {
    return {
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
    data: visibleLayer.value
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
  const layersList = map.value.getStyle().layers.map(layer => layer.id)
  const index = visibleRasters.value.indexOf(name)
  let previousLayers = visibleRasters.value.map(layer => layer + '-layer').splice(0, index)
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
  } else if (map.value.getLayer('staticrLinks')) {
    map.value.moveLayer(layerId, 'staticrLinks')
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
        :base-offset="350"
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
