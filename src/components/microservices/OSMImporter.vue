<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import auth from '@src/auth.js'

export default {
  name: 'OSMImporter',
  components: {
    MglMap,
    MglNavigationControl,
    MglScaleControl,
    MglGeojsonLayer,
  },

  data () {
    return {
      mapboxPublicKey: process.env.VUE_APP_MAPBOX_PUBLIC_KEY,
      showOverwriteDialog: false,
      bbox: null,
      poly: null,
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
    highway () { return this.$store.getters['runOSM/highway'] },
    bucket () { return this.$store.getters['runOSM/bucket'] },
    callID () { return this.$store.getters['runOSM/callID'] },
    importStatus () { return this.$store.getters['runOSM/status'] },
    running () { return this.$store.getters['runOSM/running'] },
    error () { return this.$store.getters['runOSM/error'] },
  },
  watch: {
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
      this.getBounds()
    },
    getBounds () {
      this.bbox = this.map.getBounds()
      const bbox = bboxPolygon([this.bbox._sw.lng, this.bbox._sw.lat, this.bbox._ne.lng, this.bbox._ne.lat])
      this.poly = buffer(bbox, -0.1 * (this.bbox._ne.lat - this.bbox._sw.lat), { units: 'degrees' })
      this.poly.geometry.coordinates[0] = this.poly.geometry.coordinates[0].reverse()
    },
    importOSM () {
      if (this.rlinksIsEmpty) {
        this.$store.commit('runOSM/setCallID')

        const bbox = [this.bbox._sw.lat, this.bbox._sw.lng, this.bbox._ne.lat, this.bbox._ne.lng]
        this.$store.dispatch('runOSM/startExecution', { bbox: bbox })
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
        </v-alert>
      </v-card-subtitle>
      <v-card-actions>
        <MglMap
          :key="mapStyle"
          class="map"
          :access-token="mapboxPublicKey"
          :map-style="mapStyle"
          @load="onMapLoaded"
        >
          <MglScaleControl position="bottom-right" />
          <MglNavigationControl position="bottom-right" />

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
</style>
