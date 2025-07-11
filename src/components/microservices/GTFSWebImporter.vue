<script setup lang="ts">
import bboxPolygon from '@turf/bbox-polygon'
import booleanContains from '@turf/boolean-contains'
import booleanIntersects from '@turf/boolean-intersects'
import { ref, computed, onBeforeUnmount, onMounted, toRaw } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter.ts'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { parseCSV } from '@src/utils/io'
import { getRules } from '@src/utils/form'
import MapSelector from './MapSelector.vue'
import TimeSeriesSelector from './TimeSeriesSelector.vue'
import Warning from '../utils/Warning.vue'
import { useGettext } from 'vue3-gettext'
import { basePolygonFeature, GeoJsonFeatures, PolygonFeatures } from '@src/types/geojson'
import { RunInputs } from '@src/types/api'
import { useUserStore } from '@src/store/user'
import { StringTimeserie } from '@src/types/typesStore'

const { $gettext } = useGettext()

export interface GTFSListMobilityData {
  'index': number
  'bbox': GeoJsonFeatures
  'allInPolygon': boolean
  'location.bounding_box.extracted_on': number
  'location.bounding_box.maximum_latitude': number
  'location.bounding_box.maximum_longitude': number
  'location.bounding_box.minimum_latitude': number
  'location.bounding_box.minimum_longitude': number
  'location.country_code': string
  'location.municipality': string
  'location.subdivision_name': string
  'urls.latest': string
  'provider': string
}

export interface GTFSList {
  index: number
  bbox: GeoJsonFeatures
  allInPolygon: boolean
  countryCode: string
  city: string
  name: string
  url: string
  provider: string
}

const runGTFS = useGTFSStore()
const linksStore = useLinksStore()
const store = useIndexStore()
const showOverwriteDialog = ref(false)
const poly = ref<PolygonFeatures>(basePolygonFeature())
const gtfsList = ref<GTFSListMobilityData[]>([])
const availableGTFS = ref<GTFSList[]>([])
const showHint = ref(false)
const selectedGTFS = ref(runGTFS.selectedGTFS)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const callID = computed(() => runGTFS.callID)
const running = computed(() => runGTFS.running)
const error = computed(() => runGTFS.error)
const errorMessage = computed(() => runGTFS.errorMessage)
const storeParameters = computed(() => runGTFS.parameters)

const periods = ref<StringTimeserie[]>(storeParameters.value.timeseries)
const selectedDay = ref<string>(storeParameters.value.day)

function save() {
  const selected = availableGTFS.value.filter(el => selectedGTFS.value.includes(el.index))
  const filesPath = selected.map(el => el.url)

  runGTFS.saveParams({
    files: filesPath,
    timeseries: toRaw(periods.value),
    day: selectedDay.value,
    dates: [],
  })

  runGTFS.saveSelectedGTFS(selectedGTFS.value)
}

onBeforeUnmount(() => {
  save()
})

onMounted(async () => {
  getGTFSList()
})

async function getGTFSList() {
  gtfsList.value = await fetchCSV()
  // filter out GTFS without bounding box.
  gtfsList.value = gtfsList.value.filter(el => el['location.bounding_box.minimum_longitude'])
  gtfsList.value.forEach((el, idx) => {
    el.bbox = bboxPolygon(
      [el['location.bounding_box.minimum_longitude'],
        el['location.bounding_box.minimum_latitude'],
        el['location.bounding_box.maximum_longitude'],
        el['location.bounding_box.maximum_latitude'],
      ])

    el.index = idx
  })
  gtfsList.value = gtfsList.value.filter(el => el.bbox)
  gtfsList.value = gtfsList.value.filter(el => el['urls.latest']?.length > 0)
  gtfsList.value.sort((a, b) => {
    if (a['location.country_code'] < b['location.country_code']) return -1
    if (a['location.country_code'] > b['location.country_code']) return 1
    return 0
  })
}

async function fetchCSV () {
  try {
    const response = await fetch('https://storage.googleapis.com/storage/v1/b/mdb-csv/o/sources.csv?alt=media', {
    })
    if (!response.ok) {
      store.changeAlert({ name: 'Network error', message: 'cannot fetch GTFS list' })
    }
    const data = await response.arrayBuffer()
    const json = parseCSV(data) as GTFSListMobilityData[]
    return json
  } catch (err) {
    store.changeAlert(err)
    return []
  }
}

function getBBOX (val: PolygonFeatures) {
  poly.value = val
  getAvaileGTFS()
}

