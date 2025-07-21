<script setup lang="ts">
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox3'
import NodesLayer from './NodesLayer.vue'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import { lineString, point as Point } from '@turf/helpers'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useMapStore } from '../../store/map'
import { cloneDeep } from 'lodash'
import geojson from '@constants/geojson'

import short from 'short-uuid'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const emits = defineEmits<{
  change: [polygon: PolygonFeatures]
}>()

const store = useIndexStore()
const mapStore = useMapStore()
const map = ref()
const mapIsLoaded = ref(false)
const poly = ref<PolygonFeatures>(basePolygonFeature())
const nodes = ref({})
const header = geojson
const freeForm = ref(false)

const mapStyle = computed(() => { return mapStore.mapStyle })

onBeforeUnmount(() => {
  // remove stroke layer as it use the polygon layer data.
  const center = map.value?.getCenter()
  if (center) {
    mapStore.saveMapPosition({
      mapCenter: [center.lng, center.lat],
      mapZoom: map.value.getZoom(),
    })
  }
  store.saveImportPoly({ freeForm: freeForm.value, poly: poly.value })
  try {
    map.value.removeLayer('stroke')
  } catch (err) {}
})

watch(mapStyle, () => {
  try {
    map.value.removeLayer('stroke')
  } catch (err) {}
})

function onMapLoaded (event: any) {
  event.map.dragRotate.disable()
  map.value = event.map
  map.value.on('dragend', getBounds)
  map.value.on('zoomend', getBounds)
  freeForm.value = false
  if (store.importPoly?.freeForm) {
    poly.value = store.importPoly.poly
    toggleFreeForm()
  } else {
    getBounds()
  }

  mapIsLoaded.value = true
}

function getBounds () {
  const mapbbox = map.value.getBounds()
  const bbox = bboxPolygon([mapbbox._sw.lng, mapbbox._sw.lat, mapbbox._ne.lng, mapbbox._ne.lat])
  poly.value = buffer(bbox, -0.1 * (mapbbox._ne.lat - mapbbox._sw.lat), { units: 'degrees' })
  poly.value.geometry.coordinates[0] = poly.value.geometry.coordinates[0].reverse()
  emits('change', poly.value)
}

function toggleFreeForm () {
  freeForm.value = !freeForm.value
  if (freeForm.value) {
    map.value.off('dragend', getBounds)
    map.value.off('zoomend', getBounds)
    getNodes()
    store.changeNotification(
      { text: $gettext('Click to add points. Right click de remove'), autoClose: false })
  } else {
    map.value.on('dragend', getBounds)
    map.value.on('zoomend', getBounds)
    getBounds()
    store.changeNotification(
      { text: '', autoClose: true })
  }
}

function onHover () {
  if (freeForm.value) {
    map.value.getCanvas().style.cursor = 'pointer'
  }
}

function offHover () {
  if (freeForm.value) {
    map.value.getCanvas().style.cursor = ''
  }
}

function getNodes () {
  const tempNodes = basePoint()
  const polygon = poly.value.geometry.coordinates[0]
  // create points from poly. skip last one which is duplicated of the first one (square is 5 points)
  polygon.slice(0, polygon.length - 1).forEach(
    (pt, idx) => tempNodes.features.push(Point(pt, { index: short.generate(), coordinatesIndex: idx })),
  )
  nodes.value = tempNodes
  emits('change', poly.value)
}

interface NodeEvent {
  selectedFeature: GeoJsonFeatures
  lngLat: number[]
}

function moveNode (event: NodeEvent) {
  const idx = event.selectedFeature.properties.coordinatesIndex
  const polygon = poly.value.geometry.coordinates[0]
  polygon[idx] = event.lngLat
  if (idx === 0) {
    // last point is duplicated to first one (square have 5 points)
    polygon[polygon.length - 1] = event.lngLat
  }
  getNodes()
}

function removeNode (event: NodeEvent) {
  const idx = event.selectedFeature.properties.coordinatesIndex
  const polygon = poly.value.geometry.coordinates[0]
  if (polygon.length <= 4) {
    store.changeNotification(
      { text: $gettext('Cannot delete anymore'), autoClose: true })
  } else if (idx === 0) {
    store.changeNotification(
      { text: $gettext('cannot delete first point of polygon'), autoClose: true })
  } else {
    poly.value.geometry.coordinates[0] = [...polygon.slice(0, idx), ...polygon.slice(idx + 1)]
    getNodes()
  }
}

