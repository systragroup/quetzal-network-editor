<script setup lang="ts">
import { MglPopup, MglImageLayer, MglGeojsonLayer } from 'vue-mapbox3'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, toRefs, ref, watch, onMounted, onUnmounted, toRaw } from 'vue'
import { Map, GeoJSONSource, MapMouseEvent } from 'mapbox-gl'
import { useGettext } from 'vue3-gettext'
import { baseLineString, basePoint, createLinestringFeature, GeoJsonFeatures
  , LineStringFeatures, LineStringGeoJson, PointFeatures, PointGeoJson } from '@src/types/geojson'
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
const { map } = toRefs(props)
const store = useIndexStore()

const linksStore = useLinksStore()
const editorLinks = computed(() => { return linksStore.editorLinks })
const editorNodes = computed(() => { return linksStore.editorNodes })

const stickyMode = computed(() => { return store.stickyMode })
const showedTrips = computed(() => { return linksStore.selectedTrips })
const isEditorMode = computed(() => linksStore.editorTrip !== null)

const visibleNodes = computed(() => { return stickyMode.value ? linksStore.visibleNodes : basePoint() })

onMounted(() => setSourceData('stickyNodes', visibleNodes.value))
watch(stickyMode, () => setSourceData('stickyNodes', visibleNodes.value))
watch(showedTrips, () => setSourceData('stickyNodes', visibleNodes.value))

const anchorMode = computed(() => { return store.anchorMode })
const routingMode = computed(() => { return store.routingMode })

import { useRouting } from '@src/utils/routing/routing.js'
import { cloneDeep } from 'lodash'
import PromiseDialog from '../utils/PromiseDialog.vue'
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

// drawLink

import { useDrawLink } from '@src/composables/useDrawLink'

const { drawLink, drawMode, updateDrawLink, stopDraw } = useDrawLink(map.value)

watch(isEditorMode, (val) => {
  if (val) {
    map.value.on('mousemove', draw)
    map.value.on('mousedown', clickStopDraw)
    map.value.on('click', addPoint)
  }
  else {
    map.value.off('mousemove', draw)
    map.value.off('mousedown', clickStopDraw)
    map.value.off('click', addPoint)
  }
}, { immediate: true })

function draw (event: MapMouseEvent) {
  if (drawMode.value && !anchorMode.value) {
    updateDrawLink(event)
  }
}

function clickStopDraw (event: MapMouseEvent) {
  // remove drawmode when we right click on map
  if (event.originalEvent.button === 2 && !hoveredStateId.value) {
    stopDraw()
  }
}

function setDrawLinkFirstPoint(point: PointFeatures | null) {
  const feature = drawLink.value.features[0]
  if (point) {
    feature.geometry.coordinates[0] = toRaw(point.geometry.coordinates)
    feature.properties.nodeId = toRaw(point.properties.index)
    drawMode.value = true
  } else {
    feature.geometry.coordinates[0] = [0, 0]
    feature.properties.nodeId = null
    drawMode.value = false
  }
}

const firstNodeId = computed(() => { return linksStore.firstNodeId })
const lastNodeId = computed(() => { return linksStore.lastNodeId })

const firstNode = computed(() =>
  editorNodes.value.features.filter((node) => node.properties.index === firstNodeId.value)[0],
)
const lastNode = computed(() =>
  editorNodes.value.features.filter((node) => node.properties.index === lastNodeId.value)[0],
)

// when the first or last node change (delete or new) change the value of those nodes.
watch(firstNode, (val) => setDrawLinkFirstPoint(val), { deep: true })
watch(lastNode, (val) => setDrawLinkFirstPoint(val), { deep: true })

function addPoint (event: MapMouseEvent) {
  // for a new Line
  event.originalEvent.stopPropagation()
  if (editorNodes.value.features.length === 0) {
    linksStore.createNewNode(Object.values(event.lngLat))
    store.changeNotification({ text: '', autoClose: true })
  } else if (drawMode.value) {
    addPointPT(event)
  }
}

