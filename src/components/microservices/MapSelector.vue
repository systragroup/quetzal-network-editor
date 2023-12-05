<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox3'
import NodesLayer from './NodesLayer.vue'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import Point from 'turf-point'
import Linestring from 'turf-linestring'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { ref, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { cloneDeep } from 'lodash'
import geojson from '@constants/geojson'

import short from 'short-uuid'
const $gettext = s => s
const key = import.meta.env.VITE_MAPBOX_PUBLIC_KEY

export default {
  name: 'MapSelector',
  events: ['change'],
  components: {
    MglMap,
    MglNavigationControl,
    MglScaleControl,
    MglGeojsonLayer,
    NodesLayer,
  },

  setup () {
    const store = useIndexStore()
    const rlinksStore = userLinksStore()

    const mapboxPublicKey = key
    const mapIsLoaded = ref(false)
    const poly = ref(null)
    const nodes = ref({})
    const header = geojson
    const freeForm = ref(false)

    const mapStyle = computed(() => { return store.mapStyle })
    const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })

    return {
      store,
      mapIsLoaded,
      mapboxPublicKey,
      poly,
      nodes,
      header,
      freeForm,
      mapStyle,
      rlinksIsEmpty,
    }
  },

  watch: {
    mapStyle () {
      try {
        this.map.removeLayer('stroke')
      } catch (err) {}
    },
  },

  beforeDestroy () {
    // remove stroke layer as it use the polygon layer data.
    const center = this.map?.getCenter()
    if (center) {
      this.store.saveMapPosition({
        mapCenter: [center.lng, center.lat],
        mapZoom: this.map.getZoom(),
      })
    }
    this.storesaveImportPoly({ freeForm: this.freeForm, poly: this.poly })
    try {
      this.map.removeLayer('stroke')
    } catch (err) {}
  },

  methods: {

    onMapLoaded (event) {
      event.map.dragRotate.disable()
      this.map = event.map
      this.map.on('dragend', this.getBounds)
      this.map.on('zoomend', this.getBounds)
      this.freeForm = false
      if (this.store.importPoly?.freeForm) {
        this.poly = this.store.importPoly.poly
        this.toggleFreeForm()
      } else {
        this.getBounds()
      }

      this.mapIsLoaded = true
    },
    getBounds () {
      const mapbbox = this.map.getBounds()
      const bbox = bboxPolygon([mapbbox._sw.lng, mapbbox._sw.lat, mapbbox._ne.lng, mapbbox._ne.lat])
      this.poly = buffer(bbox, -0.1 * (mapbbox._ne.lat - mapbbox._sw.lat), { units: 'degrees' })
      this.poly.geometry.coordinates[0] = this.poly.geometry.coordinates[0].reverse()
      const geom = [mapbbox._sw.lat, mapbbox._sw.lng, mapbbox._ne.lat, mapbbox._ne.lng]
      this.$emit('change', { style: 'bbox', geometry: geom })
    },
    toggleFreeForm (val) {
      this.freeForm = !this.freeForm
      if (this.freeForm) {
        this.map.off('dragend', this.getBounds)
        this.map.off('zoomend', this.getBounds)
        this.getNodes()
        this.store.changeNotification(
          { text: $gettext('Click to add points. Right click de remove'), autoClose: false })
      } else {
        this.map.on('dragend', this.getBounds)
        this.map.on('zoomend', this.getBounds)
        this.getBounds()
        this.store.changeNotification(
          { text: '', autoClose: true })
      }
    },
    onHover () {
      if (this.freeForm) {
        this.map.getCanvas().style.cursor = 'pointer'
      }
    },
    offHover () {
      if (this.freeForm) {
        this.map.getCanvas().style.cursor = ''
      }
    },

    getNodes () {
      const nodes = cloneDeep(geojson)
      const poly = this.poly.geometry.coordinates[0]
      // create points from poly. skip last one which is duplicated of the first one (square is 5 points)
      poly.slice(0, poly.length - 1).forEach(
        (point, idx) => nodes.features.push(Point(point, { index: short.generate(), coordinatesIndex: idx })),
      )
      this.nodes = nodes
      this.$emit('change', { style: 'poly', geometry: this.poly.geometry.coordinates[0] })
    },
    moveNode (event) {
      const idx = event.selectedFeature.properties.coordinatesIndex
      const poly = this.poly.geometry.coordinates[0]
      poly[idx] = event.lngLat
      if (idx === 0) {
        // last point is duplicated to first one (square have 5 points)
        poly[poly.length - 1] = event.lngLat
      }
      this.getNodes()
    },
    removeNode (event) {
      const idx = event.selectedFeature.properties.coordinatesIndex
      const poly = this.poly.geometry.coordinates[0]
      if (poly.length <= 4) {
        this.store.changeNotification(
          { text: $gettext('Cannot delete anymore'), autoClose: true })
      } else if (idx === 0) {
        this.store.changeNotification(
          { text: $gettext('cannot delete first point of polygon'), autoClose: true })
      } else {
        this.poly.geometry.coordinates[0] = [...poly.slice(0, idx), ...poly.slice(idx + 1)]
        this.getNodes()
      }
    },
    addNode (event) {
      if (this.freeForm && Object.keys(event).includes('mapboxEvent')) {
        const poly = this.poly.geometry.coordinates[0]
        const lngLat = event.mapboxEvent.lngLat
        const linkGeom = Linestring(poly)
        const clickedPoint = Point(Object.values(lngLat))
        const snapped = nearestPointOnLine(linkGeom, clickedPoint, { units: 'kilometers' })
        // for multiString, gives the index of the closest one, add +1 for the slice.
        const sliceIndex = snapped.properties.index + 1
        poly.splice(sliceIndex, 0, Object.values(lngLat))
        this.getNodes()
      }
    },
  },

}
</script>
<template>
  <MglMap
    :key="mapStyle"
    class="map"
    :center="store.mapCenter"
    :zoom="store.mapZoom"
    :min-zoom="3"
    :access-token="mapboxPublicKey"
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
      @rightClick="removeNode"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}

</style>
