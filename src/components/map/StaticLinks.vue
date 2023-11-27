<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import mapboxgl from 'mapbox-gl'
import { cloneDeep } from 'lodash'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed } from 'vue'
export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
  },
  props: ['map', 'isEditorMode'],
  events: ['rightClick'],
  setup () {
    const store = useIndexStore()
    const linksStore = useLinksStore()
    const selectedPopupContent = computed(() => { return store.linksPopupContent })
    const showedTrips = computed(() => { return linksStore.selectedTrips })
    const links = computed(() => { return linksStore.links })
    const nodes = computed(() => { return linksStore.nodes })

    return { store, linksStore, showedTrips, selectedPopupContent, links, nodes }
  },
  data () {
    return {
      visibleNodes: {},
      visibleLinks: {},
      selectedFeatures: [],

    }
  },

  watch: {
    showedTrips (newVal, oldVal) {
      console.log(newVal)
      this.setHiddenFeatures()
    },
    isEditorMode (val) {
      val ? this.map.off('dblclick', this.selectLine) : this.map.on('dblclick', this.selectLine)
    },
  },

  created () {
    this.visibleLinks = cloneDeep(this.linksStore.linksHeader)
    this.visibleNodes = cloneDeep(this.linksStore.nodesHeader)
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
    setHiddenFeatures () {
      // get visible links and nodes.
      const showedTripsSet = new Set(this.showedTrips)
      this.visibleLinks.features = this.links.features.filter(link => showedTripsSet.has(link.properties.trip_id))
      const a = this.visibleLinks.features.map(item => item.properties.a)
      const b = this.visibleLinks.features.map(item => item.properties.b)
      const ab = new Set([...a, ...b])
      this.visibleNodes.features = this.visibleNodes.features.filter(node => ab.has(node.properties.index))

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
        this.linksStore.setEditorTrip({ tripId: this.selectedFeatures[0].properties.trip_id, changeBounds: false })
        this.store.changeNotification({ text: '', autoClose: true })
      }
    },
    editLineProperties (event) {
      // eslint-disable-next-line max-len
      this.linksStore.setEditorTrip({ tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
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
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
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
          'circle-color': ['case', ['boolean', isEditorMode, false],$vuetify.theme.current.colors.mediumgrey, $vuetify.theme.current.colors.accent],
          'circle-stroke-color': $vuetify.theme.current.colors.white,
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
