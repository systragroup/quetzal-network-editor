<script setup>
import { MglPopup, MglImageLayer, MglGeojsonLayer } from 'vue-mapbox3'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, toRefs, ref, watch, onMounted } from 'vue'
import { useGettext } from 'vue3-gettext'

import geojson from '@constants/geojson'

const { $gettext } = useGettext()

const props = defineProps(['map'])
const emits = defineEmits(['clickFeature', 'onHover', 'onHoverSticky', 'offHover', 'useStickyNode'])

const store = useIndexStore()

const linksStore = useLinksStore()
const editorLinks = computed(() => { return linksStore.editorLinks })
const editorNodes = computed(() => { return linksStore.editorNodes })

const stickyMode = computed(() => { return store.stickyMode })
const showedTrips = computed(() => { return linksStore.selectedTrips })

const visibleNodes = computed(() => { return stickyMode.value ? linksStore.visibleNodes : geojson })
onMounted(() => { map.value.getSource('stickyNodes').setData(visibleNodes.value) })
watch(stickyMode, () => { map.value.getSource('stickyNodes').setData(visibleNodes.value) })
watch(showedTrips, () => { map.value.getSource('stickyNodes').setData(visibleNodes.value) })

const anchorMode = computed(() => { return store.anchorMode })

const anchorNodes = computed(() => { return anchorMode.value ? linksStore.anchorNodes : geojson })
const { map } = toRefs(props)

const selectedFeature = ref(null)
const hoveredStateId = ref(null)
const stickyStateId = ref(null)
const isSticking = computed(() => { return stickyStateId.value !== null && hoveredStateId.value !== null && keepHovering.value })
const keepHovering = ref(false)
const dragNode = ref(false)

const disablePopup = ref(false)

const popupEditor = ref({
  coordinates: [0, 0],
  showed: false,
  content: null,
})
const contextMenu = ref({
  coordinates: [0, 0],
  showed: false,
  actions: [],
  feature: null,
  type: null, // link of node
})

function selectClick (event) {
  if (hoveredStateId.value !== null) {
    // Get the highlighted feature
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id)[0]
    // Emit a click base on layer type (node or link)

    if (selectedFeature.value !== null) {
      if (hoveredStateId.value.layerId === 'editorLinks') {
        if (anchorMode.value) {
          linksStore.addNodeInline({
            selectedLink: selectedFeature.value.properties,
            lngLat: event.mapboxEvent.lngLat,
            nodes: 'anchorNodes',
          })
        } else {
          linksStore.addNodeInline({
            selectedLink: selectedFeature.value.properties,
            lngLat: event.mapboxEvent.lngLat,
            nodes: 'editorNodes',
          })
        }
      }
    }
  }
}

function contextMenuNode (event) {
  if (popupEditor.value.showed && hoveredStateId.value?.layerId === 'editorNodes') {
    contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng,
      event.mapboxEvent.lngLat.lat,
    ]
    contextMenu.value.showed = true

    contextMenu.value.type = 'node'
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    contextMenu.value.feature = features.filter(item => item.id === hoveredStateId.value.id)[0]

    const selectedNode = contextMenu.value.feature.properties.index

    if ((selectedNode === linksStore.firstNodeId) || (selectedNode === linksStore.lastNodeId)) {
      contextMenu.value.actions
          = [
          { name: 'Edit Node Info', text: $gettext('Edit Node Info') },
          { name: 'Delete Stop', text: $gettext('Delete Stop') },
        ]
    } else {
      contextMenu.value.actions
           = [
          { name: 'Edit Node Info', text: $gettext('Edit Node Info') },
          { name: 'Cut Before Node', text: $gettext('Cut Before Node') },
          { name: 'Cut After Node', text: $gettext('Cut After Node') },
          { name: 'Delete Stop', text: $gettext('Delete Stop') },
        ]
    }
  }
}

function contextMenuAnchor() {
  if (hoveredStateId.value?.layerId === 'anchorNodes') {
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id)
    linksStore.deleteAnchorNode({ selectedNode: selectedFeature.value[0].properties })
  }
}

