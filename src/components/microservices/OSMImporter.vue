<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import NodesLayer from './NodesLayer.vue'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import auth from '@src/auth.js'
import Point from 'turf-point'
import Linestring from 'turf-linestring'
import nearestPointOnLine from '@turf/nearest-point-on-line'
const short = require('short-uuid')
const $gettext = s => s

export default {
  name: 'OSMImporter',
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
      showOverwriteDialog: false,
      bbox: null,
      poly: null,
      nodes: {},
      freeForm: false,
      selectedHighway: null,
      highwayList: [
        'motorway',
        'motorway_link',
        'trunk',
        'trunk_link',
        'primary',
        'primary_link',
        'secondary',
        'secondary_link',
        'tertiary',
        'tertiary_link',
        'residential',
        'service',
        'unclassified',
        'cycleway',
      ],
      isUserSignedIn: auth.auth.isUserSignedIn(),
      colorDict: {
        motorway: 'E892A2',
        motorway_link: 'E892A2',
        trunk: 'E892A2',
        trunk_link: 'E892A2',
        primary: 'FCD6A4',
        primary_link: 'FCD6A4',
        secondary: 'F7F9BE',
        secondary_link: 'F7F9BE',
        tertiary: '808080',
        tertiary_link: '808080',
        residential: '808080',
        service: '808080',
        unclassified: '808080',
        cycleway: '1D8621',
      },
      widthDict: {
        motorway: 4,
        motorway_link: 4,
        trunk: 4,
        trunk_link: 4,
        primary: 4,
        primary_link: 4,
        secondary: 3,
        secondary_link: 3,
        tertiary: 2,
        tertiary_link: 2,
        residential: 2,
        service: 2,
        unclassified: 2,
        cycleway: 2,
      },
    }
  },
  computed: {
    mapStyle () { return this.$store.getters.mapStyle },
    rlinksIsEmpty () { return this.$store.getters.rlinksIsEmpty },
    nodesHeader () { return this.$store.getters.nodesHeader },
    highway () { return this.$store.getters['runOSM/highway'] },
    bucket () { return this.$store.getters['runOSM/bucket'] },
    callID () { return this.$store.getters['runOSM/callID'] },
    importStatus () { return this.$store.getters['runOSM/status'] },
    running () { return this.$store.getters['runOSM/running'] },
    error () { return this.$store.getters['runOSM/error'] },
    errorMessage () { return this.$store.getters['runOSM/errorMessage'] },
  },
  watch: {
    mapStyle () {
      try {
        this.map.removeLayer('stroke')
      } catch (err) {}
    },
    selectedHighway (val) { this.$store.commit('runOSM/changeHighway', val) },
  },

  beforeDestroy () {
    // remove stroke layer as it use the polygon layer data.
    try {
      this.map.removeLayer('stroke')
    } catch (err) {}
  },

  created () {
    this.selectedHighway = this.highway
  },
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

    importOSM () {
      if (this.rlinksIsEmpty) {
        this.$store.commit('runOSM/setCallID')
        if (this.freeForm) {
          const poly = this.poly.geometry.coordinates[0]
          this.$store.dispatch('runOSM/startExecution', { coords: poly, method: 'poly' })
        } else {
          const bbox = [this.bbox._sw.lat, this.bbox._sw.lng, this.bbox._ne.lat, this.bbox._ne.lng]
          this.$store.dispatch('runOSM/startExecution', { coords: bbox, method: 'bbox' })
        }
      } else {
        this.showOverwriteDialog = true
      }
    },

    applyOverwriteDialog () {
      this.$store.commit('unloadrFiles')
      this.showOverwriteDialog = false
      this.importOSM()
    },
  },

}
</script>
<template>
  <section>
    <v-card
      class="card"
    >
      <v-card-title>
        {{ $gettext("Import OSM network in bounding box") }}
      </v-card-title>
      <v-spacer />
      <v-card-subtitle>
        <v-alert
          v-if="error"
          dense
          width="50rem"
          outlined
          text
          type="error"
        >
          {{ $gettext("There as been an error while importing OSM network. \
            Please try again. If the problem persist, contact us.") }}
          <p
            v-for="key in Object.keys(errorMessage)"
            :key="key"
          >
            <b>{{ key }}: </b>{{ errorMessage[key] }}
          </p>
        </v-alert>
      </v-card-subtitle>
      <v-card-actions>
        <MglMap
          :key="mapStyle"
          class="map"
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
      </v-card-actions>
      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-select
          v-model="selectedHighway"
          :items="highwayList"
          attach
          chips
          :menu-props="{ top: true, offsetY: true }"
          label="Highways to import"
          multiple
        >
          <template v-slot:selection="{ item, index }">
            <v-chip v-if="index <= 0">
              <span>{{ item }}</span>
            </v-chip>
            <span
              v-if="index === 1"
              class="grey--text text-caption"
            >
              (+{{ selectedHighway.length - 1 + ' ' + $gettext('more') }} )
            </span>
          </template>
        </v-select>
        <v-spacer />
        <v-btn
          text
          outlined
          color="success"
          :loading="running"
          :disabled="running"
          @click="importOSM"
        >
          {{ $gettext("Download") }}
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-dialog
      v-model="showOverwriteDialog"
      persistent
      max-width="500"
      @keydown.enter="applyOverwriteDialog"
      @keydown.esc="showOverwriteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Overwrite current road network ?") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="regular"
            @click="showOverwriteDialog = !showOverwriteDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="applyOverwriteDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>

.card {
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem;
}
.map {
  max-width: 100rem;
  width:50rem;
  height: 35rem;
}
.v-card__text {
    padding: 0px 24px 0px;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