async function addPointPT(event: MapMouseEvent) {
  const selectedNodeId = drawLink.value.features[0].properties.nodeId as string
  const action = (selectedNodeId === linksStore.lastNodeId)
    ? 'Extend Line Upward'
    : 'Extend Line Downward'
  const pointGeom = Object.values(event.lngLat)
  if (drawMode.value && !anchorMode.value && !hoveredStateId.value) {
    if (stickyStateId.value) {
      const stickyNodeId = cloneDeep(stickyStateId.value?.featureId)
      const nodesList = new Set(editorNodes.value.features.map(node => node.properties.index))
      if (!nodesList.has(stickyNodeId)) { // cannot reuse same node
        const resp = await stickyDialog.value.openDialog(
          $gettext('Replace %{node} with %{b}?', { node: selectedNodeId, b: stickyNodeId }))
        if (resp) { linksStore.addNewLink({ geom: pointGeom, action: action, stickyNodeId: stickyNodeId }) }
      } else {
        store.changeNotification(
          { text: $gettext('Node already in use by the trip. Cannot replace'), autoClose: true, color: 'error' })
      }
    } else {
      linksStore.addNewLink({ geom: pointGeom, action: action })
    }
  }
  if (routingMode.value) {
    const newLinkFeature = action === 'Extend Line Upward'
      ? linksStore.editorLinks.features.slice(-1)[0]
      : linksStore.editorLinks.features[0]
    routeLink(newLinkFeature)
  }
  linksStore.commitChanges(action)
}

const stickyDialog = ref()

