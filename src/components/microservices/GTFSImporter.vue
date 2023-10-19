<script>
import bboxPolygon from '@turf/bbox-polygon'
import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import booleanContains from '@turf/boolean-contains'
import booleanIntersects from '@turf/boolean-intersects'
import Polygon from 'turf-polygon'

import { csvJSON } from '../utils/utils.js'

import MapSelector from './MapSelector.vue'

export default {
  name: 'GTFSImporter',
  components: {
    MapSelector,
  },

  data () {
    return {
      showOverwriteDialog: false,
      poly: null,
      nodes: {},
      gtfsList: [],
      availableGTFS: [],
      selectedGTFS: [],
      checkall: false,
    }
  },
  computed: {
    linksIsEmpty () { return this.$store.getters.linksIsEmpty },
    callID () { return this.$store.getters['runOSM/callID'] },
    running () { return this.$store.getters['runOSM/running'] },
    error () { return this.$store.getters['runOSM/error'] },
    errorMessage () { return this.$store.getters['runOSM/errorMessage'] },
  },

  async created () {
    this.gtfsList = await this.fetchCSV()
    this.gtfsList.forEach((el, idx) => {
      try {
        el.bbox = bboxPolygon(
          [el['location.bounding_box.minimum_longitude'],
            el['location.bounding_box.minimum_latitude'],
            el['location.bounding_box.maximum_longitude'],
            el['location.bounding_box.maximum_latitude'],
          ])
      } catch {
        el.bbox = null
      }
      el.index = idx
    })
    this.gtfsList = this.gtfsList.filter(el => el.bbox)
    this.gtfsList.sort((a, b) => {
      if (a['location.country_code'] < b['location.country_code']) return -1
      if (a['location.country_code'] > b['location.country_code']) return 1
      return 0
    })
  },

  methods: {

    async fetchCSV () {
      try {
        const response = await fetch('https://storage.googleapis.com/storage/v1/b/mdb-csv/o/sources.csv?alt=media', {
        })
        if (!response.ok) {
          this.$store.commit('changeAlert', { name: 'Network error', message: 'cannot fetch GTFS list' })
        }
        const data = await response.arrayBuffer()
        const json = csvJSON(data)
        return json
      } catch (err) {
        this.$store.commit('changeAlert', err)
      }
    },
    getBBOX (val) {
      if (!this.poly) {
        this.poly = val
        this.getAvaileGTFS()
      } else {
        this.poly = val
      }
    },
    getAvaileGTFS () {
      let poly = null
      if (this.poly.style === 'bbox') {
        const g = this.poly.geometry
        poly = bboxPolygon([g[1], g[0], g[3], g[2]])
      } else {
        poly = Polygon([this.poly.geometry])
      }
      this.availableGTFS = this.gtfsList.filter(
        el => (booleanContains(poly, el.bbox) || booleanIntersects(poly, el.bbox)))

      // remove checked gtfs not available anymore.
      const indexSet = new Set(this.availableGTFS.map(el => el.index))
      this.selectedGTFS = this.selectedGTFS.filter(el => indexSet.has(el))
    },

    importOSM () {
      if (this.linksIsEmpty) {
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
      this.$store.commit('loadLinks', linksBase)
      this.$store.commit('loadNodes', nodesBase)
      this.showOverwriteDialog = false
      this.importOSM()
    },
  },

}
</script>
<template>
  <v-row class="ma-0 pa-2 background">
    <v-col>
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('GTFS importer') }}
        </v-card-title>
        <MapSelector @change="getBBOX" />
      </v-card>
    </v-col>
    <v-col>
      <v-card class="card2">
        <v-card-title class="subtitle">
          {{ $gettext('Available GTFS') }}
        </v-card-title>
        <v-btn
          @click="getAvaileGTFS"
        >
          <v-icon
            small
            style="margin-right: 10px;"
          >
            fa-solid fa-sync
          </v-icon>
          {{ $gettext('fetch available GTFS') }}
        </v-btn>
        <v-btn
          color="success"
        >
          <v-icon
            small
            style="margin-right: 10px;"
          >
            fa-solid fa-play
          </v-icon>
          {{ $gettext('Download') }}
        </v-btn>

        <div class="list">
          <ul class="list-row">
            <span class="list-item-small"><v-checkbox :disabled="true" /></span>
            <span class="list-item-small">Code</span>
            <span class="list-item-medium">Name</span>
            <span class="list-item-large">City</span>
            <span class="list-item-large">Agency</span>
          </ul>
          <ul
            v-for="(item,key) in availableGTFS"
            :key="item.index"
            class="list-row"
          >
            <span class="list-item-small"> <v-checkbox
              v-model="selectedGTFS"
              :value="item.index"
              :label="String(key)"
            /></span>
            <span class="list-item-small">{{ item['location.country_code'] }} </span>
            <span class="list-item-medium">{{ item['location.subdivision_name'] }}</span>
            <span class="list-item-large">{{ item['location.municipality'] }}</span>
            <span class="list-item-large">{{ item.provider }}</span>
          </ul>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>

.card {
  height: 95%;
  padding: 2.5rem;
}
.card2 {
  height: 95%;
  padding: 2.5rem 0rem 2.5rem 2.0rem;
  margin-right: 3rem;
}
.row {
  height: 100%
}
.col {
  max-height: 100%;
}
.card button {
  margin-top: 0px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color:var(--v-secondary-dark);
  font-weight: bold;
  margin: 10px;
  margin-left: 0px;
}
.card button {
  margin-top: 0px;
}
.background {
  background-color:var(--v-background-base);
}

.list {

  height:90%;
  //border: 1px solid red;
  overflow-y: auto;
  overflow-x: hidden;
}
.list-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  padding-left:0;
  align-items: center;
  justify-content:flex-start;
  border-bottom: 1px solid var(--v-background-lighten3);

}

.list-item-small {
  /* Add individual list item styles here */
  flex: 0 0 10%;
  margin:4px;
}

.list-item-medium {
  /* Add individual list item styles here */
  flex: 0 0 19%;
  margin-right:2px;
}

.list-item-large {
  /* Add individual list item styles here */
  flex: 0 0 28%;
  margin:4px;
}
</style>
