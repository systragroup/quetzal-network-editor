<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import MapLegend from '@comp/utils/MapLegend.vue'
import { onBeforeUnmount, toRefs, onMounted, onBeforeMount } from 'vue'
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
    MglGeojsonLayer,
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
    const {
      visibleLayer, type, loadLayer, displaySettings, attributes, applySettings, changeSelectedFilter,
      changeSelectedCategory, colorScale,
    } = useResult()

    const opacity = displaySettings.value.opacity
    const offsetValue = displaySettings.value.offset ? -1 : 1

    function changeLayer (layer) {
      switch (layer) {
        case 'links':
          loadLayer(linksStore.links, null, null, 'headway')
          break
        case 'rlinks':
          loadLayer(rlinksStore.rlinks, null, null, 'speed')
          break
        case 'nodes':
          loadLayer(linksStore.nodes, null, null, 'boardings')
          break
        case 'rnodes':
          loadLayer(rlinksStore.rnodes, null, null, 'boardings')
          break
        case 'od':
          loadLayer(ODStore.layer, null, null, 'name')
          break
        default:
          // TODO: gerer les ODs.
          // eslint-disable-next-line no-case-declarations
          const data = store.otherFiles.filter(file => file.name === layer)[0].content
          loadLayer(data, null, null, '')

          break
      }
    }

    onBeforeMount(() => {
      changeLayer(preset.value.layer)
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
      applySettings(preset.value.displaySettings)
    })
    // move layer under rlinks (links and OD are over this one)
    onMounted(() => {
      if (map.value.getLayer('results')) {
        map.value.moveLayer(name + '-layer', 'results')
      }
      if (map.value.getLayer('rlinks')) {
        map.value.moveLayer(name + '-layer', 'rlinks')
      }
    })

    onBeforeUnmount(() => {
      if (map.value.getLayer(name + '-layer')) {
        map.value.removeLayer(name + '-layer')
      }
    })

    return {
      name,
      type,
      visibleLayer,
      opacity,
      offsetValue,
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

    <MglGeojsonLayer
      v-if="['MultiPolygon', 'Polygon'].includes(type)"
      :map="map"
      :source-id="name+ '-layer'"
      :source="{
        type: 'geojson',
        data: visibleLayer,
      }"
      :layer-id="name+ '-layer'"
      :layer="{
        interactive: false,
        type: 'fill',
        minzoom: 5,
        'paint': {
          'fill-color': ['get', 'display_color'],
          'fill-opacity': opacity/100,

        }
      }"
    />
    <MglGeojsonLayer
      v-if="type=='LineString'"
      :map="map"
      :source-id="name+ '-layer'"
      :source="{
        type: 'geojson',
        data: visibleLayer,
        buffer: 0,
        promoteId: 'index',
      }"
      :layer-id="name+ '-layer'"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 5,
        paint: {
          'line-color': ['get', 'display_color'],
          'line-opacity':opacity/100,
          'line-offset': ['*',offsetValue*0.5,['to-number', ['get', 'display_width']]],

          'line-width': ['get', 'display_width'],
        },
        layout: {
          'line-sort-key': ['to-number',['get', 'display_width']],
          'line-cap': 'round',
        }
      }"
    />
    <MglGeojsonLayer
      v-if="type == 'Point'"
      :map="map"
      :source-id="name+ '-layer'"
      :source="{
        type: 'geojson',
        data: visibleLayer,
      }"
      :layer-id="name+ '-layer'"
      :layer="{
        interactive: false,
        type: 'circle',
        minzoom: 5,
        paint: {
          'circle-color': ['get', 'display_color'],
          'circle-radius': ['get', 'display_width'],
          'circle-opacity':opacity/100,
        },
        layout: {
          'circle-sort-key': ['to-number',['get', 'display_width']],
        }
      }"
    />
    <MglGeojsonLayer
      v-if="type == 'extrusion'"
      :map="map"
      :source-id="name+ '-layer'"
      :source="{
        type: 'geojson',
        data: visibleLayer,
      }"
      :layer-id="name+ '-layer'"
      :layer="{
        interactive: false,
        type: 'fill-extrusion',
        minzoom: 5,
        'paint': {
          'fill-extrusion-color':['get', 'display_color'],
          'fill-extrusion-opacity': opacity/100,
          'fill-extrusion-height':['*',1000,['to-number', ['get', 'display_width']]],

        },

      }"
    />
  </section>
</template>

<style lang="scss" scoped>
.map-legend {
  height: 100%;
  bottom:0px;
  position: absolute;
}
</style>
