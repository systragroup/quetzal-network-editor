<script>
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import s3 from '@src/AWSClient'
import { quetzalClient } from '@src/axiosClient.js'
import { v4 as uuid } from 'uuid'
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
      showDialog: false,
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
      defaultHighway: [
        'motorway',
        'motorway_link',
        'trunk',
        'trunk_link',
        'primary',
        'primary_link'],
      tags: ['highway', 'maxspeed', 'lanes', 'name', 'oneway', 'surface'],
      callID: uuid(),
      importStatus: null,
      bucketOSM: 'quenedi-osm',
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
    this.selectedHighway = this.highwayList.filter(item => this.defaultHighway.includes(item))
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
            overpassQuery: overpassQuery,
            tags: this.tags,
            callID: this.callID,
          }),
          name: this.callID,
          stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:osm-api',
        }
        quetzalClient.client.post('',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.importStatus = 'RUNNING'
            this.pollImport(response.data.executionArn)
          }).catch(err => { this.$store.commit('changeAlert', err) })
      } else {
        this.showOverwriteDialog = true
      }
    },
    pollImport (executionArn) {
      const intervalId = setInterval(() => {
        let data = { executionArn: executionArn }
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.importStatus = response.data.status
            console.log(this.importStatus)
            if (this.importStatus === 'SUCCEEDED') {
              clearInterval(intervalId)
              this.downloadOSMFromS3()
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.importStatus)) {
              clearInterval(intervalId)
            }
          }).catch(e => { this.$store.commit('changeAlert', e) })
      }, 1000)
    },
    applyDict (rlinks) {
      // 00BCD4
      Object.keys(this.colorDict).forEach(highway => {
        rlinks.features.filter(link => link.properties.highway === highway).forEach(
          link => {
            link.properties.route_width = this.widthDict[highway]
            link.properties.route_color = this.colorDict[highway]
          })
      })

      return rlinks
    },
    async downloadOSMFromS3 () {
      let rlinks = await s3.readJson(this.bucketOSM, this.callID.concat('/links.geojson'))
      rlinks = this.applyDict(rlinks)
      this.$store.commit('loadrLinks', rlinks)
      const rnodes = await s3.readJson(this.bucketOSM, this.callID.concat('/nodes.geojson'))
      this.$store.commit('loadrNodes', rnodes)
      await s3.deleteFolder(this.bucketOSM, this.callID)
      this.map.removeLayer('stroke')
      this.$router.push('/Home').catch(() => {})
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
    <v-tooltip
      bottom
      open-delay="500"
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          :disabled="!isUserSignedIn"
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
        <v-card-subtitle>
          <v-alert
            v-if="importStatus == 'FAILED' || importStatus == 'TIMED_OUT' || importStatus == 'ABORTED'"
            dense
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
            :loading="importStatus == 'RUNNING'"
            :disabled="importStatus == 'RUNNING'"
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
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>
.map {
  max-width: 100rem;
  height: 30rem;
}
.v-card__text {
    padding: 0px 24px 0px;
}
</style>
