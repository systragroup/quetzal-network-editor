<script setup>
import bboxPolygon from '@turf/bbox-polygon'
import booleanContains from '@turf/boolean-contains'
import booleanIntersects from '@turf/boolean-intersects'
import { polygon } from '@turf/helpers'
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { csvJSON } from '@src/utils/io'
import MapSelector from './MapSelector.vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const runGTFS = useGTFSStore()
const linksStore = useLinksStore()
const store = useIndexStore()
const showOverwriteDialog = ref(false)
const poly = ref(null)
const gtfsList = ref([])
const availableGTFS = ref([])
const showHint = ref(false)
const selectedGTFS = ref(runGTFS.selectedGTFS)
const linksIsEmpty = computed(() => { return linksStore.linksIsEmpty })
const callID = computed(() => { return runGTFS.callID })
const running = computed(() => { return runGTFS.running })
const error = computed(() => { return runGTFS.error })
const errorMessage = computed(() => { return runGTFS.errorMessage })

onBeforeUnmount(() => {
  runGTFS.saveParams(parameters.value)
  runGTFS.saveSelectedGTFS(selectedGTFS.value)
})
const parameters = ref([{
  name: 'start_time',
  text: 'start time',
  value: runGTFS.parameters.start_time,
  type: 'time',
  units: '',
  hint: 'Start Time to restrict the GTFS in a period',
  rules: [
    'required',
  ],
},
{
  name: 'end_time',
  text: 'end time',
  value: runGTFS.parameters.end_time,
  type: 'time',
  units: '',
  hint: 'End Time to restrict the GTFS in a period',
  rules: [
    'required',
  ],
},
{
  name: 'day',
  text: 'day',
  value: runGTFS.parameters.day,
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
])
const rules = {
  required: v => !!v || $gettext('Required'),
}

onMounted(async () => {
  gtfsList.value = await fetchCSV()
  gtfsList.value.forEach((el, idx) => {
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
  gtfsList.value = gtfsList.value.filter(el => el.bbox)
  gtfsList.value = gtfsList.value.filter(el => el['urls.latest']?.length > 0)
  gtfsList.value.sort((a, b) => {
    if (a['location.country_code'] < b['location.country_code']) return -1
    if (a['location.country_code'] > b['location.country_code']) return 1
    return 0
  })
})

async function fetchCSV () {
  try {
    const response = await fetch('https://storage.googleapis.com/storage/v1/b/mdb-csv/o/sources.csv?alt=media', {
    })
    if (!response.ok) {
      store.changeAlert({ name: 'Network error', message: 'cannot fetch GTFS list' })
    }
    const data = await response.arrayBuffer()
    const json = csvJSON(data)
    return json
  } catch (err) {
    store.changeAlert(err)
  }
}

function getBBOX (val) {
  if (!poly.value) {
    poly.value = val
    getAvaileGTFS()
  } else {
    poly.value = val
  }
}
function getAvaileGTFS () {
  let lPoly = null
  if (poly.value.style === 'bbox') {
    const g = poly.value.geometry
    lPoly = bboxPolygon([g[1], g[0], g[3], g[2]])
  } else {
    lPoly = polygon([poly.value.geometry])
  }
  availableGTFS.value = gtfsList.value.filter(
    el => (booleanContains(lPoly, el.bbox) || booleanIntersects(lPoly, el.bbox)))
  availableGTFS.value.forEach(el => el.allInPolygon = booleanContains(lPoly, el.bbox))
  // remove checked gtfs not available anymore.
  const indexSet = new Set(availableGTFS.value.map(el => el.index))
  selectedGTFS.value = selectedGTFS.value.filter(el => indexSet.has(el))
}

function importGTFS () {
  if (linksIsEmpty.value) {
    runGTFS.setCallID()
    const selected = availableGTFS.value.filter(el => selectedGTFS.value.includes(el.index))
    const filesPath = selected.map(el => el['urls.latest'])
    const inputs = { files: filesPath, callID: callID.value }
    parameters.value.forEach(item => {
      inputs[item.name] = item.value
    })
    runGTFS.startExecution(inputs)
  } else {
    showOverwriteDialog.value = true
  }
}

function applyOverwriteDialog () {
  linksStore.$reset()
  showOverwriteDialog.value = false
  importGTFS()
}

</script>
<template>
  <div class=" background">
    <v-card class="card">
      <v-card-title class="subtitle">
        {{ $gettext('GTFS importer') }}
      </v-card-title>
      <MapSelector @change="getBBOX" />
    </v-card>
    <v-card class="card2">
      <v-card-title class="subtitle">
        {{ $gettext('Available GTFS') }}
      </v-card-title>
      <v-card-subtitle>
        {{ $gettext('Data fetch from')+ ' https://database.mobilitydata.org/' }}
      </v-card-subtitle>

      <v-btn
        :disabled="running"
        prepend-icon="fa-solid fa-sync"
        @click="getAvaileGTFS"
      >
        {{ $gettext('fetch available GTFS') }}
      </v-btn>
      <v-btn
        :loading="running"
        :disabled="running || selectedGTFS.length===0"
        :color="(running || selectedGTFS.length===0)? 'regular': 'success'"
        prepend-icon="fa-solid fa-play"
        @click="importGTFS"
      >
        {{ $gettext('Download') }}
      </v-btn>
      <v-card-subtitle>
        <v-alert
          v-if="error"
          density="compact"
          variant="outlined"
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
          class="params"
        >
          <v-text-field
            v-if="typeof item.items === 'undefined'"
            v-model="item.value"
            step="1"
            :type="item.type"
            :label="$gettext(item.text)"
            :suffix="item.units"
            variant="underlined"
            :hint="showHint? $gettext(item.hint): ''"
            :persistent-hint="showHint"
            :rules="item.rules.map((rule) => rules[rule])"
            required
            @wheel="()=>{}"
          />

          <v-select
            v-else
            v-model="item.value"
            variant="underlined"
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
          <span class="list-item-medium">City</span>
          <span class="list-item-large">Agency</span>
          <span class="list-item-small">.zip</span>
        </ul>
        <ul
          v-for="(item,key) in availableGTFS"
          :key="item.index"
          class="list-row"
        >
          <span class="list-item-small"> <v-checkbox-btn
            v-model="selectedGTFS"
            :value="item.index"
            :label="String(key)"
          /></span>
          <span class="list-item-small">{{ item['allInPolygon'] }} </span>
          <span class="list-item-small">{{ item['location.country_code'] }} </span>
          <span class="list-item-medium">{{ item['location.subdivision_name'] }}</span>
          <span class="list-item-medium">{{ item['location.municipality'] }}</span>
          <span class="list-item-large">{{ item.provider }}</span>
          <v-btn
            variant="text"
            icon="fa-solid fa-download"
            size="small"
            :href="item['urls.latest']"
          />
        </ul>
      </div>
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
          {{ $gettext("Overwrite current PT network ?") }}
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
  </div>
</template>
<style lang="scss" scoped>
.background {
  background-color:var(--v-background-base);
  padding:2rem;
  width:100vw;
  height:90vh;
  display:flex;
  align-items:stretch;
}
.card {
  height: 90%;
  margin:1rem;
  flex:1;
  padding: 2.5rem;
  background-color: rgb(var(--v-theme-lightergrey));

}
.card2 {
  height: 90%;
  flex:1;
  margin:1rem;
  padding: 2.5rem 0 2.5rem 2.0rem;
  margin-right: 3rem;
  overflow-y: hidden;
  background-color: rgb(var(--v-theme-lightergrey));
}
.card button {
  margin-top: 0;
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
  margin-left: 0;
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
.params{
  width: 10rem;
}
.list {
  height:70%;
  margin-top:1rem;
  margin-right:1rem;
  overflow: hidden auto;
  border-top: 1px solid rgb(var(--v-theme-mediumgrey));
  border-bottom: 1px solid rgb(var(--v-theme-mediumgrey));
}
.list-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  padding-left:0;
  align-items: center;
  justify-content:flex-start;
  border-bottom: 1px solid rgb(var(--v-theme-mediumgrey));
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
