<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import s3 from '../../AWSClient'

export default {
  name: 'StaticLayer',
  components: {
    MglGeojsonLayer,
  },
  props: {

  },
  data () {
    return {
      url: '',
      opacity: 0.5,

    }
  },
  watch: {

  },
  async created () {
    const url = await s3.getImagesURL(this.$store.getters.model, 'test/inputs/zones2.geojson')
    this.url = url
    console.log(url)
  },

  methods: {

  },
}
</script>
<template>
  <section v-if="url!=''">
    <MglGeojsonLayer
      source-id="polygon"
      :source="{
        type: 'geojson',
        data: url,
      }"
      layer-id="zones"
      :layer="{
        interactive: true,
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
