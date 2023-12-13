<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer } from 'vue-mapbox3'
import mapboxgl from 'mapbox-gl'
import { cloneDeep } from 'lodash'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, ref, watch, toRefs, onMounted } from 'vue'
import geojson from '@constants/geojson'

export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
  },
  props: ['map', 'isEditorMode'],
  emits: ['rightClick'],
  setup (props, context) {
    const store = useIndexStore()
    const linksStore = useLinksStore()
    const { map, isEditorMode } = toRefs(props)
    watch(isEditorMode, (val) => {
      val ? map.value.off('dblclick', selectLine) : map.value.on('dblclick', selectLine)
    })
    const links = computed(() => { return linksStore.links })
    const nodes = computed(() => { return linksStore.nodes })
    const selectedPopupContent = computed(() => { return store.linksPopupContent })
    const showedTrips = computed(() => { return linksStore.selectedTrips })
    watch(showedTrips, () => { setHiddenFeatures() })

    const visibleNodes = ref(cloneDeep(geojson))
    const visibleLinks = ref(cloneDeep(geojson))
    const selectedFeatures = ref([])
    const popup = ref(null)

    onMounted(() => {
      setHiddenFeatures()
      map.value.on('dblclick', selectLine)
    })

    function enterLink (event) {
      event.map.getCanvas().style.cursor = 'pointer'
      selectedFeatures.value = event.mapboxEvent.features

      if (popup.value?.isOpen()) popup.value.remove() // make sure there is no popup before creating one.
      if (selectedPopupContent.value.length > 0) { // do not show popup if nothing is selected (selectedPopupContent)
        // eslint-disable-next-line max-len
        let htmlContent = selectedPopupContent.value.map(prop => `${prop}: <b>${selectedFeatures.value[0].properties[prop]}</b>`)
        htmlContent = htmlContent.join('<br> ')
        popup.value = new mapboxgl.Popup({ closeButton: false })
          .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
          .setHTML(htmlContent)
          .addTo(event.map)
      }
    }
    function leaveLink (event) {
      selectedFeatures.value = []
      if (popup.value?.isOpen()) popup.value.remove()
      event.map.getCanvas().style.cursor = ''
    }
    function setHiddenFeatures () {
      // get visible links and nodes.
      const showedTripsSet = new Set(showedTrips.value)
      visibleLinks.value.features = links.value.features.filter(link => showedTripsSet.has(link.properties.trip_id))
      const a = visibleLinks.value.features.map(item => item.properties.a)
      const b = visibleLinks.value.features.map(item => item.properties.b)
      const ab = new Set([...a, ...b])
      visibleNodes.value.features = visibleNodes.value.features.filter(node => ab.has(node.properties.index))

      // get all unique width
      const widthArr = [...new Set(visibleLinks.value.features.map(item => Number(item.properties.route_width)))]
      // create a dict {width:[node_index]}
      const widthDict = {}
      widthArr.forEach(key => widthDict[key] = new Set())
      visibleLinks.value.features.map(item =>
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
        const newNodes = nodes.value.features.filter(node => widthDict[key].has(node.properties.index))
        newNodes.map(node => node.properties.route_width = key)
        visibleNodes.value.features.push(...newNodes)
      })

      map.value.getSource('links').setData(visibleLinks.value)
      map.value.getSource('nodes').setData(visibleNodes.value)

      // const endTime = performance.now()
    }
    function selectLine (e) {
      e.preventDefault() // prevent map control
      // if we are not hovering. select closest link (within 5 pixels)
      if (selectedFeatures.value.length === 0) {
        // Set `bbox` as 5px reactangle area around clicked point.
        const bbox = [
          [e.point.x - 5, e.point.y - 5],
          [e.point.x + 5, e.point.y + 5],
        ]
        // Find features intersecting the bounding box.
        selectedFeatures.value = map.value.queryRenderedFeatures(bbox, {
          layers: ['links'],
        })
      }
      // do nothing if nothing is clicked (clicking on map, not on a link)
      if (selectedFeatures.value.length > 0) {
        // set. the first one as editor mode
        // eslint-disable-next-line max-len
        linksStore.setEditorTrip({ tripId: selectedFeatures.value[0].properties.trip_id, changeBounds: false })
        store.changeNotification({ text: '', autoClose: true })
      }
    }
    function editLineProperties (event) {
      // eslint-disable-next-line max-len
      linksStore.setEditorTrip({ tripId: event.mapboxEvent.features[0].properties.trip_id, changeBounds: false })
      context.emit('rightClick', { action: 'Edit Line Info', lingering: false })
    }

    return {
      store,
      linksStore,
      // eslint-disable-next-line vue/no-dupe-keys
      isEditorMode,
      showedTrips,
      selectedPopupContent,
      visibleLinks,
      visibleNodes,
      selectedFeatures,
      enterLink,
      leaveLink,
      editLineProperties,
    }
  },

}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="links"
      :reactive="false"
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
      :reactive="false"
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
