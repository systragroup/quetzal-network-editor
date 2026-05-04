<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, toRefs, ref, watch, toRaw } from 'vue'
import { Map, MapMouseEvent } from 'mapbox-gl'
import { useGettext } from 'vue3-gettext'
import { PointFeatures } from '@src/types/geojson'

const { $gettext } = useGettext()
interface Props {
  map: Map
  hoveredStateId: HoverState | null
  stickyStateId: HoverState | null
}

const props = defineProps<Props>()
const { map, hoveredStateId, stickyStateId } = toRefs(props)
const store = useIndexStore()

const linksStore = useLinksStore()
const editorNodes = computed(() => { return linksStore.editorNodes })
const isEditorMode = computed(() => linksStore.editorTrip !== null)

const anchorMode = computed(() => { return store.anchorMode })
const routingMode = computed(() => { return store.routingMode })

import { useRouting } from '@src/utils/routing/routing.js'
import { cloneDeep } from 'lodash'
import PromiseDialog from '../utils/PromiseDialog.vue'
const { routeLink } = useRouting()

// drawLink

import { useDrawLink } from '@src/composables/useDrawLink'
import { HoverState } from '@src/types/mapbox'

const { drawLink, updateDrawLink, stopDraw, showDraw } = useDrawLink(map.value)
const drawMode = ref(false)

watch(drawMode, (val) => val ? showDraw() : stopDraw())
// set drawmode to false on anchormode
watch(anchorMode, (val) => val ? drawMode.value = false : null)

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
    drawMode.value = false
  }
}

function setDrawLinkFirstPoint(point: PointFeatures | null) {
  if (point) {
    drawLink.value.geometry.coordinates[0] = toRaw(point.geometry.coordinates)
    drawLink.value.properties.nodeId = toRaw(point.properties.index)
    drawMode.value = true
  } else {
    drawMode.value = false
  }
}

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
  const selectedNodeId = drawLink.value.properties.nodeId as string
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
}

const stickyDialog = ref()

</script>
<template>
  <section>
    <PromiseDialog
      ref="stickyDialog"
    />
  </section>
</template>
<style lang="scss" scoped>

</style>
