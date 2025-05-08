<script setup>
import { MglGeojsonLayer } from 'vue-mapbox3'
import { polygon } from '@turf/helpers'
import geojson from '@constants/geojson'
import { onMounted, onUnmounted, toRefs, ref } from 'vue'

const props = defineProps(['map'])
const emits = defineEmits(['mousedown', 'mouseup', 'mousemove'])
const { map } = toRefs(props)
const poly = ref(null)
const bbox = ref(null)
const p1 = ref({ lnglat: null, point: null })
const p2 = ref({ lnglat: null, point: null })
const selectedId = ref(new Set())

onMounted(() => {
  map.value.on('mousedown', startSelect)
})

onUnmounted(() => {
  map.value.off('mousedown', startSelect)
})

function startSelect (event) {
  // 0,1,2 left, wheel right
  if (event.originalEvent.button === 2) {
    p1.value.lnglat = event.lngLat
    p1.value.point = event.point
    map.value.on('mousemove', onMove)
    map.value.on('mouseup', stopSelect)
    emits('mousedown', { mapboxEvent: event })
  }
}

function onMove (event) {
  p2.value.lnglat = event.lngLat
  p2.value.point = event.point
  // poly.value = bboxPolygon([p1.value.lnglat.lng, p1.value.lnglat.lat, p2.value.lnglat.lng, p2.value.lnglat.lat])
  const p3 = map.value.unproject([p2.value.point.x, p1.value.point.y])
  const p4 = map.value.unproject([p1.value.point.x, p2.value.point.y])
  poly.value = polygon([[
    [p1.value.lnglat.lng, p1.value.lnglat.lat],
    [p3.lng, p3.lat],
    [p2.value.lnglat.lng, p2.value.lnglat.lat],
    [p4.lng, p4.lat],
    [p1.value.lnglat.lng, p1.value.lnglat.lat]]])
  // poly.value.bbox = [p1.value.lnglat.lng, p1.value.lnglat.lat, p2.value.lnglat.lng, p2.value.lnglat.lat]
  map.value.getSource('selectPolygon').setData(poly.value)
  bbox.value = [Object.values(p1.value.point), Object.values(p2.value.point)]
  emits('mousemove', { mapboxEvent: event, polygon: poly.value, bbox: bbox.value })
}
function stopSelect (event) {
  // stop tracking position (moving node.)
  map.value.getSource('selectPolygon').setData(geojson)
  map.value.getCanvas().style.cursor = 'pointer'
  map.value.off('mousemove', onMove)
  map.value.off('mouseup', stopSelect)
  query()
  // only emit event if we draged (else it emit for a single click no drag.)
  if (poly.value) {
    emits('mouseup', { mapboxEvent: event, polygon: poly.value, selectedId: selectedId.value })
  }

  bbox.value = null
  poly.value = null
}

function query() {
  if (bbox.value) {
    const query = map.value.queryRenderedFeatures(bbox.value, {
      layers: ['rlinks'],
    })
    selectedId.value = new Set(query.map(el => el.id))
  } else {
    selectedId.value = new Set()
  }
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
