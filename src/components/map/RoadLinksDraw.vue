<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { computed, toRefs, watch, toRaw, ref } from 'vue'
import { Map, MapMouseEvent } from 'mapbox-gl'
import { PointFeatures } from '@src/types/geojson'
// import { useGettext } from 'vue3-gettext'

// const { $gettext } = useGettext()
interface Props {
  map: Map
  hoveredStateId: HoverStateRoad | null
}

const props = defineProps<Props>()
const { map, hoveredStateId } = toRefs(props)
const drawMode = defineModel<boolean>({ default: false })

const store = useIndexStore()

const rlinksStore = userLinksStore()
const isRoadMode = computed(() => rlinksStore.editionMode)
const anchorMode = computed(() => { return store.anchorMode })

// drawLink

import { useDrawLink } from '@src/composables/useDrawLink'
import { HoverStateRoad } from '@src/types/mapbox'

const { drawLink, updateDrawLink, stopDraw, showDraw } = useDrawLink(map.value, 'drawrlink')

const connectedDrawLink = ref(false)

watch(drawMode, (val) => val ? showDraw() : stopDraw())
// set drawmode to false on anchormode
watch(anchorMode, (val) => val ? drawMode.value = false : null)

watch(isRoadMode, (val) => {
  if (val) {
    map.value.on('click', addPoint)
    map.value.on('mousemove', draw)
    map.value.on('mousedown', clickStopDraw)
  }
  else {
    map.value.off('mousemove', draw)
    map.value.off('mousedown', clickStopDraw)
    map.value.off('click', addPoint)
    drawMode.value = false
  }
})

function draw (event: MapMouseEvent) {
  if (!connectedDrawLink.value) {
    if (drawMode.value) {
      updateDrawLink(event)
    }
  }
}

function clickStopDraw (event: MapMouseEvent) {
  // remove drawmode when we right click on map
  if (event.originalEvent.button === 2 && !hoveredStateId.value) {
    drawMode.value = false
  }
}

function setDrawLinkFirstPoint(point: PointFeatures) {
  drawLink.value.geometry.coordinates[0] = toRaw(point.geometry.coordinates)
  drawLink.value.properties.nodeId = toRaw(point.properties.index)
  drawMode.value = true
}

function offHover () {
  // put back visible draw line
  if (drawMode.value) {
    connectedDrawLink.value = false
  }
}

function onHover(hovering: HoverStateRoad) {
  if (hovering.layerId === 'rnodes') {
    if (drawMode.value) {
      connectedDrawLink.value = true
    } else if (!anchorMode.value) {
      setDrawLinkFirstPoint(hovering.features[0] as PointFeatures)
      connectedDrawLink.value = false
    }
  }
}

watch(hoveredStateId, (val) => {
  if (val) {
    onHover(val)
  } else {
    offHover()
  }
})

function addPoint (event: MapMouseEvent) {
  // for a new Line
  if (!drawMode.value) return
  if (anchorMode.value) return
  event.originalEvent.stopPropagation()
  const pointGeom = Object.values(event.lngLat)
  const selectedNodeId = drawLink.value.properties.nodeId as string
  const hoveringLayer = hoveredStateId.value?.layerId
  const hoveringId = hoveredStateId.value?.id
  let payload
  if (hoveringLayer === 'rlinks') {
    payload = {
      nodeIdA: selectedNodeId,
      linksId: toRaw(hoveringId), // could be null, a node or a link.
      geom: pointGeom,
    }
  } else if (hoveringLayer === 'rnodes') {
    payload = {
      nodeIdA: selectedNodeId,
      nodeIdB: hoveringId![0], // could be null, a node or a link.
      geom: pointGeom,
    }
  } else {
    payload = {
      nodeIdA: selectedNodeId,
      geom: pointGeom,
    }
  }

  const newNode = rlinksStore.createLink(payload)
  setDrawLinkFirstPoint(newNode)
  // then, create a hover (and off hover) to the new node b to continue drawing
  // onHoverRoad({ layerId: 'rnodes', selectedId: [toHover] })
  // offHover()
}

</script>
<template>
  <section />
</template>
<style lang="scss" scoped>

</style>