// TODO: updateLink like roadLinks
watch(editorLinks, (links) => {
  // update map when change on editorLinks.
  setSourceData('editorLinks', links)
  setNodesPickupDropOff()
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

const selectedFeature = ref<GeoJsonFeatures | null>(null)

// clicks

function selectClick (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  // Get the highlighted feature
  selectedFeature.value = hoveredStateId.value.feature
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
  }
}

function contextMenuNode (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  if (popupEditor.value.showed && hoveredStateId.value.layerId === 'editorNodes') {
    contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng,
      event.mapboxEvent.lngLat.lat,
    ]
    contextMenu.value.showed = true

    contextMenu.value.type = 'node'
    contextMenu.value.feature = hoveredStateId.value.feature

    const selectedNode = contextMenu.value.feature.properties.index

    if (editorLinks.value.features.length <= 1) {
      contextMenu.value.actions
          = [
          { name: 'Edit Node Info', text: $gettext('Edit Node Info') },
        ]
    } else if ((selectedNode === linksStore.firstNodeId) || (selectedNode === linksStore.lastNodeId)) {
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
  if (!hoveredStateId.value) return
  if (hoveredStateId.value.layerId === 'anchorNodes') {
    selectedFeature.value = hoveredStateId.value.feature
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
    selectedFeature.value = hoveredStateId.value.feature
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

const hoveredStateId = ref<HoverState | null>(null)

watch(hoveredStateId, (newVal, oldVal) => {
  if (oldVal) {
    map.value.setFeatureState({ source: oldVal.layerId, id: oldVal.featureId }, { hover: false })
    map.value.getCanvas().style.cursor = ''
    popupEditor.value.showed = false
  } if (newVal) {
    map.value.setFeatureState({ source: newVal.layerId, id: newVal.featureId }, { hover: true })
    map.value.getCanvas().style.cursor = 'pointer'
  }
})

watch(hoveredStateId, (val) => {
  if (val) {
    if (val.featureId == firstNodeId.value) {
      setDrawLinkFirstPoint(firstNode.value)
    }
    if (val.featureId == lastNodeId.value) {
      setDrawLinkFirstPoint(lastNode.value)
    }
  }
})

function onCursor (event: CustomMapEvent) {
  // if hover is null or if hover is editorlinks. this make hoveing more natural and avoid collision from node to links
  if (!event.mapboxEvent.features) return
  if (!hoveredStateId.value || hoveredStateId.value.layerId === 'editorLinks') {
    const feature = event.mapboxEvent.features[0] as GeoJsonFeatures
    const index = feature.properties.index
    const layerId = event.layerId
    hoveredStateId.value = { layerId: layerId, featureId: index, feature: feature }
    setPopup([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
  }
}
function offCursor (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  // help to keep node hovering when we slightly move (colistion with links under)
  if ((['editorNodes', 'anchorNodes'].includes(hoveredStateId.value.layerId) && event.layerId === 'editorLinks')) return
  hoveredStateId.value = null
}

// stickynode hovering

const stickyStateId = ref<HoverState | null>(null)
const isSticking = computed(() => stickyStateId.value !== null && hoveredStateId.value !== null)

watch(stickyStateId, (newVal, oldVal) => {
  if (oldVal) {
    map.value.setFeatureState({ source: oldVal.layerId, id: oldVal.featureId }, { hover: false })
  } if (newVal) {
    map.value.setFeatureState({ source: newVal.layerId, id: newVal.featureId }, { hover: true })
  }
})

function onCursorSticky(event: CustomMapEvent) {
  const features = event.mapboxEvent.features
  if (!features) return
  const selected = features[0] as PointFeatures
  const selectedId = selected.properties.index
  stickyStateId.value = { layerId: event.layerId, featureId: selectedId, feature: selected }
}

function offCursorSticky () {
  if (stickyStateId.value) {
    stickyStateId.value = null
  }
}

// moving

function stopMoving() {
  // remove temp linestring
  movingLine.value = baseLineString()
  // stop tracking position (moving node.)
  map.value.getCanvas().style.cursor = 'pointer'
  // enable popup and hovering off back. disable Dragmode
  disablePopup.value = false
  hoveredStateId.value = null
}

function startMoving(event: CustomMapEvent) {
  // disable popup
  disablePopup.value = true
  popupEditor.value.showed = false
  // prevent map control
  event.mapboxEvent.preventDefault()
  map.value.getCanvas().style.cursor = 'grab'
  // disable mouseLeave so we stay in hover state.
}

const movingLine = ref<LineStringGeoJson>(baseLineString())

// moving node

function moveNode (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  if (hoveredStateId.value.layerId !== 'editorNodes') return
  if (event.mapboxEvent.originalEvent.button !== 0) return
  // get selected node
  const selected = hoveredStateId.value.feature
  if (!selected) return //  sometime its undefined...
  selectedFeature.value = selected

  const nodeIndex = selectedFeature.value.properties.index
  const first = cloneDeep(editorLinks.value.features.filter(link => link.properties.b === nodeIndex)[0])
  const last = cloneDeep(editorLinks.value.features.filter(link => link.properties.a === nodeIndex)[0])
  let geometry = []
  if (first && last) {
    geometry = [...first.geometry.coordinates.slice(-2), last.geometry.coordinates[1]]
  } else if (first) {
    geometry = [...first.geometry.coordinates.slice(-2)]
  } else {
    geometry = [...last.geometry.coordinates.slice(0, 2).toReversed()]
  }
  // eslint-disable-next-line max-len
  // const geometry = [...first.geometry.coordinates.slice(-2), last.geometry.coordinates[1]]
  movingLine.value.features = [createLinestringFeature(geometry)]
  startMoving(event)
  // get position
  map.value.on('mousemove', onMove)
  map.value.on('mouseup', stopMovingNode)
}

function onMove (event: MapMouseEvent) {
  movingLine.value.features[0].geometry.coordinates[1] = Object.values(event.lngLat)
}

async function stopMovingNode () {
  const selected = selectedFeature.value!
  let modifiedLinks: LineStringFeatures[] = []
  // if sticky. replace node with existing one
  if (stickyStateId.value) {
    const stickyNodeId = cloneDeep(stickyStateId.value.featureId)
    const nodesList = new Set(editorNodes.value.features.map(node => node.properties.index))
    if (!nodesList.has(stickyNodeId)) {
      const resp = await stickyDialog.value.openDialog(
        $gettext('Replace %{node} with %{b}?', { node: selected.properties.index, b: stickyNodeId }))
      if (resp) {
        modifiedLinks = linksStore.applyStickyNode({ selectedNode: selected, stickyNodeId: stickyNodeId })
      }
    } else {
      store.changeNotification(
        { text: $gettext('Node already in use by the trip. Cannot replace'), autoClose: true, color: 'error' })
    }
  } else { //  just move the node (not sticky)
    const geom = movingLine.value.features[0].geometry.coordinates[1]
    modifiedLinks = linksStore.moveNode({ selectedNode: selected, lngLat: toRaw(geom) })
  }

  if (routingMode.value) {
    modifiedLinks.forEach(link => routeLink(link))
  }

  stopMoving()
  map.value.off('mousemove', onMove)
  map.value.off('mouseup', stopMovingNode)
  linksStore.commitChanges('move node')
}

// moving anchor

function moveAnchorOrRoutingAnchor (event: CustomMapEvent) {
  if (routingMode.value) {
    moveRoutingAnchor(event)
  } else {
    moveAnchor(event)
  }
}

function moveAnchor (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  if (hoveredStateId.value.layerId !== 'anchorNodes') return
  if (event.mapboxEvent.originalEvent.button !== 0) return
  // get selected node
  const selected = hoveredStateId.value.feature
  if (!selected) return //  sometime its undefined...
  selectedFeature.value = selected

  const linkIndex = selectedFeature.value.properties.linkIndex
  const link = cloneDeep(editorLinks.value.features.filter(link => link.properties.index === linkIndex)[0])
  movingLine.value.features = [createLinestringFeature(link.geometry.coordinates)]

  startMoving(event)
  // get position
  map.value.on('mousemove', onMoveAnchor)
  map.value.on('mouseup', stopMovingNodeAnchor)
}

function onMoveAnchor (event: MapMouseEvent) {
  const index = selectedFeature.value?.properties.coordinatedIndex
  movingLine.value.features[0].geometry.coordinates[index] = Object.values(event.lngLat)
}

function stopMovingNodeAnchor () {
  const selected = selectedFeature.value!
  const index = selected.properties.coordinatedIndex

  const geom = movingLine.value.features[0].geometry.coordinates[index]
  const modifiedLinks = linksStore.moveAnchor({ selectedNode: selected, lngLat: toRaw(geom) })

  if (routingMode.value) { routeLink(modifiedLinks) }
  stopMoving()
  map.value.off('mousemove', onMoveAnchor)
  map.value.off('mouseup', stopMovingNodeAnchor)
  linksStore.commitChanges('move Anchor')
}

// routeAnchor

function moveRoutingAnchor (event: CustomMapEvent) {
  if (!hoveredStateId.value) return
  if (hoveredStateId.value.layerId !== 'anchorNodes') return
  if (event.mapboxEvent.originalEvent.button !== 0) return

  const selected = hoveredStateId.value.feature
  if (!selected) return //  sometime its undefined...
  selectedFeature.value = selected
  movingLine.value = cloneDeep(routeAnchorLine.value)
  startMoving(event)
  // get position
  map.value.on('mousemove', onMoveRouteAnchor)
  map.value.on('mouseup', stopMovingRouteAnchor)
}

function onMoveRouteAnchor (event: MapMouseEvent) {
  const index = selectedFeature.value?.properties.lineIndex
  movingLine.value.features[0].geometry.coordinates[index] = Object.values(event.lngLat)
}

function stopMovingRouteAnchor () {
  const selected = selectedFeature.value!
  const index = selected.properties.lineIndex
  const geom = movingLine.value.features[0].geometry.coordinates[index]
  const modifiedLinks = linksStore.moveRoutingAnchor({ selectedNode: selected, lngLat: toRaw(geom) })
  if (routingMode.value) {
    routeLink(modifiedLinks)
  }

  stopMoving()
  map.value.off('mousemove', onMoveRouteAnchor)
  map.value.off('mouseup', stopMovingRouteAnchor)
  linksStore.commitChanges('move Routing Anchor')
}

</script>
<template>
  <section>
    <PromiseDialog
      ref="stickyDialog"
    />
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
      @mousedown="moveAnchorOrRoutingAnchor"
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
    <MglGeojsonLayer
      source-id="movingLine"
      :source="{
        type: 'geojson',
        data: movingLine,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="movingLine"
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