function linkRightClick (event) {
  if (hoveredStateId.value.layerId === 'editorLinks') {
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id)[0]
    const click = {
      selectedFeature: selectedFeature.value,
      action: 'Edit Link Info',
      lngLat: event.mapboxEvent.lngLat,
      lingering: true,
    }
    emits('clickFeature', click)
  }
}
function actionClick (event) {
  console.log(event)
  switch (event.action) {
    case 'Cut Before Node':
      linksStore.cutLineAtNode({ selectedNode: event.feature.properties })
      break
    case 'Cut After Node':
      linksStore.cutLineFromNode({ selectedNode: event.feature.properties })
      break
    case 'Delete Stop':
      linksStore.deleteNode({ selectedNode: event.feature.properties })
      break
    default:
      // edit node info
      emits('clickFeature', {
        selectedFeature: event.feature,
        action: event.action,
        lngLat: event.coordinates,
      })
      break
  }
  contextMenu.value.showed = false
  contextMenu.value.type = null
}

function onCursor (event) {
  if (!hoveredStateId.value || hoveredStateId.value.layerId === 'editorLinks') {
    map.value.getCanvas().style.cursor = 'pointer'
    if (hoveredStateId.value !== null) {
      map.value.setFeatureState({ source: hoveredStateId.value.layerId, id: hoveredStateId.value.id }, { hover: false })
    }
    hoveredStateId.value = { layerId: event.layerId, id: event.mapboxEvent.features[0].id }
    map.value.setFeatureState({ source: hoveredStateId.value.layerId, id: hoveredStateId.value.id }, { hover: true })
    if (!disablePopup.value && !anchorMode.value) {
      popupEditor.value.coordinates = [event.mapboxEvent.lngLat.lng,
        event.mapboxEvent.lngLat.lat,
      ]
      popupEditor.value.content = hoveredStateId.value.id
      popupEditor.value.showed = true
    }
    emits('onHover', { selectedId: hoveredStateId.value.id })
  }
}
function offCursor (event) {
  if (hoveredStateId.value) {
    if (!(['editorNodes', 'anchorNodes'].includes(hoveredStateId.value.layerId) && event?.layerId === 'editorLinks')) {
      // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
      if (keepHovering.value) {
        dragNode.value = true
        contextMenu.value.showed = false
        // normal behaviours, hovering is false
      } else {
        map.value.getCanvas().style.cursor = ''
        popupEditor.value.showed = false
        // eslint-disable-next-line max-len
        map.value.setFeatureState({ source: hoveredStateId.value.layerId, id: hoveredStateId.value.id }, { hover: false })
        hoveredStateId.value = null
        if (event) { emits('offHover', event) }
      }
    }
  }
}

function onCursorSticky(event) {
  stickyStateId.value = { layerId: event.layerId, id: event.mapboxEvent.features[0].id }
  map.value.setFeatureState({ source: stickyStateId.value.layerId, id: stickyStateId.value.id }, { hover: true })
  if (dragNode.value && hoveredStateId.value.layerId === 'editorNodes') {
    const idx = event.mapboxEvent.features[0].id
    const node = visibleNodes.value.features.filter(node => node.properties.index === idx)[0]
    dragNode.value = false
    linksStore.moveNode({ selectedNode: selectedFeature.value, lngLat: node.geometry.coordinates })
  }
  emits('onHoverSticky', { selectedId: stickyStateId.value.id, layerId: stickyStateId.value.layerId })
}

function offCursorSticky (event) {
  if (stickyStateId.value) {
    map.value.setFeatureState({ source: stickyStateId.value.layerId, id: stickyStateId.value.id }, { hover: false })
    stickyStateId.value = null
    emits('offHover', event)
  }
}

