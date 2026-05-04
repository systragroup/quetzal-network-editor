<script setup>
/// import MglMap from '@comp/q-mapbox/MglMap.vue'
import { MglMap, MglNavigationControl, MglScaleControl } from 'vue-mapbox3'

import { computed, watch, ref, toRefs, onBeforeUnmount, defineAsyncComponent, shallowRef, onMounted } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import arrowImage from '@static/arrow.png'
import Settings from './Settings.vue'
import StaticLinks from './StaticLinks.vue'
import EditorLinks from './EditorLinks.vue'
import ODMap from './ODMap.vue'
import { useIndexStore } from '@src/store/index'
import { useMapStore } from '@src/store/map'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import StyleSelector from '../utils/StyleSelector.vue'
import RasterLayer from '../utils/RasterLayer.vue'
// Filter links from selected line
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const LayerSelector = defineAsyncComponent(() => import('../utils/LayerSelector.vue'))
const StaticLayer = defineAsyncComponent(() => import('../utils/StaticLayer.vue'))
const RoadLinks = defineAsyncComponent(() => import('./RoadLinks.vue'))

const props = defineProps({
  mode: {
    type: String,
    default: 'pt',
  },
})
const store = useIndexStore()
const mapStore = useMapStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

// map stuff
const map = shallowRef(null)
const mapIsLoaded = ref(false)

onMounted(() => {
  fitBounds()
})

function fitBounds() {
  // for empty (new) project, do not fit bounds around the links geometries.
  // only use first and last point. seems to bug when there is anchor...
  const layer = linksStore.linksIsEmpty ? rlinksStore.rlinks : linksStore.links
  const bounds = mapStore.getBounds(layer)
  mapStore.getZoomAndCenter(bounds, canvasDiv.value.clientWidth, canvasDiv.value.clientHeight)
}

function onMapLoaded (event) {
  if (map.value) mapIsLoaded.value = false
  map.value = event.map
  map.value.loadImage(arrowImage, function (err, image) {
    if (err) {
      console.error('err image', err)
      return
    }
    map.value.addImage('arrow', image, { sdf: true })
  })
  event.map.dragRotate.disable()
  mapIsLoaded.value = true
}

import { useMapResize } from '@src/composables/useMapResize.js'
const canvasDiv = ref()
useMapResize(map, canvasDiv)

const mapStyle = computed(() => { return mapStore.mapStyle })
watch(mapStyle, () => { saveMapPosition() })
onBeforeUnmount(() => { saveMapPosition() })

function saveMapPosition () {
  try {
    const center = map.value.getCenter()
    mapStore.saveMapPosition({
      mapCenter: [center.lng, center.lat],
      mapZoom: map.value.getZoom(),
    })
  } catch (err) {}
}

// All of the layers
const visibleLayers = computed(() => store.visibleLayers)
const styles = computed(() => store.styles)

const availableLayers = computed(() => store.availableLayers)
const availableRasters = computed(() => store.availableRasters)

// modes
const { mode } = toRefs(props)
const anchorMode = computed(() => store.anchorMode)
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const editorTrip = computed(() => linksStore.editorTrip)
const isEditorMode = computed(() => editorTrip.value !== null)
const isRoadMode = computed(() => rlinksStore.editionMode)

// DrakLink

watch(editorTrip, () => {
  store.setAnchorMode(false)
  store.setStickyMode(false)
  store.setRoutingMode(false)
})

watch(anchorMode, (val) => {
  if (val) {
    store.changeNotification(
      { text: $gettext('Left click to add an anchor point, right click to delete'), autoClose: false })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
})

import HistorySelector from '../utils/HistorySelector.vue'

</script>
<template>
  <div
    ref="canvasDiv"
    class="map"
  >
    <MglMap
      :key="mapStyle"
      :access-token="mapStore.key"
      :map-style="mapStyle"
      :center="mapStore.mapCenter"
      :zoom="mapStore.mapZoom"
      @load="onMapLoaded"
    >
      <MglScaleControl position="bottom-right" />
      <MglNavigationControl
        position="bottom-right"
        :visualize-pitch="true"
      />
      <div v-if="mapIsLoaded">
        <Settings />
        <StyleSelector :order="1" />
        <HistorySelector
          v-if="isRoadMode"
          :order="3"
        />
        <LayerSelector
          v-if="styles.length>0"
          :order="2"
          :choices="styles"
          :available-layers="availableLayers"
          :map="map"
        />
        <RasterLayer
          v-if="availableRasters.length>0"
          :order="3"
          :map="map"
        />
      </div>
      <div
        v-for="file in styles"
        :key="file.name"
      >
        <StaticLayer
          v-if="mapIsLoaded && visibleLayers.includes(file.name) && availableLayers.includes(file.layer)"
          :key="file.name"
          :map="map"
          :preset="file"
          :order="visibleLayers.indexOf(file.name)"
          :visible-layers="visibleLayers"
        />
      </div>
      <template v-if="mapIsLoaded && !rlinksIsEmpty">
        <RoadLinks
          :map="map"
          :is-editor-mode="isEditorMode"
        />
      </template>
      <StaticLinks
        :map="map"
        :is-editor-mode="isEditorMode"
        :mode="mode"
      />
      <template v-if="mapIsLoaded">
        <EditorLinks
          :map="map"
        />
      </template>
      <ODMap
        :map="map"
        :is-editor-mode="isEditorMode"
        :is-o-d-mode="mode==='od'"
      />
    </MglMap>
  </div>
</template>
<style lang="scss" scoped>
.map{
  width: 100%;
}
.my-custom-dialog {
  position: absolute !important;
  top: 10px !important;
  right: 20px !important;
}
</style>
