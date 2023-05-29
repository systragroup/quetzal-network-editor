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
  props: ['fileName', 'opacity', 'visible'],
  data () {
    return {
      url: '',

    }
  },
  watch: {
    async visible (val) {
      if (val) {
        const fileName = this.$store.getters.scenario + '/inputs/layers/' + this.fileName + '.geojson'
        const url = await s3.getImagesURL(this.$store.getters.model, fileName)
        this.url = url
      } else {
        this.url = structuredClone(this.$store.getters.linksHeader)
      }
    },
  },
  created () {
    this.url = structuredClone(this.$store.getters.linksHeader)
  },

  methods: {

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
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
          'fill-color':['case', ['has', 'display_color'],['get', 'display_color'],
                        $vuetify.theme.currentTheme.linksprimary],
          'fill-opacity': opacity,

        }
      }"
    />
  </section>
</template>

<style lang="scss" scoped>

</style>
