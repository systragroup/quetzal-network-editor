<script setup lang="ts">
import { MglPopup, MglImageLayer, MglGeojsonLayer } from 'vue-mapbox3'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, toRefs, ref, watch, onMounted, onUnmounted } from 'vue'
import { Map, GeoJSONSource, MapMouseEvent } from 'mapbox-gl'
import { useGettext } from 'vue3-gettext'
import { baseLineString, basePoint, GeoJsonFeatures, LineStringFeatures, LineStringGeoJson, PointGeoJson } from '@src/types/geojson'
import { AddNodeTypes } from '@src/types/typesStore'
import { ActionClick, ContextMenu, CustomMapEvent, HoverState } from '@src/types/mapbox'
import { useForm } from '@src/composables/UseForm'
const { openDialog } = useForm()

const { $gettext } = useGettext()

function setSourceData(sourceName: string, data: PointGeoJson | LineStringGeoJson) {
  const source = map.value.getSource(sourceName) as GeoJSONSource
  source.setData(data)
}

interface Popup {
  coordinates: number[]
  showed: boolean
  content: string | null
}

interface Props {
  map: Map
}

const props = defineProps<Props>()
// if (!map.value) return
const emits = defineEmits(['clickFeature', 'onHover', 'onHoverSticky', 'offHover', 'useStickyNode'])
const { map } = toRefs(props)
const store = useIndexStore()

const linksStore = useLinksStore()
const editorLinks = computed(() => { return linksStore.editorLinks })
const editorNodes = computed(() => { return linksStore.editorNodes })

const stickyMode = computed(() => { return store.stickyMode })
const showedTrips = computed(() => { return linksStore.selectedTrips })

const visibleNodes = computed(() => { return stickyMode.value ? linksStore.visibleNodes : basePoint() })

onMounted(() => setSourceData('stickyNodes', visibleNodes.value))
watch(stickyMode, () => setSourceData('stickyNodes', visibleNodes.value))
watch(showedTrips, () => setSourceData('stickyNodes', visibleNodes.value))

const anchorMode = computed(() => { return store.anchorMode })
const routingMode = computed(() => { return store.routingMode })

import { useRouting } from '@src/utils/routing/routing.js'
const { routeLink } = useRouting()
const routeAnchorMode = computed(() => anchorMode.value && routingMode.value)
const routeAnchorLine = computed(() => routeAnchorMode.value ? linksStore.routeAnchorLine : baseLineString())

const anchorNodes = computed(() => {
  if (routeAnchorMode.value) {
    return linksStore.routeAnchorNodes
  } else if (anchorMode.value) {
    return linksStore.anchorNodes
  } else {
    return basePoint()
  }
})

// TODO: updateLink like roadLinks
watch(editorLinks, (links) => {
  // update map when change on editorLinks.
  setSourceData('editorLinks', links)
  if (!keepHovering.value) {
    // dont set pickupdrop off when moving node
    setNodesPickupDropOff()
  }
}, { deep: true, immediate: false })

function setNodesPickupDropOff() {
  // get nodes with dropOff and pickup not 0. mark them as stop:false.
  // this change their opacity.
  const linksA = editorLinks.value.features.filter(el => Number(el.properties.pickup_type) !== 0)
  const nodesA = linksA.map(el => el.properties.a)
  const linksB = editorLinks.value.features.filter(el => Number(el.properties.drop_off_type) !== 0)
  const nodesB = new Set(linksB.map(el => el.properties.b))
  const intersection = new Set([...nodesA].filter(x => nodesB.has(x)))
  let otherNodes = editorNodes.value.features.map(node => node.properties.index)
  otherNodes = otherNodes.filter(node => !intersection.has(node))
  otherNodes.forEach(node => map.value.setFeatureState({ source: 'editorNodes', id: node }, { stop: true }))
  intersection.forEach(node => map.value.setFeatureState({ source: 'editorNodes', id: node }, { stop: false }))
}

// ctrl-z

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
function handleKeydown(event: KeyboardEvent) {
  // Check if Ctrl (or Command on Mac) and Z are pressed
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    linksStore.undo()
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault()
    linksStore.redo()
  }
}

const disablePopup = ref(false)

const popupEditor = ref<Popup>({
  coordinates: [0, 0],
  showed: false,
  content: null,
})

const contextMenu = ref<ContextMenu>({
  coordinates: [0, 0],
  showed: false,
  actions: [],
  feature: basePoint().features[0],
  type: null, // link of node
})

interface SelectedFeature {
  layerId: string
  featureId: string
}