import { MapMouseEvent } from 'mapbox-gl'
interface MapboxClickEvent {
  selectedFeature: any
  mapboxEvent: MapMouseEvent
  lngLat: any
}

function addNode (event: MapboxClickEvent) {
  if (freeForm.value && Object.keys(event).includes('mapboxEvent')) {
    const polygon = poly.value.geometry.coordinates[0]
    const lngLat = event.mapboxEvent.lngLat
    const linkGeom = lineString(polygon)
    const clickedPoint = Point(Object.values(lngLat))
    const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
    // for multiString, gives the index of the closest one, add +1 for the slice.
    const sliceIndex = snapped.properties.index ? snapped.properties.index + 1 : 1
    polygon.splice(sliceIndex, 0, Object.values(lngLat))
    getNodes()
  }
}

// Loading and uploading a geojson
import { readFileAsText } from '@src/utils/io'
import { serializer } from '@src/utils/serializer'
import saveAs from 'file-saver'
import { basePoint, basePolygon, basePolygonFeature,
  GeoJson, GeoJsonFeatures, PolygonFeatures, PolygonGeoJson } from '@src/types/geojson'

function downloadPoly() {
  const val = basePolygon()
  val.features = [cloneDeep(poly.value)]
  val.features[0].properties = { index: '1' }
  const blob = new Blob([JSON.stringify(val)], { type: 'application/json' })
  saveAs(blob, 'polygon.geojson')
}

const fileInput = ref()
function uploadPoly() {
  fileInput.value.click()
  fileInput.value.value = '' // clean it for next file
}
async function readGeojson(event: Event) {
  try {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return
    const file = input.files[0]
    const data = await readFileAsText(file)
    const parsed = JSON.parse(data as string) as GeoJson
    const serialized = serializer(parsed, file.name, 'Polygon') as PolygonGeoJson
    poly.value = serialized.features[0]
    toggleFreeForm()
  } catch (err) {
    store.changeAlert(err)
  }
}

</script>
<template>
  <MglMap
    :key="mapStyle"
    class="map"
    :center="mapStore.mapCenter"
    :zoom="mapStore.mapZoom"
    :min-zoom="3"
    :access-token="mapStore.key"
    :map-style="mapStyle"
    @load="onMapLoaded"
    @click="addNode"
  >
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />
    <v-btn
      class="freeform-button"
      size="small"
      :icon=" freeForm? 'far fa-square':'fas fa-vector-square'"
      @click="toggleFreeForm"
    />
    <input
      id="file-input"
      ref="fileInput"
      type="file"
      style="display: none"
      accept=".geojson"
      @change="readGeojson"
    >
    <v-tooltip
      location="top"
      open-delay="250"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          class="download-button"
          size="small"
          v-bind="props"
          :icon=" freeForm? 'fas fa-download':'fas fa-upload'"
          @click="freeForm? downloadPoly(): uploadPoly()"
        />
      </template>
      <span>{{ freeForm? $gettext('Download polygon') : $gettext('Upload a polygon') }}</span>
    </v-tooltip>

    <MglGeojsonLayer
      source-id="polygon"
      :source="{
        type: 'geojson',
        data: poly,
        promoteId: 'index',
      }"
      layer-id="poly"
      :layer="{
        interactive: true,
        type: 'fill',
        'paint': {
          'fill-color': $vuetify.theme.current.colors.linksprimary, // blue color fill
          'fill-opacity': 0.3,

        },
      }"
      @mouseover="onHover"
      @mouseleave="offHover"
    />

    <MglGeojsonLayer
      source-id="polygon"
      type="line"
      source="polygon"
      layer-id="stroke"
      :layer="{
        type: 'line',
        paint: {
          'line-color':$vuetify.theme.current.colors.linksprimary,
          'line-width':3
        }
      }"
    />
    <NodesLayer
      v-if="mapIsLoaded"
      :map="map"
      :nodes="freeForm? nodes: header"
      :active="freeForm"
      @move="moveNode"
      @right-click="removeNode"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
.download-button {
  position: absolute;
  top: 5px;
  left: 5px;
}

</style>
