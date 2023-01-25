<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import mapboxgl from 'mapbox-gl'
export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
  },
  props: ['map', 'showedTrips', 'isEditorMode'],
  events: ['rightClick'],

  data () {
    return {
      visibleNodes: {},
      visibleLinks: {},

    }
  },
  computed: {
    selectedPopupContent () { return this.$store.getters.popupContent },
    rnodes () { return this.$store.getters.rnodes },
    rlinks () { return this.$store.getters.rlinks },
  },

  watch: {

  },
  created () {

  },

  methods: {
    enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      if (this.popup?.isOpen()) this.popup.remove() // make sure there is no popup before creating one.
      this.popup = new mapboxgl.Popup({ closeButton: false })
        .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
        .setHTML(event.mapboxEvent.features[0].properties.popupContent)
        .addTo(event.map)
    },
    leaveLink (event) {
      if (this.popup.isOpen()) this.popup.remove()
      event.map.getCanvas().style.cursor = ''
    },

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="rlinks"
      :source="{
        type: 'geojson',
        data: rlinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 10,
        maxzoom: 18,
        paint: {
          'line-color': '#B5E0D6',
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.1, 1],
          'line-width': 2,
        },

      }"
      v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink }"
    />

    <MglGeojsonLayer
      source-id="rnodes"
      :source="{
        type: 'geojson',
        data: rnodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rnodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 15,
        maxzoom: 18,
        paint: {
          'circle-color': ['case', ['boolean', isEditorMode, false],'#9E9E9E', '#2C3E4E'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-radius': 3,
        },
      }"
    />
  </section>
</template>
<style lang="scss" scoped>

</style>
