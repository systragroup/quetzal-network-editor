<script>
import { MglImageLayer } from 'vue-mapbox'
import s3 from '../../AWSClient'

export default {
  name: 'ImageLayer',
  components: {
    MglImageLayer,
  },
  props: {

  },
  data () {
    return {
      url: '',

    }
  },
  watch: {

  },
  async created () {
    const url = await s3.getImagesURL(this.$store.getters.model, 'test/inputs/test.png')
    this.url = url
  },

  methods: {

  },
}
</script>
<template>
  <section v-if="url!=''">
    <MglImageLayer
      source-id="radar"
      :source="{
        type: 'image',
        url: url,
        coordinates:[[2.214939533878265, 48.90654777575201],
                     [2.426598153524038, 48.90654777575201],
                     [2.426598153524038, 48.811361293110664],
                     [2.214939533878265, 48.811361293110664]]
      }"
      :layer="{
        'type': 'raster',
        'paint': {
          'raster-opacity': 0.7,

        }

      }"
      layer-id="radar"
    />
  </section>
</template>

<style lang="scss" scoped>

</style>
