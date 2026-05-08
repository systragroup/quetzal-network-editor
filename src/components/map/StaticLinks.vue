<!-- eslint-disable no-return-assign -->
<script setup lang="ts">
import { MglGeojsonLayer, MglPopup, MglImageLayer } from 'vue-mapbox3'
import mapboxgl, { GeoJSONSource, Map, MapMouseEvent, PointLike, Popup } from 'mapbox-gl'
import { deleteUnusedNodes } from '@src/utils/utils'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, ref, watch, toRefs, onMounted } from 'vue'
import { useHighlight } from '../../composables/useHighlight'
import { baseLineString, basePoint, LineStringFeatures } from '@src/types/geojson'
interface Props {
  map: Map
  isEditorMode: boolean
  mode: 'pt' | 'road' | 'OD'
}
const props = defineProps<Props>()
const { map, isEditorMode, mode } = toRefs(props)

const store = useIndexStore()
const linksStore = useLinksStore()

interface ContextMenu {
  coordinates: number[]
  showed: boolean
  featuresIndex: string[]
  action?: 'editTrip' | 'editProperties'
}

const contextMenu = ref<ContextMenu>({
  coordinates: [0, 0],
  showed: false,
  featuresIndex: [],
})

watch(isEditorMode, (val) => {
  if (val) {
    contextMenu.value.showed = false
    map.value.off('dblclick', selectLine)
  } else {
    map.value.on('dblclick', selectLine)
  }
})
// immediate to add dblclick on mount
watch(mode, (val) => {
  if (val === 'pt') {
    map.value.on('dblclick', selectLine)
  } else {
    map.value.off('dblclick', selectLine)
  }
  contextMenu.value.showed = false
}, { immediate: true })

const links = computed(() => { return linksStore.links })
const nodes = computed(() => { return linksStore.nodes })
const selectedPopupContent = computed(() => { return store.linksPopupContent })
const showedTrips = computed(() => new Set(linksStore.selectedTrips))
watch(showedTrips, () => { setHiddenFeatures() })

const visibleNodes = ref(basePoint())
const visibleLinks = ref(baseLineString())

const selectedFeatures = ref<LineStringFeatures[]>([])

onMounted(() => {
  setHiddenFeatures()
})

function setHiddenFeatures () {
  // get visible links and nodes.
  visibleLinks.value.features = links.value.features.filter(link => showedTrips.value.has(link.properties.trip_id))
  visibleNodes.value.features = deleteUnusedNodes(visibleNodes.value, visibleLinks.value)

  // get all unique width
  const widthArr = [...new Set(visibleLinks.value.features.map(item => Number(item.properties.route_width)))]
  // create a dict {width:[node_index]}
  const widthDict: Record<string, Set<number>> = {}
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
  linksStore.setVisibleNodes(visibleNodes.value)
  const linkSource = map.value.getSource('links') as GeoJSONSource
  if (linkSource) linkSource.setData(visibleLinks.value)
  const nodeSource = map.value.getSource('nodes') as GeoJSONSource
  if (nodeSource) nodeSource.setData(visibleNodes.value)
}

const popup = ref<Popup>()

function enterLink (event: CustomMapEvent) {
  event.map.getCanvas().style.cursor = 'pointer'
  const features = event.mapboxEvent.features
  if (features) {
    selectedFeatures.value = features as LineStringFeatures[]
  }
  if (popup.value?.isOpen()) popup.value.remove() // make sure there is no popup before creating one.
  if (selectedPopupContent.value.length > 0) { // do not show popup if nothing is selected (selectedPopupContent)
    // if multiple map element under the mouse. show them all in the popup
    let htmlContent: string[] = []
    selectedFeatures.value.forEach(feature => {
      const text = selectedPopupContent.value.map(prop => `${prop}: <b>${feature.properties[prop]}</b>`)
      htmlContent.push(...text)
    })
    const content = htmlContent.join('<br> ')
    popup.value = new mapboxgl.Popup({ closeButton: false })
      .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
      .setHTML(`<p>${content}</p>`)
      .addTo(event.map)
  }
}
function leaveLink (event: CustomMapEvent) {
  selectedFeatures.value = []
  if (popup.value?.isOpen()) popup.value.remove()
  event.map.getCanvas().style.cursor = ''
}

