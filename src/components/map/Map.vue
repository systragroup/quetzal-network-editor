<script setup>
/// import MglMap from '@comp/q-mapbox/MglMap.vue'
import { MglMap, MglGeojsonLayer, MglNavigationControl, MglScaleControl } from 'vue-mapbox3'

import { computed, watch, ref, toRefs, onBeforeUnmount, defineAsyncComponent, shallowRef, onMounted } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import arrowImage from '@static/arrow.png'
import { lineString } from '@turf/helpers'
import Settings from './Settings.vue'
import StaticLinks from './StaticLinks.vue'
import EditorLinks from './EditorLinks.vue'
import ODMap from './ODMap.vue'
import { useIndexStore } from '@src/store/index'
import { useMapStore } from '@src/store/map'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import StyleSelector from '../utils/StyleSelector.vue'
import SimpleDialog from '@src/components/utils/SimpleDialog.vue'
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
const editorNodes = computed(() => linksStore.editorNodes)
const anchorMode = computed(() => store.anchorMode)
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const editorTrip = computed(() => linksStore.editorTrip)
const isEditorMode = computed(() => editorTrip.value !== null)

// DrakLink
const drawLink = ref(lineString([[0, 0], [0, 0]]))
const drawMode = ref(false)
const connectedDrawLink = ref(false)

function draw (event) {
  // do not update position on connected link, this makes the node sticky
  if (Object.keys(event).includes('mapboxEvent')) {
    if (!connectedDrawLink.value) {
      if (drawMode.value && !anchorMode.value) {
        // update draw line with new geometry.
        const geometry = [drawLink.value.geometry.coordinates[0], Object.values(event.mapboxEvent.lngLat)]
        drawLink.value.geometry.coordinates = geometry
      }
    }
  }
}

function resetDraw (event) {
  // reset draw line when we leave the map. put it back when enter
  if (drawMode.value && event === 'out') {
    map.value.setLayoutProperty('drawLink', 'visibility', 'none')
  }
  if (drawMode.value && event === 'in') {
    map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
  }
}
function clickStopDraw (event) {
  // remove drawmode when we right click on map
  if (event.mapboxEvent?.originalEvent.button === 2 && !hoverId.value) {
    drawMode.value = false
  }
}

watch(editorTrip, (val) => {
  store.setAnchorMode(false)
  store.setStickyMode(false)
  store.setRoutingMode(false)
  connectedDrawLink.value = false
  if (!val) { drawMode.value = false }
})

watch(isEditorMode, (val) => {
  // check if map is loaded too, there is a bug if not, when component is laoded in edition mode (changing page).
  if (val && editorNodes.value.features.length > 0 && !anchorMode.value && mapIsLoaded.value) {
    drawMode.value = true
  } else {
    drawMode.value = false
    drawLink.value.geometry.coordinates = []
  }// remove drawmode if we quit edition mode.

  if (!val && drawMode.value) {
    drawMode.value = false
    drawLink.value.geometry.coordinates = []
  }
})

