<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import NodesLayer from './NodesLayer.vue'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import Point from 'turf-point'
import Linestring from 'turf-linestring'
import nearestPointOnLine from '@turf/nearest-point-on-line'
const short = require('short-uuid')
const $gettext = s => s

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

  data () {
    return {
      mapIsLoaded: false,
      mapboxPublicKey: process.env.VUE_APP_MAPBOX_PUBLIC_KEY,
      bbox: null,
      poly: null,
      nodes: {},
      freeForm: false,
    }
  },
  computed: {
    mapStyle () { return this.$store.getters.mapStyle },
    rlinksIsEmpty () { return this.$store.getters.rlinksIsEmpty },
    nodesHeader () { return this.$store.getters.nodesHeader },
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
    try {
      this.map.removeLayer('stroke')
    } catch (err) {}
  },

  async created () {},

  methods: {

    onMapLoaded (event) {
      event.map.dragRotate.disable()
      this.map = event.map
      this.map.on('dragend', this.getBounds)
      this.map.on('zoomend', this.getBounds)
      this.freeForm = false
      this.getBounds()

      this.mapIsLoaded = true
    },
    getBounds () {
      this.bbox = this.map.getBounds()
      const bbox = bboxPolygon([this.bbox._sw.lng, this.bbox._sw.lat, this.bbox._ne.lng, this.bbox._ne.lat])
      this.poly = buffer(bbox, -0.1 * (this.bbox._ne.lat - this.bbox._sw.lat), { units: 'degrees' })
      this.poly.geometry.coordinates[0] = this.poly.geometry.coordinates[0].reverse()
      const geom = [this.bbox._sw.lat, this.bbox._sw.lng, this.bbox._ne.lat, this.bbox._ne.lng]
      this.$emit('change', { style: 'bbox', geometry: geom })
    },
    toggleFreeForm (val) {
      this.freeForm = !this.freeForm
      if (this.freeForm) {
        this.map.off('dragend', this.getBounds)
        this.map.off('zoomend', this.getBounds)
        this.getNodes()
        this.$store.commit('changeNotification',
          { text: $gettext('Click to add points. Right click de remove'), autoClose: false })
      } else {
        this.map.on('dragend', this.getBounds)
        this.map.on('zoomend', this.getBounds)
        this.getBounds()
        this.$store.commit('changeNotification',
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
      const nodes = structuredClone(this.nodesHeader)
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
        this.$store.commit('changeNotification',
          { text: $gettext('Cannot delete anymore'), autoClose: true })
      } else if (idx === 0) {
        this.$store.commit('changeNotification',
          { text: $gettext('cannot delete first point of polygon'), autoClose: true })
      } else {
        this.poly.geometry.coordinates[0] = [...poly.slice(0, idx), ...poly.slice(idx + 1)]
        this.getNodes()
      }
    },
    addNode (event) {
      if (this.freeForm) {
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
    :min-zoom="3"
    :access-token="mapboxPublicKey"
    :map-style="mapStyle"
    @load="onMapLoaded"
    @click="addNode"
  >
    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />
    <template>
      <v-btn
        class="freeform-button"
        fab
        small
        @click="toggleFreeForm"
      >
        <v-icon
          color="regular"
        >
          {{ freeForm? 'far fa-square':'fas fa-vector-square' }}
        </v-icon>
      </v-btn>
    </template>

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
          'fill-color': $vuetify.theme.currentTheme.linksprimary, // blue color fill
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
          'line-color':$vuetify.theme.currentTheme.linksprimary,
          'line-width':3
        }
      }"
    />
    <NodesLayer
      v-if="mapIsLoaded"
      :map="map"
      :nodes="freeForm? nodes: nodesHeader"
      :active="freeForm"
      @move="moveNode"
      @rightClick="removeNode"
    />
  </MglMap>
</template>
<style lang="scss" scoped>

.map {
  max-width: 100rem;
  width:50rem;
  height: 45rem;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}

</style>
