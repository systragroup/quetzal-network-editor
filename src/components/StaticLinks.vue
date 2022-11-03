<script>
import { MglGeojsonLayer, MglPopup } from 'vue-mapbox'

export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
    MglPopup,
  },
  props: ['map', 'showedTrips', 'isEditorMode'],
  events: ['rightClick'],

  data () {
    return {
      visibleNodes: {},
      visibleLinks: {},

      popup: {
        coordinates: [0, 0],
        showed: false,
        content: null,
      },
    }
  },
  computed: {
    links () {
      // remove unwanted features for faster computation
      const links = structuredClone(this.$store.getters.links)
      links.features = links.features.map((feature) => (
        {
          properties: {
            trip_id: feature.properties.trip_id,
            a: feature.properties.a,
            b: feature.properties.b,
            route_color: feature.properties.route_color,
            route_width: feature.properties.route_width,
          },
          geometry: feature.geometry,
        }
      ),
      )
      return links
    },
    nodes () { return this.$store.getters.nodes },
  },
  watch: {
    showedTrips (newVal, oldVal) {
      let changes = ''
      if (newVal.length < oldVal.length) {
        // if a tripis unchecked. we remove it
        changes = oldVal.filter(item => !newVal.includes(item))
        this.setHiddenFeatures('remove', changes)
      } else if (newVal.length > oldVal.length) {
        // if a trip is added, we add it!
        changes = newVal.filter(item => !oldVal.includes(item))
        this.setHiddenFeatures('add', changes)
      } else {
        this.setHiddenFeatures()
      }
    },
  },
  created () {
    this.visibleLinks = structuredClone(this.links)
    this.visibleNodes = structuredClone(this.nodes)
  },

  methods: {
    enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      this.popup.coordinates = [event.mapboxEvent.lngLat.lng,
        event.mapboxEvent.lngLat.lat,
      ]
      this.popup.content = event.mapboxEvent.features[0].properties.trip_id
      this.popup.showed = true
    },
    leaveLink (event) {
      event.map.getCanvas().style.cursor = ''
      this.popup.showed = false
    },
    setHiddenFeatures (method = 'all', trips = []) {
      // get visible links and features as an async function.
      if (method === 'all') {
        // eslint-disable-next-line max-len
        this.visibleLinks.features = this.links.features.filter(link => this.showedTrips.includes(link.properties.trip_id))
        const a = this.visibleLinks.features.map(item => item.properties.a)
        const b = this.visibleLinks.features.map(item => item.properties.b)
        const ab = Array.from(new Set([...a, ...b]))
        this.visibleNodes.features = this.nodes.features.filter(node => ab.includes(node.properties.index))
      } else if (method === 'remove') {
        this.visibleLinks.features = this.visibleLinks.features.filter(link => !trips.includes(link.properties.trip_id))
        const a = this.visibleLinks.features.map(item => item.properties.a)
        const b = this.visibleLinks.features.map(item => item.properties.b)
        const ab = Array.from(new Set([...a, ...b]))
        this.visibleNodes.features = this.visibleNodes.features.filter(node => ab.includes(node.properties.index))
      } else if (method === 'add') {
        const newFeatures = this.links.features.filter(link => trips.includes(link.properties.trip_id))
        this.visibleLinks.features.push(...newFeatures)
        const a = newFeatures.map(item => item.properties.a)
        const b = newFeatures.map(item => item.properties.b)
        const ab = Array.from(new Set([...a, ...b]))
        const newNodes = this.visibleNodes.features.filter(node => ab.includes(node.properties.index))
        this.visibleNodes.features.push(...newNodes)
      }
    },
    selectLine (event) {
      event.mapboxEvent.preventDefault() // prevent map control
      this.popup.showed = false
      // eslint-disable-next-line max-len
      this.$store.commit('setEditorTrip', { tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      this.$store.commit('changeNotification', { text: '', autoClose: true })
    },
    editLineProperties (event) {
      this.popup.showed = false
      // eslint-disable-next-line max-len
      this.$store.commit('setEditorTrip', { tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      this.$emit('rightClick', { action: 'Edit Line Info', lingering: false })
    },
    test () {
      console.log('test')
    },
  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="links"
      :source="{
        type: 'geojson',
        data: visibleLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="links"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 9,
        maxzoom: 18,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], '#B5E0D6'],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.1, 1],
          'line-width': ['case', ['has', 'route_width'],
                         ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                          ['to-number', ['get', 'route_width']],
                          3], 3],
        },

        layout: {
          'line-sort-key': ['get', 'route_width'],
          'line-cap': 'round',
        }
      }"
      @load="test"
      v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink, dblclick: selectLine, contextmenu:editLineProperties }"
    />

    <MglGeojsonLayer
      source-id="nodes"
      :source="{
        type: 'geojson',
        data: visibleNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="nodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 12,
        maxzoom: 18,
        paint: {
          'circle-color': ['case', ['boolean', isEditorMode, false],'#9E9E9E', '#2C3E4E'],
          'circle-radius': 3,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      }"
    />

    <MglPopup
      :close-button="false"
      :showed="popup.showed"
      :coordinates="popup.coordinates"
    >
      {{ popup.content }}
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
