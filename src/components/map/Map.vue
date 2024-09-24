<script setup>
import Mapbox from 'mapbox-gl'
/// import MglMap from '@comp/q-mapbox/MglMap.vue'
import { MglMap, MglGeojsonLayer, MglNavigationControl, MglScaleControl } from 'vue-mapbox3'

import { computed, watch, ref, toRefs, onBeforeUnmount, defineAsyncComponent, shallowRef } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import arrowImage from '@static/arrow.png'
import Linestring from 'turf-linestring'
import Settings from './Settings.vue'
import StaticLinks from './StaticLinks.vue'
import EditorLinks from './EditorLinks.vue'
import ODMap from './ODMap.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import StyleSelector from '../utils/StyleSelector.vue'
import SimpleDialog from '@src/components/utils/SimpleDialog.vue'

const mapboxPublicKey = import.meta.env.VITE_MAPBOX_PUBLIC_KEY
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
const emits = defineEmits(['clickFeature'])
const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

// map stuff
const map = shallowRef(null)
const mapIsLoaded = ref(false)

function fitBounds() {
  const bounds = new Mapbox.LngLatBounds()
  // only use first and last point. seems to bug when there is anchor...
  if (linksStore.links.features.length > 0) {
    linksStore.links.features.forEach(link => {
      bounds.extend([link.geometry.coordinates[0],
        link.geometry.coordinates[link.geometry.coordinates.length - 1]])
    })
  } else {
    rlinksStore.rlinks.features.forEach(link => {
      bounds.extend([link.geometry.coordinates[0],
        link.geometry.coordinates[link.geometry.coordinates.length - 1]])
    })
  }

  // for empty (new) project, do not fit bounds around the links geometries.
  if (Object.keys(bounds).length !== 0) {
    map.value.fitBounds(bounds, {
      padding: 100,
    })
  }
  map.value.loadImage(arrowImage, function (err, image) {
    if (err) {
      console.error('err image', err)
      return
    }
    map.value.addImage('arrow', image, { sdf: true })
  })
}

function onMapLoaded (event) {
  if (map.value) mapIsLoaded.value = false
  map.value = event.map
  fitBounds()
  event.map.dragRotate.disable()
  mapIsLoaded.value = true
}

const showLeftPanel = computed(() => { return store.showLeftPanel })
watch(showLeftPanel, () => { setTimeout(() => map.value.resize(), 250) })

const mapStyle = computed(() => { return store.mapStyle })
watch(mapStyle, () => { saveMapPosition() })
onBeforeUnmount(() => { saveMapPosition() })

function saveMapPosition () {
  try {
    const center = map.value.getCenter()
    store.saveMapPosition({
      mapCenter: [center.lng, center.lat],
      mapZoom: map.value.getZoom(),
    })
  } catch (err) {}
}

// All of the rasters
const visibleRasters = computed(() => store.visibleRasters)
const rasterFiles = computed(() => store.styles)
const availableLayers = computed(() => store.availableLayers)

// modes
const { mode } = toRefs(props)
const editorNodes = computed(() => linksStore.editorNodes)
const anchorMode = computed(() => store.anchorMode)
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const editorTrip = computed(() => linksStore.editorTrip)
const isEditorMode = computed(() => editorTrip.value !== null)

// DrakLink
const drawLink = ref(Linestring([]))
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
  if (val) {
    if (linksStore.changeBounds) {
      const bounds = new Mapbox.LngLatBounds()
      editorNodes.value.features.forEach(node => {
        bounds.extend(node.geometry.coordinates)
      })
      map.value.fitBounds(bounds, {
        padding: 200,
      })
    }
  } else { drawMode.value = false }
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

const firstNode = computed(() => { return linksStore.firstNode })
const lastNode = computed(() => { return linksStore.lastNode })
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
    const newNode = linksStore.newNode.properties.index
    useStickyNode({ stickyNode: hoverId.value, selectedNode: newNode })
  }
  if (store.routingMode) {
    routeLink(linksStore.newLink)
  }
}

function addPointRoad(event) {
  const pointGeom = Object.values(event.mapboxEvent.lngLat)
  const payload = {
    nodeIdA: selectedNode.value.id,
    nodeIdB: hoverId.value, // could be null, a node or a link.
    geom: pointGeom,
    layerId: hoverLayer.value,
  }
  // this action overwrite payload.nodeIdB to the actual newLink nodeB.
  rlinksStore.createrLink(payload)
  drawMode.value = false
  // then, create a hover (and off hover) to the new node b to continue drawing
  onHoverRoad({ layerId: 'rnodes', selectedId: [payload.nodeIdB] })
  offHover()
}

function clickFeature (event) {
  // when we move a rNode, we need to update drawlink as it is link to this moved node.
  if (['Move rNode', 'Delete rLink'].includes(event.action)) {
    drawMode.value = false
    connectedDrawLink.value = false
  }
  // prevent emitting add road node inline when drawmode is on.
  // we will add the node inlne and create the new link in this component.
  if (!(event.action === 'Add Road Node Inline' && drawMode.value)) {
    emits('clickFeature', event)
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

import { useRouting } from '@src/components/utils/routing/routing.js'
const { routeLink } = useRouting()

</script>
<template>
  <SimpleDialog
    v-model="showDialog"
    :title="$gettext('Replace %{index}', { index: selectedNodeId })"
    :body="$gettext('with %{index}?', { index: stickyNodeId }) "
    @confirm="applyStickyNode"
  />
  <MglMap
    :key="mapStyle"
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    :map-style="mapStyle"
    :center="store.mapCenter"
    :zoom="store.mapZoom"
    @load="onMapLoaded"
    @mousemove="draw"
    @mouseout="resetDraw('out')"
    @mouseenter="resetDraw('in')"
    @click="addPoint"
    @mousedown="clickStopDraw"
  >
    <div
      v-if="mapIsLoaded"
      :style="{'display':'flex'}"
    >
      <Settings />
      <StyleSelector />
      <LayerSelector
        v-if="rasterFiles.length>0"
        :choices="rasterFiles"
        :available-layers="availableLayers"
        :map="map"
      />
    </div>
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl
      position="bottom-right"
      :visualize-pitch="true"
    />
    <div
      v-for="file in rasterFiles"
      :key="file.name"
    >
      <StaticLayer
        v-if="mapIsLoaded && visibleRasters.includes(file.name) && availableLayers.includes(file.layer)"
        :key="file.name"
        :map="map"
        :preset="file"
        :order="visibleRasters.indexOf(file.name)"
        :visible-rasters="visibleRasters"
      />
    </div>
    <template v-if="mapIsLoaded && !rlinksIsEmpty">
      <RoadLinks
        :map="map"
        :is-editor-mode="isEditorMode"
        :is-road-mode="mode==='road'"
        @select="drawMode = false"
        v-on="(isEditorMode)? {} : anchorMode ? {clickFeature: clickFeature } : {onHover:onHoverRoad, offHover:offHover,clickFeature: clickFeature}"
      />
    </template>
    <StaticLinks
      :map="map"
      :is-editor-mode="isEditorMode"
      :mode="mode"
      @rightClick="(e) => emits('clickFeature',e)"
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
      @clickFeature="clickFeature"
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
</template>
<style lang="scss" scoped>
.map-view {
  width: 100%;
}
.my-custom-dialog {
  position: absolute !important;
  top: 10px !important;
  right: 20px !important;
}
</style>