function moveNode (event) {
  if (event.mapboxEvent.originalEvent.button === 0
    & ['editorNodes', 'anchorNodes'].includes(hoveredStateId.value.layerId)) {
    event.mapboxEvent.preventDefault() // prevent map control
    map.value.getCanvas().style.cursor = 'grab'
    // disable mouseLeave so we stay in hover state.
    keepHovering.value = true
    // get selected node
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id)[0]

    // disable popup
    disablePopup.value = true
    popupEditor.value.showed = false
    // get position
    map.value.on('mousemove', onMove)
    map.value.on('mouseup', stopMovingNode)
  }
}
function onMove (event) {
  // get position and update node position
  // only if dragmode is activated (we just leave the node hovering state.)
  if (dragNode.value && selectedFeature.value) {
    if (hoveredStateId.value.layerId === 'anchorNodes') {
      linksStore.moveAnchor({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
    } else {
      linksStore.moveNode({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
    }
  }
}
function stopMovingNode () {
  // stop tracking position (moving node.)
  map.value.getCanvas().style.cursor = 'pointer'
  map.value.off('mousemove', onMove)
  // enable popup and hovering off back. disable Dragmode
  keepHovering.value = false
  dragNode.value = false
  disablePopup.value = false
  // call offCursor event, if we drag too quickly, it will not be call and the node will stay in hovering mode.
  offCursor()
  map.value.off('mouseup', stopMovingNode)
  if (stickyStateId.value) {
    emits('useStickyNode', { selectedNode: selectedFeature.value.properties.index, stickyNode: stickyStateId.value.id })
  }
  // emit a clickNode with the selected node.
  // this will work with lag as it is the selectedFeature and not the highlighted one.
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="editorLinks"
      :source="{
        type: 'geojson',
        data: editorLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorLinks"
      :layer="{
        type: 'line',
        minzoom: 2,
        paint: {
          'line-color': ['case', ['boolean', anchorMode, false],$vuetify.theme.current.colors.linkssecondary, $vuetify.theme.current.colors.linksprimary],
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0]
        }
      }"
      v-on="anchorMode ? {} : {contextmenu: linkRightClick}"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
    />

    <MglImageLayer
      source-id="editorLinks"
      type="symbol"
      source="editorLinks"
      layer-id="arrow-layer"
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
          'icon-color': ['case', ['boolean', anchorMode, false], $vuetify.theme.current.colors.linkssecondary, $vuetify.theme.current.colors.linksprimary],
        }
      }"
    />

    <MglGeojsonLayer
      source-id="editorNodes"
      :source="{
        type: 'geojson',
        data: editorNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': $vuetify.theme.current.colors.accent,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], ['case', ['boolean', isSticking, false], 24, 16], 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        }
      }"
      v-on="anchorMode ? {} : {click: selectClick, contextmenu: contextMenuNode}"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
    />

    <MglGeojsonLayer
      source-id="anchorNodes"
      :source="{
        type: 'geojson',
        data: anchorNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': '#ffffff',
          'circle-opacity':0.5,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
          'circle-stroke-color': '#2C3E4E',
          'circle-stroke-width': 2,
        },
      }"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
      @contextmenu="contextMenuAnchor"
    />

    <MglGeojsonLayer
      source-id="stickyNodes"
      :reactive="false"
      :source="{
        type: 'geojson',
        data: geojson,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="stickyNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': $vuetify.theme.current.colors.accent,
          'circle-stroke-color': '#2C3E4E',
          'circle-stroke-width': 2,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], ['case', ['boolean', isSticking, false], 24, 10], 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0, 0]
        }
      }"
      @mouseover="onCursorSticky"
      @mouseleave="offCursorSticky"
    />

    <MglPopup
      :close-button="false"
      :showed="popupEditor.showed"
      :coordinates="popupEditor.coordinates"
      @close="popupEditor.showed=false"
    >
      <span>
        <h3>{{ popupEditor.content }}</h3>
        <hr>
        {{ hoveredStateId?.layerId == 'editorLinks'?
          $gettext("Left click to add a stop"):
          $gettext("Hold left click to drag") }}
        <hr>
        {{ hoveredStateId?.layerId == 'editorLinks'?
          $gettext("Right click to edit properties"):
          $gettext("Right click for context menu") }}
      </span>
    </MglPopup>

    <MglPopup
      :close-button="false"
      :showed="contextMenu.showed"
      :coordinates="contextMenu.coordinates"
      @close="contextMenu.showed=false"
    >
      <span
        @mouseleave="contextMenu.showed=false"
      >
        <v-list
          density="compact"
        >
          <v-list-item
            v-for="action in contextMenu.actions"
            :key="action.id"
            width="300"
          >

            <v-btn
              variant="outlined"
              size="small"
              block
              @click="actionClick({action: action.name,
                                   feature: contextMenu.feature,
                                   coordinates: contextMenu.coordinates})"
            >
              {{ $gettext(action.text) }}
            </v-btn>

          </v-list-item>
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
