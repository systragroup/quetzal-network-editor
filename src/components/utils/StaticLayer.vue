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
    console.log(this.fileName, this.type)
    this.url = structuredClone(this.$store.getters.linksHeader)
  },

  methods: {

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      v-if="type=='Polygon'"
      :source-id="fileName"
      :source="{
        type: 'geojson',
        data: url,
      }"
      :layer-id="fileName"
      :layer="{
        interactive: false,
        type: 'fill',
        'paint': {
          'fill-color':['get', 'display_color'],
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
        'paint': {
          'line-color':['get', 'display_color'],
          'line-opacity': 1,
          'line-width':3,

        }
      }"
    />
  </section>
</template>

<style lang="scss" scoped>

</style>
