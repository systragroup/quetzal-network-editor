<script setup>
import { MglGeojsonLayer } from 'vue-mapbox3'
import bboxPolygon from '@turf/bbox-polygon'
import geojson from '@constants/geojson'
import { onMounted, onUnmounted, toRefs, ref } from 'vue'

const props = defineProps(['map'])
const emits = defineEmits(['mousedown', 'mouseup', 'mousemove'])
const { map } = toRefs(props)
const poly = ref(null)
const p1 = ref(null)
const p2 = ref(null)

onMounted(() => {
  map.value.on('mousedown', startSelect)
})

onUnmounted(() => {
  map.value.off('mousedown', startSelect)
})

function startSelect (event) {
  // 0,1,2 left, wheel right
  if (event.originalEvent.button === 1) {
    event.preventDefault() // prevent map control
    p1.value = Object.values(event.lngLat)
    map.value.on('mousemove', onMove)
    map.value.on('mouseup', stopSelect)
    emits('mousedown', { mapboxEvent: event })
  }
}
function onMove (event) {
  p2.value = Object.values(event.lngLat)
  poly.value = bboxPolygon([p1.value[0], p1.value[1], p2.value[0], p2.value[1]])
  map.value.getSource('selectPolygon').setData(poly.value)
  emits('mousemove', { mapboxEvent: event, polygon: poly.value })
}
function stopSelect (event) {
  // stop tracking position (moving node.)
  map.value.getSource('selectPolygon').setData(geojson)
  map.value.getCanvas().style.cursor = 'pointer'
  map.value.off('mousemove', onMove)
  emits('mouseup', { mapboxEvent: event })
}

</script>
<template>
  <MglGeojsonLayer
    source-id="selectPolygon"
    :reactive="false"
    :source="{
      type: 'geojson',
      data: geojson,
    }"
    layer-id="poly"
    :layer="{
      type: 'fill',
      'paint': {
        'fill-color': $vuetify.theme.current.colors.linksprimary, // blue color fill
        'fill-opacity': 0.3,

      },
    }"
  />

  <MglGeojsonLayer
    source-id="selectPolygon"
    type="line"
    source="selectPolygon"
    layer-id="stroke"
    :layer="{
      type: 'line',
      paint: {
        'line-color':$vuetify.theme.current.colors.linksprimary,
        'line-width':3
      }
    }"
  />
</template>
<style lang="scss" scoped>

</style>