function getAvaileGTFS () {
  const filtered = gtfsList.value.filter(el =>
    (booleanContains(poly.value, el.bbox) || booleanIntersects(poly.value, el.bbox)))

  availableGTFS.value = filtered.map(el => {
    const data: GTFSList = {
      index: el.index,
      bbox: el.bbox,
      allInPolygon: booleanContains(poly.value, el.bbox),
      countryCode: el['location.country_code'],
      city: el['location.municipality'],
      name: el['location.subdivision_name'],
      url: el['urls.latest'],
      provider: el['provider'],
    }
    return data
  })
  // remove checked gtfs not available anymore.
  const indexSet = new Set(availableGTFS.value.map(el => el.index))
  selectedGTFS.value = selectedGTFS.value.filter(el => indexSet.has(el))
}
// run

const formRef = ref()

async function importGTFS () {
  const isValid = await formRef.value.validate()
  if (!isValid) {
    return
  }
  if (linksIsEmpty.value) {
    runGTFS.setCallID()
    save()
    const params = toRaw(storeParameters.value)
    const userStore = useUserStore()
    const inputs: RunInputs = {
      scenario_path_S3: callID.value,
      launcher_arg: {
        training_folder: '/tmp',
        params: params,
      },
      metadata: {
        user_email: userStore.cognitoInfo?.email,
      },
    }
    runGTFS.start(inputs)
  } else {
    showOverwriteDialog.value = true
  }
}

function applyOverwriteDialog () {
  linksStore.$reset()
  showOverwriteDialog.value = false
  importGTFS()
}

export interface DataTableHeaders {
  key: string
  title: string
  parser?: (_value: any) => any
  width?: string
  sortable?: boolean

}
const headers: DataTableHeaders[] = [
  { key: 'index', title: 'id' },
  { key: 'allInPolygon', title: 'All in polygon' },
  { key: 'countryCode', title: 'Code' },
  { key: 'name', title: 'Name' },
  { key: 'city', title: 'City' },
  { key: 'provider', title: 'Agency' },
  { key: 'url', title: '.zip' },
]

</script>
<template>
  <div class="background">
    <v-card class="card">
      <v-card-title class="subtitle">
        {{ $gettext('GTFS importer') }}
      </v-card-title>
      <v-card-subtitle>
        {{ $gettext('Data fetch from')+ ' https://database.mobilitydata.org/' }}
      </v-card-subtitle>
      <MapSelector @change="getBBOX" />
    </v-card>
    <v-card class="card">
      <v-card-title class="subtitle">
        {{ $gettext('Available GTFS') }}
      </v-card-title>
      <div class="params-row">
        <v-btn
          :loading="running"
          :disabled="running || selectedGTFS.length===0"
          :color="(running || selectedGTFS.length===0)? 'regular': 'success'"
          prepend-icon="fa-solid fa-play"
          @click="importGTFS"
        >
          {{ $gettext('Download') }}
        </v-btn>
        <v-select
          v-model="selectedDay"
          step="1"
          max-width="10rem"
          type="string"
          :items="['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']"
          :label="$gettext('day')"
          :suffix="''"
          density="compact"
          variant="outlined"
          hide-details
          :persistent-hint="showHint"
          :rules="getRules(['required'])"
        />
      </div>
      <Warning
        :show="error"
        :messages="errorMessage"
      />
      <TimeSeriesSelector
        ref="formRef"
        v-model="periods"
      />
      <div class="table-container">
        <v-data-table-virtual
          v-model="selectedGTFS"
          class="table"
          height="100"
          item-height="10"
          :fixed-header="true"
          :sticky="true"
          :headers="headers"
          :items="availableGTFS"
          :item-value="'index'"
          hide-default-footer
          show-select
          hover
        >
          <template v-slot:item.url="{ item }">
            <v-btn
              variant="text"
              icon="fa-solid fa-download"
              size="small"
              :href="item.url"
            />
          </template>
        </v-data-table-virtual>
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
  padding:2rem;
  margin-right:1rem;
  width:100%;
  height:calc(100vh - 150px);
  gap:1rem;
  display:flex;
  align-items:stretch;
}
.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex:1;
  gap:0.5rem;
  padding: 2.5rem;
  background-color: rgb(var(--v-theme-lightergrey));
}
.card button {
  margin-top: 0;
}
.params-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  align-items: center;
  justify-content:flex-start;
  gap: 1rem;
}
.table-container{
  display: flex;
  flex-direction: column;
  height:100%;
  width:100%;
}
.table{
  height:100%;
}
.subtitle {
  font-size: 2em;
  color:var(--v-secondary-dark);
  font-weight: bold;
}

</style>
