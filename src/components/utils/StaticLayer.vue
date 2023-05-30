<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import s3 from '../../AWSClient'
// set visibility. to render or not by fetching the data.
// we need to create all the statics link (even without the data)
// for the correct z-order. if not, they are drawn over the links.
export default {
  name: 'StaticLayer',
  components: {
    MglGeojsonLayer,
  },
  props: ['fileName', 'type', 'visible'],
  data () {
    return {
      url: '',

    }
  },
  watch: {
    async visible (val) {
      if (val) {
        const url = await s3.getImagesURL(this.$store.getters.model, this.fileName)
        this.url = url
      } else {
        this.url = structuredClone(this.$store.getters.linksHeader)
      }
    },
  },
  created () {
    // init data to empty geojson to load the mapbox layer
    this.url = structuredClone(this.$store.getters.linksHeader)
  },
  async mounted () {
    // if selected when loading the map, fetch the data to display the correct geojson.
    if (this.visible) {
      const url = await s3.getImagesURL(this.$store.getters.model, this.fileName)
      this.url = url
    }
  },

  methods: {

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      v-if="['MultiPolygon', 'Polygon'].includes(type)"
      :source-id="fileName"
      :source="{
        type: 'geojson',
        data: url,
      }"
      :layer-id="fileName"
      :layer="{
        interactive: false,
        type: 'fill',
        minzoom: 5,
        'paint': {
          'fill-color': ['get', 'display_color'],
          'fill-opacity': 0.5,

        }
      }"
    />
    <MglGeojsonLayer
      v-if="type=='LineString'"
      :source-id="fileName"
      :source="{
        type: 'geojson',
        data: url,
      }"
      :layer-id="fileName"
      :layer="{
        interactive: false,
        type: 'line',
        minzoom: 5,
        'paint': {
          'line-color': ['get', 'display_color'],
          'line-opacity': 0.8,
          'line-width': ['get', 'display_width'],

        }
      }"
    />
    <MglGeojsonLayer
      v-if="type == 'Point'"
      :source-id="fileName"
      :source="{
        type: 'geojson',
        data: url,
      }"
      :layer-id="filename"
      :layer="{
        interactive: false,
        type: 'circle',
        minzoom: 5,
        paint: {
          'circle-color': ['get', 'display_color'],

          'circle-radius': ['get', 'display_width'],
          'circle-opacity': 0.8,
        },
      }"
    />
  </section>
</template>

<style lang="scss" scoped>

</style>