const selectedFeature = ref<GeoJsonFeatures | null>(null)
const hoveredStateId = ref<SelectedFeature | null>(null)
const stickyStateId = ref<HoverState | null>(null)
const isSticking = computed(() => stickyStateId.value !== null && hoveredStateId.value !== null && keepHovering.value)
const keepHovering = ref(false)
const dragNode = ref(false)

watch(hoveredStateId, (newVal, oldVal) => {
  if (oldVal) {
    map.value.setFeatureState({ source: oldVal.layerId, id: oldVal.featureId }, { hover: false })
    emits('offHover')
  } if (newVal) {
    map.value.setFeatureState({ source: newVal.layerId, id: newVal.featureId }, { hover: true })
    emits('onHover', { selectedId: newVal.featureId })
  }
})

// clicks

function selectClick (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  // Get the highlighted feature
  const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
  const id = hoveredStateId.value.featureId
  selectedFeature.value = features.filter(item => item.id === id)[0] as GeoJsonFeatures
  // Emit a click base on layer type (node or link)

  if (selectedFeature.value !== null) {
    if (hoveredStateId.value.layerId === 'editorLinks') {
      let type: AddNodeTypes = 'editorNodes'
      if (routeAnchorMode.value) {
        type = 'anchorRoutingNodes'
      } else if (anchorMode.value) {
        type = 'anchorNodes'
      }
      linksStore.addNodeInline({
        selectedLink: selectedFeature.value as LineStringFeatures,
        lngLat: event.mapboxEvent.lngLat,
        nodeType: type,
      })
      linksStore.commitChanges('add node inline')
    }
  }
}

function contextMenuNode (event: CustomMapEvent) {
  if (popupEditor.value.showed && hoveredStateId.value?.layerId === 'editorNodes') {
    contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng,
      event.mapboxEvent.lngLat.lat,
    ]
    contextMenu.value.showed = true

    contextMenu.value.type = 'node'
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    const id = hoveredStateId.value.featureId
    contextMenu.value.feature = features.filter(item => item.id === id)[0] as GeoJsonFeatures

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
    const id = hoveredStateId.value.featureId
    selectedFeature.value = features.filter(item => item.id === id)[0] as GeoJsonFeatures
    let modLink = undefined
    if (routingMode.value) {
      modLink = linksStore.deleteRoutingAnchorNode({ selectedNode: selectedFeature.value.properties })
      routeLink(modLink)
    } else {
      linksStore.deleteAnchorNode({ selectedNode: selectedFeature.value.properties })
    }
  }
}

function linkRightClick () {
  if (!hoveredStateId.value) return
  if (hoveredStateId.value.layerId === 'editorLinks') {
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    const id = hoveredStateId.value.featureId
    selectedFeature.value = features.filter(item => item.id === id)[0] as GeoJsonFeatures
    const selectedIndex = selectedFeature.value.properties.index
    openDialog({ action: 'Edit Link Info', selectedArr: [selectedIndex], lingering: true, type: 'pt' })
  }
}

function actionClick (event: ActionClick) {
  switch (event.action) {
    case 'Cut Before Node':
      linksStore.cutLineBeforeNode({ selectedNode: event.feature.properties })
      break
    case 'Cut After Node':
      linksStore.cutLineAfterNode({ selectedNode: event.feature.properties })
      break
    case 'Delete Stop':
      const modLink = linksStore.deleteNode({ selectedNode: event.feature.properties })
      if (store.routingMode && modLink) { routeLink(modLink) }
      break
    case 'Edit Node Info':
      const selectedIndex = event.feature.properties.index
      openDialog({ action: 'Edit Node Info', selectedArr: [selectedIndex], lingering: true, type: 'pt' })
      break
  }
  contextMenu.value.showed = false
  contextMenu.value.type = null
  linksStore.commitChanges(event.action)
}

// hovering
function setPopup(coords: number[]) {
  if (!disablePopup.value && !anchorMode.value) {
    const featureId = hoveredStateId.value?.featureId
    popupEditor.value.coordinates = coords
    popupEditor.value.content = `${featureId}`
    popupEditor.value.showed = true
  }
}

