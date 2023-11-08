<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import MapLegend from '@comp/utils/MapLegend.vue'
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
  data () {
    return {
      type: '',
      layer: {},
      opacity: 100,
      offsetValue: -1,
      displaySettings: {},
      colorScale: null,

    }
  },
  watch: {

  },
  beforeDestroy () {
    if (this.map.getLayer(this.preset.name + '-layer')) {
      this.map.removeLayer(this.preset.name + '-layer')
    }
  },
  mounted () {
    // move layer under rlinks (links and OD are over this one)
    this.map.moveLayer(this.preset.name + '-layer', 'rlinks')
  },
  created () {
    // init data to empty geojson to load the mapbox layer
    this.opacity = this.preset.displaySettings.opacity
    this.offsetValue = this.preset.displaySettings.offset ? -1 : 1

    this.changeLayer(this.preset.layer)
    if (Object.keys(this.preset).includes('selectedFilter')) {
      if (this.$store.getters['results/lineAttributes'].includes(this.preset.selectedFilter)) {
      // if preset contain a filter. apply it if it exist.
        this.$store.commit('results/changeSelectedFilter', this.preset.selectedFilter)
        // if there is a list of cat. apply them, else its everything
        if (Object.keys(this.preset).includes('selectedCategory')) {
          this.$store.commit('results/changeSelectedCategory', this.preset.selectedCategory)
          this.$store.commit('results/updateSelectedFeature')
        }
      } else {
        this.$store.commit('changeNotification',
          {
            text: this.preset.selectedFilter + ' ' + $gettext('filter does not exist. use default one'),
            autoClose: true,
            color: 'error',
          })
      }
    }

    this.$store.commit('results/applySettings', this.preset.displaySettings)
    this.layer = structuredClone(this.$store.getters['results/displayLinks'])
    this.type = structuredClone(this.$store.getters['results/type'])
    this.colorScale = this.$store.getters['results/colorScale']
    this.displaySettings = structuredClone(this.$store.getters['results/displaySettings'])
    this.$store.commit('results/unload')
    //
  },

  methods: {
    changeLayer (layer) {
      this.selectedLayer = layer
      switch (layer) {
        case 'links':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.links,
            type: 'LineString',
            selectedFeature: 'headway',
          })
          break
        case 'rlinks':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rlinks,
            type: 'LineString',
            selectedFeature: 'speed',
          })
          break
        case 'nodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.nodes,
            type: 'Point',
            selectedFeature: 'boardings',
          })
          break
        case 'rnodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rnodes,
            type: 'Point',
            selectedFeature: 'boardings',
          })
          break
        case 'od':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters['od/layer'],
            type: 'LineString',
            selectedFeature: 'volume',
          })
          break
        default:
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters[`${layer}/layer`],
            type: this.$store.getters[`${layer}/type`],
          })
          break
      }
    },

  },
}
</script>
<template>
  <section>
    <div class="map-legend">
      <MapLegend
        :color-scale="colorScale"
        :display-settings="displaySettings"
        :base-offset="350"
        :order="order"
      />
    </div>

    <MglGeojsonLayer
      v-if="['MultiPolygon', 'Polygon'].includes(type)"
      :source-id="preset.name+ '-layer'"
      :source="{
        type: 'geojson',
        data: layer,
      }"
      :layer-id="preset.name+ '-layer'"
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
      :source-id="preset.name+ '-layer'"
      :source="{
        type: 'geojson',
        data: layer,
        buffer: 0,
        promoteId: 'index',
      }"
      :layer-id="preset.name+ '-layer'"
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
      :source-id="preset.name+ '-layer'"
      :source="{
        type: 'geojson',
        data: layer,
      }"
      :layer-id="preset.name+ '-layer'"
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
      :source-id="preset.name+ '-layer'"
      :source="{
        type: 'geojson',
        data: layer,
      }"
      :layer-id="preset.name+ '-layer'"
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
  position: absolute;
}
</style>
