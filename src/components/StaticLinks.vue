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
    selectedPopupContent () { return this.$store.getters.linksPopupContent },
    links () {
      // remove unwanted features for faster computation
      const links = structuredClone(this.$store.getters.linksHeader)
      // the popupContent column is added as it is acces by the map.
      links.features = this.$store.getters.links.features.map((feature) => (
        {
          properties: {
            trip_id: feature.properties.trip_id,
            popupContent: feature.properties[this.selectedPopupContent],
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
    nodes () { return structuredClone(this.$store.getters.nodes) },
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
  },
  created () {
    this.visibleLinks = structuredClone(this.$store.getters.linksHeader)
    this.visibleNodes = structuredClone(this.$store.getters.nodesHeader)
    this.setHiddenFeatures()
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
    setHiddenFeatures (method = 'all', trips = []) {
      // get visible links and nodes.
      // const startTime = performance.now()
      if (method === 'all') {
        this.visibleLinks.feature = []
        this.visibleNodes.features = []
        // eslint-disable-next-line max-len
        this.visibleLinks.features = this.links.features.filter(link => this.showedTrips.includes(link.properties.trip_id))
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
    selectLine (event) {
      event.mapboxEvent.preventDefault() // prevent map control
      // eslint-disable-next-line max-len
      this.$store.commit('setEditorTrip', { tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      this.$store.commit('changeNotification', { text: '', autoClose: true })
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
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], '#B5E0D6'],
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
          'circle-stroke-color': '#ffffff',
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