function onCursor (event: CustomMapEvent) {
  if (!event.mapboxEvent.features) return
  // if hover is null or if hover is editorlinks. this make hoveing more natural and avoid collision from node to links
  if (!hoveredStateId.value || hoveredStateId.value.layerId === 'editorLinks') {
    const feature = event.mapboxEvent.features[0]
    const featureId = feature.id as string
    const layerId = event.layerId
    hoveredStateId.value = {
      layerId: layerId,
      featureId: featureId,
    }
    map.value.getCanvas().style.cursor = 'pointer'
    setPopup([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
  }
  // if (hoveredStateId.value) return
}
function offCursor (event?: CustomMapEvent) {
  if (!event) return
  if (!hoveredStateId.value) return
  // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
  if ((['editorNodes', 'anchorNodes'].includes(hoveredStateId.value.layerId) && event.layerId === 'editorLinks')) return
  // normal behaviours, hovering is is set to false
  if (!keepHovering.value) {
    map.value.getCanvas().style.cursor = ''
    popupEditor.value.showed = false
    hoveredStateId.value = null
  } else { // keep hovering
    dragNode.value = true
    contextMenu.value.showed = false
  }
}

function onCursorSticky(event: CustomMapEvent) {
  const features = event.mapboxEvent.features
  if (!features) return
  const selectedId = features[0].id as string
  stickyStateId.value = { layerId: event.layerId, id: selectedId }

  map.value.setFeatureState({ source: stickyStateId.value.layerId, id: stickyStateId.value.id }, { hover: true })
  if (!hoveredStateId.value) return
  if (dragNode.value && hoveredStateId.value.layerId === 'editorNodes') {
    const node = visibleNodes.value.features.filter(node => node.properties.index === selectedId)[0]
    dragNode.value = false
    linksStore.moveNode({ selectedNode: selectedFeature.value as any, lngLat: node.geometry.coordinates })
  }
  emits('onHoverSticky', { selectedId: stickyStateId.value.id, layerId: stickyStateId.value.layerId })
}

function offCursorSticky (event: CustomMapEvent) {
  if (stickyStateId.value) {
    map.value.setFeatureState({ source: stickyStateId.value.layerId, id: stickyStateId.value.id }, { hover: false })
    stickyStateId.value = null
    emits('offHover', event)
  }
}

// moving

function moveNode (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  if (!['editorNodes', 'anchorNodes'].includes(hoveredStateId.value.layerId)) return
  if (event.mapboxEvent.originalEvent.button === 0) {
    // get selected node
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    const id = hoveredStateId.value.featureId
    const selected = features.filter(item => item.id === id)[0]
    if (!selected) return //  sometime its undefined...
    selectedFeature.value = selected as GeoJsonFeatures
    linksStore.getConnectedLinks({ selectedNode: selectedFeature.value })

    // disable popup
    disablePopup.value = true
    popupEditor.value.showed = false
    // prevent map control
    event.mapboxEvent.preventDefault()
    map.value.getCanvas().style.cursor = 'grab'
    // disable mouseLeave so we stay in hover state.
    keepHovering.value = true
    // get position
    map.value.on('mousemove', onMove)
    map.value.on('mouseup', stopMovingNode)
  }
}
function onMove (event: MapMouseEvent) {
  // get position and update node position
  // only if dragmode is activated (we just leave the node hovering state.)
  if (dragNode.value && selectedFeature.value) {
    if (hoveredStateId.value?.layerId === 'anchorNodes') {
      if (routingMode.value) {
        linksStore.moveRoutingAnchor({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
      } else {
        linksStore.moveAnchor({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
      }
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
    const index = selectedFeature.value?.properties.index
    emits('useStickyNode', { selectedNode: index, stickyNode: stickyStateId.value.id })
  }
  if (routingMode.value) {
    linksStore.connectedLinks.b.forEach(link => routeLink(link))
    linksStore.connectedLinks.a.forEach(link => routeLink(link))
    linksStore.connectedLinks.anchor.forEach(link => routeLink(link))
  }
  linksStore.commitChanges('move node')
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="editorLinks"
      :reactive="false"
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
      source-id="stickyNodes"
      :reactive="false"
      :source="{
        type: 'geojson',
        data: basePoint(),
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="stickyNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': $vuetify.theme.current.colors.accentlight,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], ['case', ['boolean', isSticking, false], 24, 16], 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0, 0]
        }
      }"
      @mouseover="onCursorSticky"
      @mouseleave="offCursorSticky"
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
          'circle-opacity':['case', ['boolean', ['feature-state', 'stop'], true], 1, 0.7],
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
      source-id="virtualLine"
      :source="{
        type: 'geojson',
        data: routeAnchorLine,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="virtualLine"
      :layer="{
        type: 'line',
        minzoom: 2,
        paint: {
          'line-color': $vuetify.theme.current.colors.linkssecondary,
          'line-width': 3,
          'line-dasharray':['literal', [0, 2, 4]],
        }
      }"
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
            :key="action.name"
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
