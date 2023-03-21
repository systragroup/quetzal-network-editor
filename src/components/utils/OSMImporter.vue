<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import { mapboxPublicKey } from '@src/config.js'
import { osmClient } from '@src/axiosClient.js'

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
      mapboxPublicKey: null,
      showDialog: false,
      bbox: null,
      poly: null,
      selectedHighway: null,
      highwayList: ['motorway',
        'motorway_link',
        'secondary',
        'trunk',
        'residential',
        'tertiary',
        'primary',
        'unclassified',
        'trunk_link',
        'secondary_link',
        'primary_link',
        'tertiary_link'],
      tags: ['highway', 'maxspeed', 'lanes', 'name', 'oneway', 'surface'],
    }
  },
  computed: {
    mapStyle () { return this.$store.getters.mapStyle },

  },
  watch: {
    showDialog (val) {
      if (!val) {
        // remove stroke layer as it use the polygon layer data.
        this.map.removeLayer('stroke')
      }
    },
  },
  created () {
    this.selectedHighway = this.highwayList.filter(item => !['residential', 'unclassified'].includes(item))
    this.mapboxPublicKey = mapboxPublicKey
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
      const bbox = [this.bbox._sw.lat, this.bbox._sw.lng, this.bbox._ne.lat, this.bbox._ne.lng]
      let overpassQuery = `[out:json][timeout:180];
        (
        `
      overpassQuery += this.selectedHighway.map(highway => `way["highway"="${highway}"](${bbox});\n`).join('')
      overpassQuery += `);
        out body;
        >;
        out skel qt;
        `
      let data = {
        input: JSON.stringify({
          overpass_query: overpassQuery,
          tags: this.tags,
        }),
        stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:osm-api',
      }
      osmClient.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          console.log(response)
        }).catch(
        err => {
          console.log(err)
        })
    },
  },

}
</script>
<template>
  <section>
    <v-tooltip
      bottom
      open-delay="500"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          :style="{margin:'15px'}"
          v-bind="attrs"
          :color="'normal'"
          v-on="on"
          @click="showDialog=true"
        >
          <v-icon
            small
            left
          >
            fas fa-cloud-download-alt
          </v-icon>
          {{ 'OSM' }}
        </v-btn>
      </template>
      <span>{{ $gettext("Download OSM network") }}</span>
    </v-tooltip>

    <v-dialog
      v-model="showDialog"
      max-width="600"
      max-height="600"
    >
      <v-card
        v-if="showDialog"
        class="card"
      >
        <v-card-title>
          {{ $gettext("Import OSM network in bounding box") }}
        </v-card-title>
        <v-card-actions>
          <MglMap
            :key="mapStyle"
            class="map"
            :style="{'width': '100%'}"
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
            @click="()=>showDialog=false"
          >
            {{ $gettext("Cancel") }}
          </v-btn>
          <v-btn
            text
            outlined
            color="success"
            @click="importOSM"
          >
            {{ $gettext("Download") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>
.map {
  max-width: 100rem;
  height: 30rem;
}
.dialog {

}
</style>
