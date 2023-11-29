<script>
import bboxPolygon from '@turf/bbox-polygon'
import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import booleanContains from '@turf/boolean-contains'
import booleanIntersects from '@turf/boolean-intersects'
import Polygon from 'turf-polygon'

import { csvJSON } from '../utils/utils.js'

import MapSelector from './MapSelector.vue'
const $gettext = s => s

export default {
  name: 'GTFSWebImporter',
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
      selectedGTFS: this.$store.getters['runGTFS/selectedGTFS'],
      checkall: false,
      showHint: false,
      parameters: [{
        name: 'start_time',
        text: 'start time',
        value: this.$store.getters['runGTFS/parameters'].start_time,
        type: 'String',
        units: '',
        hint: 'Start Time to restrict the GTFS in a period',
        rules: [
          'required', 'timeRule',
        ],
      },
      {
        name: 'end_time',
        text: 'end time',
        value: this.$store.getters['runGTFS/parameters'].end_time,
        type: 'String',
        units: '',
        hint: 'End Time to restrict the GTFS in a period',
        rules: [
          'required', 'timeRule',
        ],
      },
      {
        name: 'day',
        text: 'day',
        value: this.$store.getters['runGTFS/parameters'].day,
        type: 'String',
        items: ['monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday'],
        units: '',
        hint: 'restrict each GTFS to this day.',
        rules: [
          'required',
        ],
      },
      ],
      // eslint-disable-next-line max-len, no-useless-escape
      re: /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      rules: {
        required: v => !!v || $gettext('Required'),
        timeRule: v => this.re.test(v) || $gettext('invalid date time'),
      },
    }
  },
  computed: {
    linksIsEmpty () { return this.$store.getters.linksIsEmpty },
    callID () { return this.$store.getters['runGTFS/callID'] },
    running () { return this.$store.getters['runGTFS/running'] },
    error () { return this.$store.getters['runGTFS/error'] },
    errorMessage () { return this.$store.getters['runGTFS/errorMessage'] },
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
    this.gtfsList = this.gtfsList.filter(el => el['urls.latest'].length > 0)
    this.gtfsList.sort((a, b) => {
      if (a['location.country_code'] < b['location.country_code']) return -1
      if (a['location.country_code'] > b['location.country_code']) return 1
      return 0
    })
  },
  beforeDestroy () {
    this.$store.commit('runGTFS/saveParams', this.parameters)
    this.$store.commit('runGTFS/saveSelectedGTFS', this.selectedGTFS)
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
      // eslint-disable-next-line no-return-assign
      this.availableGTFS.forEach(el => el.allInPolygon = booleanContains(poly, el.bbox))
      // remove checked gtfs not available anymore.
      const indexSet = new Set(this.availableGTFS.map(el => el.index))
      this.selectedGTFS = this.selectedGTFS.filter(el => indexSet.has(el))
      // const selected = this.availableGTFS.filter(el => this.selectedGTFS.includes(el.index))
      // console.log(selected.map(el => el['urls.latest']))
    },

    importGTFS () {
      if (this.linksIsEmpty) {
        this.$store.commit('runGTFS/setCallID')

        const selected = this.availableGTFS.filter(el => this.selectedGTFS.includes(el.index))
        const filesPath = selected.map(el => el['urls.latest'])
        const inputs = { files: filesPath }
        this.parameters.forEach(item => {
          inputs[item.name] = item.value
        })
        this.$store.dispatch('runGTFS/startExecution', inputs)
      } else {
        this.showOverwriteDialog = true
      }
    },

    applyOverwriteDialog () {
      this.$store.commit('loadLinks', linksBase)
      this.$store.commit('loadNodes', nodesBase)
      this.showOverwriteDialog = false
      this.importGTFS()
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
        <v-card-subtitle>
          {{ $gettext('Data fetch from')+ ' https://database.mobilitydata.org/' }}
        </v-card-subtitle>

        <v-btn
          :disabled="running"
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
          :loading="running"
          :disabled="running || selectedGTFS.length===0"
          color="success"
          @click="importGTFS"
        >
          <v-icon
            small
            style="margin-right: 10px;"
          >
            fa-solid fa-play
          </v-icon>
          {{ $gettext('Download') }}
        </v-btn>
        <v-card-subtitle>
          <v-alert
            v-if="error"
            dense
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
        <div class="params-row">
          <div
            v-for="(item, key) in parameters"
            :key="key"
          >
            <v-text-field
              v-if="typeof item.items === 'undefined'"
              v-model="item.value"
              :type="item.type"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @wheel="()=>{}"
            />
            <v-select
              v-else
              v-model="item.value"
              :type="item.type"
              :items="item.items"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @wheel="()=>{}"
            />
          </div>
        </div>
        <div class="list">
          <ul class="list-row">
            <span class="list-item-small"><v-checkbox :disabled="true" /></span>
            <span class="list-item-small">All in polygon</span>
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
            <span class="list-item-small">{{ item['allInPolygon'] }} </span>
            <span class="list-item-small">{{ item['location.country_code'] }} </span>
            <span class="list-item-medium">{{ item['location.subdivision_name'] }}</span>
            <span class="list-item-large">{{ item['location.municipality'] }}</span>
            <span class="list-item-large">{{ item.provider }}</span>
          </ul>
        </div>
      </v-card>
    </v-col>
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
  </v-row>
</template>
<style lang="scss" scoped>

.card {
  height: 90%;
  padding: 2.5rem;
}
.card2 {
  height: 90%;
  padding: 2.5rem 0rem 2.5rem 2.0rem;
  margin-right: 3rem;
  overflow-y: auto;

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

.params-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  align-items: center;
  margin-right:1rem;
  padding-top: 0.5rem;
  justify-content:flex-start;
  gap: 1rem;

}

.list {
  height:80%;
  //border: 1px solid red;
  margin-top:1rem;
  overflow-y: auto;
  overflow-x: hidden;
  border-top: 1px solid var(--v-background-lighten3);

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
  flex: 0 0 8%;
  margin:4px;
}

.list-item-medium {
  /* Add individual list item styles here */
  flex: 0 0 18%;
  margin-right:2px;
}

.list-item-large {
  /* Add individual list item styles here */
  flex: 0 0 26%;
  margin:4px;
}
</style>
