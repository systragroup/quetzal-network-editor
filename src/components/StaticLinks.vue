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
      visibleNodes: [],

      popup: {
        coordinates: [0, 0],
        showed: false,
        content: null,
      },
    }
  },
  computed: {
    links () { return this.$store.getters.links },
    nodes () { return this.$store.getters.nodes },
    linksPerLine () {
      const groupBy = function (xs) {
        return xs.reduce(function (rv, x) {
          (rv[x.properties.trip_id] = rv[x.properties.trip_id] || []).push(x)
          return rv
        }, {})
      }
      return groupBy(this.links.features)
    },
  },
  watch: {
    showedTrips () {
      this.setHiddenFeatures()
    },

  },
  created () {
    this.setHiddenFeatures()
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
    setHiddenFeatures () {
      // Set visible links
      const visibleLinks = new Set()
      this.showedTrips.forEach(line => {
        this.linksPerLine[line].forEach(link => visibleLinks.add(link))
      })
      // Set visible nodes
      const a = [...visibleLinks].map(item => item.properties.a)
      const b = [...visibleLinks].map(item => item.properties.b)
      const ab = new Set([...a, ...b])
      this.visibleNodes = [...ab]
    },
    selectLine (event) {
      event.mapboxEvent.preventDefault() // prevent map control
      this.popup.showed = false
      this.$store.commit('setEditorTrip', { tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      this.$store.commit('changeNotification', { text: '', autoClose: true })
    },
    editLineProperties (event) {
      this.popup.showed = false
      this.$store.commit('setEditorTrip', { tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      this.$emit('rightClick', { action: 'Edit Line Info', lingering: false })
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
        data: links,
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
        filter: ['in', ['get','trip_id'] ,['literal',showedTrips]],

        layout: {
          'line-sort-key': ['get', 'route_width'],
          'line-cap': 'round',
        }
      }"
      v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink, dblclick: selectLine, contextmenu:editLineProperties }"
    />

    <MglGeojsonLayer
      source-id="nodes"
      :source="{
        type: 'geojson',
        data: nodes,
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
        filter: ['in', ['get','index'] ,['literal',visibleNodes]],
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
