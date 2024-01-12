<!-- eslint-disable no-case-declarations -->
<script>
import MapLegend from '@comp/utils/MapLegend.vue'
import { onBeforeUnmount, toRefs, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useResult } from '@comp/results/results.js'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
const $gettext = s => s

// set visibility. to render or not by fetching the data.
// we need to create all the statics link (even without the data)
// for the correct z-order. if not, they are drawn over the links.
export default {
  name: 'StaticLayer',
  components: {
    MapLegend,

  },
  props: ['preset', 'map', 'order'],
  setup (props) {
    const linksStore = useLinksStore()
    const rlinksStore = userLinksStore()
    const ODStore = useODStore()
    const store = useIndexStore()
    const { preset, map, order: zorder } = toRefs(props)
    const name = preset.value.name
    const sourceId = name + '-source'
    const layerId = name + '-layer'
    const {
      visibleLayer, type, loadLayer, displaySettings, attributes, changeSelectedFilter,
      changeSelectedCategory, colorScale, isIndexAvailable, changeOD,
    } = useResult()

    const opacity = preset.value.displaySettings.opacity
    const offsetValue = preset.value.displaySettings.offset ? -1 : 1

    async function changeLayer (layer, settings = null) {
      switch (layer) {
        case 'links':
          loadLayer(linksStore.links, null, settings)
          break
        case 'rlinks':
          loadLayer(rlinksStore.rlinks, null, settings)
          break
        case 'nodes':
          loadLayer(linksStore.nodes, null, settings)
          break
        case 'rnodes':
          loadLayer(rlinksStore.rnodes, null, settings)
          break
        case 'od':
          loadLayer(ODStore.layer, null, settings)
          break
        default:
          const data = await store.getOtherFile(layer, 'geojson')
          const matrix = await store.getOtherFile(layer, 'json')
          loadLayer(data, matrix, settings)

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
          },
        }
      })

      // those lines over were beforeMounted and those in Mounted. but because au the async.
      // it was mounted befor the beforeMounted had finished.

      map.value.addSource(sourceId, {
        'type': 'geojson',
        data: visibleLayer.value
        ,
      })

      if (type.value === 'LineString') {
        map.value.addLayer({
          'id': layerId,
          'type': 'line',
          'minzoom': 5,
          'source': sourceId,
          'layout': {
            'line-sort-key': ['to-number', ['get', 'display_width']],
            'line-cap': 'round',
          },
          'paint': {
            'line-color': ['get', 'display_color'],
            'line-opacity': opacity / 100,
            'line-offset': ['*', offsetValue * 0.5, ['to-number', ['get', 'display_width']]],
            'line-width': ['get', 'display_width'],
          },
        })
      } else if (type.value === 'Point') {
        map.value.addLayer({
          'id': layerId,
          'type': 'circle',
          'minzoom': 5,
          'source': sourceId,
          'layout': {
            'circle-sort-key': ['to-number', ['get', 'display_width']],
          },
          'paint': {
            'circle-color': ['get', 'display_color'],
            'circle-radius': ['get', 'display_width'],
            'circle-opacity': opacity / 100,
          },
        })
      } else if (['MultiPolygon', 'Polygon'].includes(type.value) && !displaySettings.value.extrusion) {
        map.value.addLayer({
          'id': layerId,
          'type': 'fill',
          'minzoom': 5,
          'source': sourceId,
          'paint': {
            'fill-color': ['get', 'display_color'],
            'fill-opacity': opacity / 100,
          },
        })
      } else if (['MultiPolygon', 'Polygon'].includes(type.value) && displaySettings.value.extrusion) {
        map.value.addLayer({
          'id': layerId,
          'type': 'fill-extrusion',
          'minzoom': 5,
          'source': sourceId,
          'paint': {
            'fill-extrusion-color': ['get', 'display_color'],
            'fill-extrusion-opacity': opacity / 100,
            'fill-extrusion-height': ['*', 1000, ['to-number', ['get', 'display_width']]],

          },
        })
      }

      // move layer under results (links and OD are over this one)
      if (map.value.getLayer('results')) { map.value.moveLayer(layerId, 'results') }
      // move layer under rlinks (links and OD are over this one)
      if (map.value.getLayer('staticrLinks')) { map.value.moveLayer(layerId, 'staticrLinks') }
    })

    onBeforeUnmount(() => {
      if (map.value.getLayer(layerId)) {
        map.value.removeLayer(layerId)
        map.value.removeSource(sourceId)
      }
    })

    return {
      displaySettings,
      zorder,
      colorScale,
    }
  },

}
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
  bottom:0px;
  position: absolute;
}
</style>