function selectLine (e: MapMouseEvent) {
  if (mode.value === 'pt') {
    e.preventDefault() // prevent map control
    // if we are not hovering. select closest link (within 5 pixels)
    if (selectedFeatures.value.length === 0) {
      // Set `bbox` as 5px reactangle area around clicked point.
      const bbox: [PointLike, PointLike] = [
        [e.point.x - 5, e.point.y - 5],
        [e.point.x + 5, e.point.y + 5],
      ]
      // Find features intersecting the bounding box.
      const queryFeatures = map.value.queryRenderedFeatures(bbox, { layers: ['links'] }) as LineStringFeatures[]
      selectedFeatures.value = queryFeatures
    }
    // do nothing if nothing is clicked (clicking on map, not on a link)
    if (selectedFeatures.value.length == 1) {
      linksStore.setEditorTrip(selectedFeatures.value[0].properties.trip_id)
      store.changeNotification({ text: '', autoClose: true })
    } else if (selectedFeatures.value.length > 1) {
      let selectedTrips: string[] = selectedFeatures.value.map(el => el.properties.trip_id)
      selectedTrips = Array.from(new Set(selectedTrips))
      contextMenu.value.coordinates = [e.lngLat.lng, e.lngLat.lat]
      contextMenu.value.showed = true
      contextMenu.value.action = 'editTrip'
      contextMenu.value.featuresIndex = selectedTrips
    }
  }
}

function rightClick (event: CustomMapEvent) {
  if (mode.value === 'pt') {
    let selectedTrips: string[] = selectedFeatures.value.map(el => el.properties.trip_id)
    selectedTrips = Array.from(new Set(selectedTrips))
    leaveLink(event)
    if (selectedTrips.length === 1) {
      editLineProperties(selectedTrips[0])
    } else {
      contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
      contextMenu.value.showed = true
      contextMenu.value.action = 'editProperties'
      contextMenu.value.featuresIndex = selectedTrips
    }
  }
}

import { useForm } from '@src/composables/UseForm'
import { CustomMapEvent } from '@src/types/mapbox'
import { cloneDeep } from 'lodash'
const { openDialog } = useForm()

function editLineProperties (selectedTrip: string) {
  linksStore.setEditorTrip(selectedTrip)
  openDialog({ action: 'Edit Line Info', selectedArr: [selectedTrip], lingering: false, type: 'pt' })
}

const { highlightTrip, setHighlightTrip, getColor } = useHighlight()

function contextMenuClick(trip: string) {
  if (contextMenu.value.action === 'editProperties') {
    editLineProperties(trip)
    contextMenu.value.showed = false
    setHighlightTrip(null)
  }
  else if (contextMenu.value.action === 'editTrip') {
    linksStore.setEditorTrip(trip)
    contextMenu.value.showed = false
    setHighlightTrip(null)
  }
}

const highlightColor = ref<string>(getColor(undefined))

watch(highlightTrip, (trip) => {
  const highlightLinks = baseLineString()
  const selected = cloneDeep(visibleLinks.value.features.filter(el => el.properties.trip_id === trip))
  highlightLinks.features = selected
  highlightColor.value = getColor(selected[0]?.properties.route_color)
  const source = map.value.getSource('highlightLink') as GeoJSONSource
  if (source) source.setData(highlightLinks)
})

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
      v-on="isEditorMode ? {mouseenter:()=>{},mouseleave:()=>{},contextmenu:()=>{} } :
        { mouseenter: enterLink, mouseleave: leaveLink, contextmenu:rightClick }"
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
    <MglGeojsonLayer
      source-id="highlightLink"
      :reactive="false"
      :source="{
        type: 'geojson',
        data: baseLineString(),
      }"
      layer-id="highlightLink"
      :layer="{
        type: 'line',
        minzoom: 1,
        maxzoom: 18,
        paint: {
          'line-color': highlightColor,
          'line-opacity': 1,
          'line-width': 5,
        },
      }"
    />

    <MglImageLayer
      source-id="highlightLink"
      type="symbol"
      source="highlightLink"
      layer-id="highlight-arrow-layer"
      :layer="{
        type: 'symbol',
        minzoom: 5,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 30,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': 0.5,
          'icon-rotate': 90
        },
        paint: {
          'icon-color':highlightColor,
        }
      }"
    />
    <MglPopup
      :close-button="false"
      :showed="contextMenu.showed"
      :coordinates="contextMenu.coordinates"
      @close="contextMenu.showed=false"
    >
      <span>
        <v-list
          class="list"
          density="compact"
        >
          <v-list-item-title class="title">{{ $gettext('Select a Trip') }}</v-list-item-title>
          <v-list-item
            v-for="(trip,key) in contextMenu.featuresIndex"
            :key="key"
            class="popup-content"
          >
            <v-btn
              variant="outlined"
              size="small"
              class="popup-content"
              block
              @mouseenter="setHighlightTrip(trip)"
              @mouseleave="setHighlightTrip(null)"
              @click="contextMenuClick(trip)"
            >
              {{ $gettext(trip) }}
            </v-btn>

          </v-list-item>
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

.title{
  align-items: center;
}
.list{
  overflow-y: scroll;
  max-height: 20rem;
  width: max-content;
  max-width: 50rem;
}
.popup-content{
  max-width:fit-content;

}

</style>