watch(anchorMode, (val) => {
  if (val) {
    drawMode.value = false
    store.changeNotification(
      { text: $gettext('Left click to add an anchor point, right click to delete'), autoClose: false })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
})

watch(mode, (val) => {
  if (val === 'pt') {
    drawMode.value = false
  }
})

watch(drawMode, (val) => {
  if (val) {
    map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
  } else {
    map.value.setLayoutProperty('drawLink', 'visibility', 'none')
  }
})

// Hovering and stuff.
const selectedNode = ref({ id: null, layerId: null })
const hoverId = ref(null)
const hoverLayer = ref(null)

const firstNodeId = computed(() => { return linksStore.firstNodeId })
const lastNodeId = computed(() => { return linksStore.lastNodeId })

const firstNode = computed(() =>
  editorNodes.value.features.filter((node) => node.properties.index === firstNodeId.value)[0],
)
const lastNode = computed(() =>
  editorNodes.value.features.filter((node) => node.properties.index === lastNodeId.value)[0],
)
// when the first or last node change (delete or new) change the value of those nodes.
watch(firstNode, (val) => {
  if (editorTrip.value && val) {
    drawLink.value.geometry.coordinates = [val.geometry.coordinates, val.geometry.coordinates]
    selectedNode.value.layerId = 'nodes'
    selectedNode.value.id = firstNode.value?.properties.index
  }
}, { deep: true })
watch(lastNode, (val) => {
  if (editorTrip.value && val) {
    drawLink.value.geometry.coordinates = [val.geometry.coordinates, val.geometry.coordinates]
    selectedNode.value.layerId = 'nodes'
    selectedNode.value.id = lastNode.value?.properties.index
  }
}, { deep: true })

function addPoint (event) {
  if (Object.keys(event).includes('mapboxEvent')) {
    event.mapboxEvent.originalEvent.stopPropagation()
    if (drawMode.value) {
      if (selectedNode.value.layerId === 'rnodes') {
        addPointRoad(event)
      } else { // PT nodes
        addPointPT(event)
      }
    } else {
      // for a new Line
      if (editorNodes.value.features.length === 0 && editorTrip.value) {
        linksStore.createNewNode(Object.values(event.mapboxEvent.lngLat))
        store.changeNotification({ text: '', autoClose: true })
      }
    }
  }
}

function addPointPT(event) {
  const action = (selectedNode.value.id === linksStore.lastNodeId)
    ? 'Extend Line Upward'
    : 'Extend Line Downward'
  const pointGeom = Object.values(event.mapboxEvent.lngLat)
  if (drawMode.value && !anchorMode.value && !hoverId.value) {
    linksStore.applyNewLink({ nodeId: selectedNode.value.id, geom: pointGeom, action: action })
  } else if (connectedDrawLink.value && hoverLayer.value === 'stickyNodes' && hoverId.value) {
    // reuse a existing node. create the link and simulate a move event with useStickyNode()
    linksStore.applyNewLink({ nodeId: selectedNode.value.id, geom: pointGeom, action: action })
    const newNode = linksStore.editorNodes.features.slice(-1)[0].properties.index
    useStickyNode({ stickyNode: hoverId.value, selectedNode: newNode })
  }
  if (store.routingMode) {
    const newLinkFeature = action === 'Extend Line Upward'
      ? linksStore.editorLinks.features.slice(-1)[0]
      : linksStore.editorLinks.features[0]
    routeLink(newLinkFeature)
  }
}

function addPointRoad(event) {
  const pointGeom = Object.values(event.mapboxEvent.lngLat)
  let payload = {}
  if (hoverLayer.value === 'rlinks') {
    payload = {
      nodeIdA: selectedNode.value.id,
      linksId: hoverId.value, // could be null, a node or a link.
      geom: pointGeom,
    }
  } else {
    payload = {
      nodeIdA: selectedNode.value.id,
      nodeIdB: hoverId.value, // could be null, a node or a link.
      geom: pointGeom,
    }
  }
  // this action overwrite payload.nodeIdB to the actual newLink nodeB.
  const toHover = rlinksStore.createrLink(payload)
  drawMode.value = false
  // then, create a hover (and off hover) to the new node b to continue drawing
  onHoverRoad({ layerId: 'rnodes', selectedId: [toHover] })
  offHover()
}

function clickFeature (event) {
  // when we move a rNode, we need to update drawlink as it is link to this moved node.
  if (['Move rNode', 'Delete rLink'].includes(event.action)) {
    drawMode.value = false
    connectedDrawLink.value = false
  }
}

function onHover (event) {
  // no drawing when we hover on link or node
  hoverId.value = event.selectedId
  if (drawMode.value) { map.value.setLayoutProperty('drawLink', 'visibility', 'none') }
  // change hook when we hover first or last node.
  if (hoverId.value === linksStore.firstNodeId) {
    drawLink.value.geometry.coordinates = [firstNode.value.geometry.coordinates, firstNode.value.geometry.coordinates]
    selectedNode.value.id = hoverId.value
    selectedNode.value.layerId = event.layerId
    drawMode.value = true
  } else if (hoverId.value === linksStore.lastNodeId) {
    drawLink.value.geometry.coordinates = [lastNode.value.geometry.coordinates, lastNode.value.geometry.coordinates]
    selectedNode.value.id = hoverId.value
    selectedNode.value.layerId = event.layerId
    drawMode.value = true
  }
}

function onHoverRoad (event) {
  if (event?.layerId === 'rnodes') {
    hoverLayer.value = event.layerId
    hoverId.value = event.selectedId[0]
    if (drawMode.value) {
      // nodes are sticky. drawlink change size and style
      connectedDrawLink.value = true
    } else {
      const node = rlinksStore.visiblerNodes.features.filter(node =>
        node.properties.index === hoverId.value)[0]
      drawLink.value.geometry.coordinates = [node.geometry.coordinates, node.geometry.coordinates]
      drawMode.value = true
      connectedDrawLink.value = false
      selectedNode.value.id = hoverId.value
      selectedNode.value.layerId = hoverLayer.value
    }
  } else if (event?.layerId === 'rlinks') {
    hoverLayer.value = event.layerId
    hoverId.value = event.selectedId
  }
}

function onHoverSticky(event) {
  hoverId.value = event.selectedId
  hoverLayer.value = event.layerId
  connectedDrawLink.value = true
}

function offHover () {
  // put back visible draw line
  hoverId.value = null
  hoverLayer.value = null
  if (drawMode.value) {
    map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
    connectedDrawLink.value = false
  }
}

const showDialog = ref(false)
const stickyNodeId = ref('')
const selectedNodeId = ref('')
function useStickyNode(event) {
  stickyNodeId.value = event.stickyNode
  selectedNodeId.value = event.selectedNode
  // only show dialog if we do not stick on itself (moving a node eand removing it to its original place => no changes)
  if (stickyNodeId.value !== selectedNodeId.value) {
    showDialog.value = true
  }
}

function applyStickyNode() {
  const nodesList = editorNodes.value.features.map(node => node.properties.index)
  if (!nodesList.includes(stickyNodeId.value)) {
    linksStore.applyStickyNode({ selectedNodeId: selectedNodeId.value, stickyNodeId: stickyNodeId.value })
  } else {
    store.changeNotification(
      { text: $gettext('Node already in use by the trip. Cannot replace'), autoClose: true, color: 'error' })
  }
}

import { useRouting } from '@src/utils/routing/routing.js'
const { routeLink } = useRouting()

</script>
<template>
  <SimpleDialog
    v-model="showDialog"
    :title="$gettext('Replace %{index}', { index: selectedNodeId })"
    :body="$gettext('with %{index}?', { index: stickyNodeId }) "
    @confirm="applyStickyNode"
  />
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
      @mousemove="draw"
      @mouseout="resetDraw('out')"
      @mouseenter="resetDraw('in')"
      @click="addPoint"
      @mousedown="clickStopDraw"
    >
      <MglScaleControl position="bottom-right" />
      <MglNavigationControl
        position="bottom-right"
        :visualize-pitch="true"
      />
      <div v-if="mapIsLoaded">
        <Settings />
        <StyleSelector :order="1" />
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
          @select="drawMode = false"
          v-on="(isEditorMode)? {} : anchorMode ? {clickFeature: clickFeature } : {onHover:onHoverRoad, offHover:offHover,clickFeature: clickFeature}"
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
          v-on="anchorMode ? {clickFeature: clickFeature } : {onHover:onHover,onHoverSticky:onHoverSticky, offHover:offHover,clickFeature: clickFeature, useStickyNode:useStickyNode}"
        />
      </template>
      <ODMap
        :map="map"
        :is-editor-mode="isEditorMode"
        :is-o-d-mode="mode==='od'"
        @click-feature="clickFeature"
      />

      <MglGeojsonLayer
        v-show="drawMode"
        source-id="drawLink"
        :source="{
          type: 'geojson',
          data:drawLink,
          buffer: 0,
          generateId: true,
        }"
        layer-id="drawLink"
        :layer="{
          type: 'line',
          minzoom: 2,
          paint: {
            'line-opacity': 1,
            'line-color': $vuetify.theme.current.colors.linksprimary,
            'line-width': ['case', ['boolean', connectedDrawLink, false], 5, 3],
            'line-dasharray':['case', ['boolean', connectedDrawLink, false],['literal', []] , ['literal', [0, 2, 4]]],

          }
        }"
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
