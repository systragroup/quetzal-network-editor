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
      selectedFeatures: [],

    }
  },
  computed: {
    selectedPopupContent () { return this.$store.getters.linksPopupContent },
    links () { return this.$store.getters.links },
    nodes () { return this.$store.getters.nodes },
  },

  watch: {
    showedTrips (newVal, oldVal) {
      let changes = ''
      if (newVal.length < oldVal.length) {
        // if a tripis unchecked. we remove it
        changes = new Set(oldVal.filter(item => !newVal.includes(item)))
        this.setHiddenFeatures('remove', changes)
      } else if (newVal.length > oldVal.length) {
        // if a trip is added, we add it!
        changes = new Set(newVal.filter(item => !oldVal.includes(item)))
        this.setHiddenFeatures('add', changes)
      } else {
        this.setHiddenFeatures()
      }
    },
    isEditorMode (val) {
      val ? this.map.off('dblclick', this.selectLine) : this.map.on('dblclick', this.selectLine)
    },
  },

  created () {
    this.setHiddenFeatures()
    this.map.on('dblclick', this.selectLine)
  },

  methods: {

    enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      this.selectedFeatures = event.mapboxEvent.features

      if (this.popup?.isOpen()) this.popup.remove() // make sure there is no popup before creating one.
      if (this.selectedPopupContent.length > 0) { // do not show popup if nothing is selected (selectedPopupContent)
        let htmlContent = this.selectedPopupContent.map(prop => `${prop}: <b>${this.selectedFeatures[0].properties[prop]}</b>`)
        htmlContent = htmlContent.join('<br> ')
        this.popup = new mapboxgl.Popup({ closeButton: false })
          .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
          .setHTML(htmlContent)
          .addTo(event.map)
      }
    },
    leaveLink (event) {
      this.selectedFeatures = []
      if (this.popup?.isOpen()) this.popup.remove()
      event.map.getCanvas().style.cursor = ''
    },
    setHiddenFeatures (method = 'all', trips = []) {
      // get visible links and nodes.
      if (method === 'all') {
        this.visibleLinks = structuredClone(this.$store.getters.linksHeader)
        this.visibleNodes = structuredClone(this.$store.getters.nodesHeader)
        const showedTripsSet = new Set(this.showedTrips)
        this.visibleLinks.features = this.links.features.filter(
          link => showedTripsSet.has(link.properties.trip_id))
        // get all unique width
        const widthArr = [...new Set(this.visibleLinks.features.map(item => Number(item.properties.route_width)))]
        // create a dict {width:[node_index]}
        const widthDict = {}
        widthArr.forEach(key => widthDict[key] = new Set())
        this.visibleLinks.features.map(item =>
          [item.properties.a, item.properties.b].forEach(
            node => widthDict[Number(item.properties.route_width)].add(node)))
        // remove duplicated nodes. only keep larger one (if node_1 is in a line of size 5 and 3, only keep the 5 one.)
        let totSet = new Set()
        for (let i = 0; i < widthArr.length - 1; i++) {
          const a = widthDict[widthArr[i + 1]]
          const b = widthDict[widthArr[i]]
          totSet = new Set([...totSet, ...b])
          widthDict[widthArr[i + 1]] = new Set([...a].filter(x => !totSet.has(x)))
        }
        // for each width, get the nodes and add the width to the properties for rendering.
        widthArr.forEach(key => {
          const newNodes = this.nodes.features.filter(node => widthDict[key].has(node.properties.index))
          newNodes.map(node => node.properties.route_width = key)
          this.visibleNodes.features.push(...newNodes)
        })
      } else if (method === 'remove') {
        this.visibleLinks.features = this.visibleLinks.features.filter(link => !trips.has(link.properties.trip_id))
        const a = this.visibleLinks.features.map(item => item.properties.a)
        const b = this.visibleLinks.features.map(item => item.properties.b)
        const ab = new Set([...a, ...b])
        this.visibleNodes.features = this.visibleNodes.features.filter(node => ab.has(node.properties.index))
      } else if (method === 'add') {
        const newFeatures = this.links.features.filter(link => trips.has(link.properties.trip_id))
        this.visibleLinks.features.push(...newFeatures)
        // get all unique value of width
        const widthArr = [...new Set(newFeatures.map(item => Number(item.properties.route_width)))]
        widthArr.sort(function (a, b) { return b - a }) // sort it
        // create a dict {width:[node_index]}
        const widthDict = {}
        widthArr.forEach(key => widthDict[key] = new Set())
        newFeatures.map(item =>
          [item.properties.a, item.properties.b].forEach(
            node => widthDict[Number(item.properties.route_width)].add(node)))
        // remove duplicated nodes. only keep larger one (if node_1 is in a line of size 5 and 3, only keep the 5 one.)
        let totSet = new Set()
        for (let i = 0; i < widthArr.length - 1; i++) {
          const a = widthDict[widthArr[i + 1]]
          const b = widthDict[widthArr[i]]
          totSet = new Set([...totSet, ...b])
          widthDict[widthArr[i + 1]] = new Set([...a].filter(x => !totSet.has(x)))
        }

        // for each width, get the nodes and add the width to the properties for rendering.
        widthArr.forEach(key => {
          const newNodes = this.nodes.features.filter(node => widthDict[key].has(node.properties.index))
          newNodes.map(node => node.properties.route_width = key)
          this.visibleNodes.features.push(...newNodes)
        })
      }
      // const endTime = performance.now()
    },
    selectLine (e) {
      e.preventDefault() // prevent map control
      // if we are not hovering. select closest link (within 5 pixels)
      if (this.selectedFeatures.length === 0) {
        // Set `bbox` as 5px reactangle area around clicked point.
        const bbox = [
          [e.point.x - 5, e.point.y - 5],
          [e.point.x + 5, e.point.y + 5],
        ]
        // Find features intersecting the bounding box.
        this.selectedFeatures = this.map.queryRenderedFeatures(bbox, {
          layers: ['links'],
        })
      }
      // do nothing if nothing is clicked (clicking on map, not on a link)
      if (this.selectedFeatures.length > 0) {
        // set. the first one as editor mode
        // eslint-disable-next-line max-len
        this.$store.commit('setEditorTrip', { tripId: this.selectedFeatures[0].properties.trip_id, changeBounds: false })
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },
    editLineProperties (event) {
      // eslint-disable-next-line max-len
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
        data: visibleLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="links"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 1,
        maxzoom: 18,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.currentTheme.linksprimary],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.1, 1],
          'line-width': ['case', ['has', 'route_width'],
                         ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                          ['to-number', ['get', 'route_width']],
                          3], 3],
        },

        layout: {
          'line-sort-key': ['to-number',['get', 'route_width']],
          'line-cap': 'round',
        }
      }"
      v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink, contextmenu:editLineProperties }"
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
          'circle-color': ['case', ['boolean', isEditorMode, false],$vuetify.theme.currentTheme.mediumgrey, $vuetify.theme.currentTheme.accent],
          'circle-stroke-color': $vuetify.theme.currentTheme.white,
          'circle-stroke-width': 1,
          'circle-radius': ['case', ['has', 'route_width'],
                            ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                             ['to-number', ['get', 'route_width']],
                             3], 3],
        },
      }"
    />
  </section>
</template>
<style lang="scss" scoped>

</style>
