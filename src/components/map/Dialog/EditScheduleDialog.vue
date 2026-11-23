<script setup lang="ts">
import { ref, watch, toRaw, computed } from 'vue'
import ScheduleChart from '@comp/utils/ScheduleChart.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { useTheme } from 'vuetify'
import { cloneDeep } from 'lodash'
import { isScheduleTrip, hhmmssToSeconds, secondsTohhmmss, hash } from '@src/utils/utils'

import SimpleDialog from '@src/components/utils/SimpleDialog.vue'
import { baseLineString, LineStringGeoJson } from '@src/types/geojson'
import { TimeString } from '@src/types/components'
import { SchedulePayload } from '@src/types/typesStore'
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'
import { useGettext } from 'vue3-gettext'
import NumberInput from '@src/components/common/NumberInput.vue'
const { $gettext } = useGettext()

// Chart Dataset
interface Data {
  x: TimeString
  y: any
}

interface Dataset {
  backgroundColor: string
  borderColor: string
  borderWidth: number
  data: Data[]
  id: number
  pointRadius: number[]
}

interface StackedData {
  x: TimeString[]
  y: any[]
}

const showSchedule = defineModel<boolean>()

const emit = defineEmits(['applyAction', 'cancelAction', 'toggle'])

const theme = useTheme()
const store = useIndexStore()
const linksStore = useLinksStore()

const links = ref<LineStringGeoJson>(baseLineString())
const nodes = computed(() => linksStore.editorNodes)
const tripKey = ref(0)
const startTime = ref('08:00:00')
const endTime = ref('09:00:00')
const headway = ref(0)
const newTripMethod = ref<'single' | 'multiple'>('single')

const initialHash = ref()
const label = ref('index')
const datasets = ref<Dataset[]>([])

function toSchedule(links: LineStringGeoJson) {
  let currentTime = hhmmssToSeconds(startTime.value)
  links.features.forEach(f => {
    f.properties.departures = [secondsTohhmmss(currentTime)]
    currentTime = currentTime + f.properties.time
    f.properties.arrivals = [secondsTohhmmss(currentTime)]
  })
}

watch(showSchedule, (val) => {
  if (val) mount()
  else unmount()
})

function mount() {
  store.changeNotification({ text: '', autoClose: true })
  links.value = cloneDeep(linksStore.editorLinks)
  headway.value = links.value.features[0].properties.headway
  initialHash.value = hash(JSON.stringify(links.value))
  tripKey.value = 0
  if (!isScheduleTrip(links.value.features[0])) {
    // crete chedule based trips when arrivals is undefined
    toSchedule(links.value)
  }
  buildChartDataset()
}

function unmount() {
  datasets.value = []
  tripKey.value = 0
  startTime.value = '08:00:00'
  initialHash.value = undefined
  // label.value = 'index'
}

// Station Label
const labelsChoices = computed(() => {
  if (nodes.value.features.length > 0) {
    return Object.keys(nodes.value.features[0].properties)
  } else { return [] }
})

// List of Trip
const listOfTrips = computed(() => {
  if (datasets.value.length === 0) return []
  else return datasets.value.map(d => d.data[0].x)
})

// Create New Trip
// const rules = ref([
//   (val: string) => !listOfTrips.value.includes(val) || $gettext('departures time already used'),
// ])
const endTimeRules = ref([
  (val: string) => (newTripMethod.value == 'single') || (hhmmssToSeconds(val) > hhmmssToSeconds(startTime.value))
  || $gettext('end time must be bigger than start time'),
])

const newTripDialog = ref()
async function openCreateNewTripDialog() {
  startTime.value = datasets.value[tripKey.value].data[0].x
  const endtimeSec = Math.min(hhmmssToSeconds(startTime.value) + headway.value, 60 * 60 * 24 - 1) // max 23h59:59.
  endTime.value = secondsTohhmmss(endtimeSec)
  const resp = await newTripDialog.value.openDialog()
  if (resp) {
    if (newTripMethod.value === 'single') {
      const startTimeSecs = hhmmssToSeconds(startTime.value)
      createNewTrip(startTimeSecs)
    } else {
      let currentTime = hhmmssToSeconds(startTime.value)
      while (currentTime <= hhmmssToSeconds(endTime.value)) {
        createNewTrip(currentTime)
        currentTime += headway.value
      }
    }
  }
}

function _findInsertIndex(arr: number[], num: number) {
  // return index to insert
  // ex: arr = [8,10,12,16] & num = 9 => return 1. if smaller return 0 if larger return len(arr)
  const index = arr.findIndex(element => element >= num)
  // Handle case when the number is larger than all elements
  return index === -1 ? arr.length : index
}

function createNewTrip(startTimeSecs: number) {
  const departuresList: number[] = links.value.features[0].properties.departures.map((el: TimeString) => hhmmssToSeconds(el))
  if (departuresList.includes(startTimeSecs)) return // skip already existing departures
  // get the position to append the new Ttrip (if we add 9h to [8h, 10h], we have [8h, 9h, 10h])
  const index = _findInsertIndex(departuresList, startTimeSecs)

  // Compute the time differencial between template trip departure and new start time
  const templateStartTime = hhmmssToSeconds(links.value.features[0].properties.departures[tripKey.value])
  const timeDiff = startTimeSecs - templateStartTime
  // insert new departures and arrival.
  links.value.features.forEach(link => {
    let newDeparture = hhmmssToSeconds(link.properties.departures[tripKey.value]) + timeDiff
    link.properties.departures.splice(index, 0, secondsTohhmmss(newDeparture))
    let newArrival = hhmmssToSeconds(link.properties.arrivals[tripKey.value]) + timeDiff
    link.properties.arrivals.splice(index, 0, secondsTohhmmss(newArrival))
  })
  tripKey.value = index
  buildChartDataset()
}

function deleteTrip(val: number) {
  links.value.features.forEach(f => f.properties.departures.splice(val, 1))
  links.value.features.forEach(f => f.properties.arrivals.splice(val, 1))
  if (tripKey.value === listOfTrips.value.length - 1) {
    tripKey.value -= 1
  }

  buildChartDataset()
}

// Checks on Schedule
const formErrorKey = computed(() => {
  if (datasets.value.length === 0) return []
  const timeData = datasets.value[tripKey.value].data.map(d => d.x)
  let scheduleErrorKey = []
  for (let i = 0; i < timeData.length - 1; i++) {
    let a = hhmmssToSeconds(timeData[i])
    let b = hhmmssToSeconds(timeData[i + 1])
    if ((b - a) < 0) {
      scheduleErrorKey.push(i)
    }
  }
  return scheduleErrorKey.map((e: number) => {
    return {
      key: Math.floor(e / 2),
      departure: (e % 2 === 0),
    }
  })
})

function applyChanges() {
  let schedules: SchedulePayload[] = []
  links.value.features.forEach(f => {
    schedules.push({
      departures: toRaw(f.properties['departures']),
      arrivals: toRaw(f.properties['arrivals']),
    })
  })
  linksStore.editEditorLinksSchedule(schedules)
}

function saveAndQuit() {
  applyChanges()
  startTime.value = '08:00:00'
  emit('applyAction')
}

function ConvertToFrequencyTrip() {
  linksStore.deleteEditorLinksPropertie('departures')
  linksStore.deleteEditorLinksPropertie('arrivals')
  emit('applyAction')
  // return to a frequency base trip.
}

function cancel() {
  emit('cancelAction')
}

function buildChartDataset() {
  let stackedData: StackedData[] = []
  links.value.features.forEach(f => {
    stackedData.push({
      x: f.properties.departures,
      y: f.properties.a,
    })
    stackedData.push({
      x: f.properties.arrivals,
      y: f.properties.b,
    })
  })
  let datas: Dataset[] = []
  for (let i = 0; i < stackedData[0].x.length; i++) {
    // Node
    let pointRadius = Array(stackedData.length).fill(4)

    // Build Datasets
    datas.push({
      id: i,
      data: stackedData.map(d => {
        let node_index = nodes.value.features.findIndex(obj => obj.properties['index'] === d.y)
        return {
          x: d.x[i],
          y: nodes.value.features[node_index].properties[label.value],
        } }),

      // Style
      backgroundColor: (i === tripKey.value)
        ? theme.current.value.colors.secondary
        : theme.current.value.colors.lightgrey,
      borderColor: (i === tripKey.value)
        ? theme.current.value.colors.primary
        : theme.current.value.colors.lightgrey,
      borderWidth: 2,
      pointRadius: pointRadius,
    })
  }
  datasets.value = datas
}

// Node Hover from Schedule
const nodeHover = ref()

function mouseoverSchedule(key: number, type: string) {
  nodeHover.value = 2 * key
  if (type == 'arrivals') { nodeHover.value++ }
  const ttrip = datasets.value.filter(el => el.id === tripKey.value)[0]
  ttrip.pointRadius[nodeHover.value] = 6
}

function mouseleaveSchedule() {
  const ttrip = datasets.value.filter(el => el.id === tripKey.value)[0]
  ttrip.pointRadius[nodeHover.value] = 4
  nodeHover.value = undefined
}

function onClickTripList(val: number) {
  tripKey.value = val
  buildChartDataset()
}

// Trip Hover from List
const tripHover = ref()
function onMouseOverTripList(val: number) {
  tripHover.value = val
  const ttrip = datasets.value.filter(el => el.id === tripHover.value)[0]
  ttrip.borderWidth = 4
  // buildChartDataset()
}

function onMouseLeaveTripList() {
  const ttrip = datasets.value.filter(el => el.id === tripHover.value)[0]

  ttrip.borderWidth = 2
  tripHover.value = null
  // buildChartDataset()
}

const showSaveDialog = ref(false)
function toggle() {
  if (hash(JSON.stringify(links.value)) == initialHash.value) {
    emit('toggle')
  } else {
    showSaveDialog.value = true
  }
}
function handleSimpleDialog(event: boolean) {
  showSaveDialog.value = false
  if (event) {
    applyChanges()
    emit('toggle')
  } else {
    emit('toggle')
  }
}

</script>
<template>
  <v-dialog
    v-if="showSchedule"
    v-model="showSchedule"
    scrollable
    persistent
    max-width="90vw"
  >
    <v-card
      max-height="80vh"
    >
      <v-card-title class="text-h5">
        {{ $gettext("Edit Schedule") }}
        <v-btn
          variant="text"
          class="pl-auto"
          prepend-icon="fas fa-list"
          :disabled="formErrorKey.length > 0"
          @click="toggle"
        >
          {{ $gettext("Edit Properties") }}
        </v-btn>
        <span class="title">
          {{ linksStore.editorTrip }}
        </span>
      </v-card-title>

      <v-divider />
      <v-card-text>
        <v-row style="min-height: 20rem">
          <v-col cols="2">
            <v-select
              v-model="label"
              :items="labelsChoices.toSorted()"
              prepend-inner-icon="fas fa-tag"
              density="compact"
              variant="outlined"
              :label="$gettext('Station Label')"
              @update:model-value="buildChartDataset"
            />
            <v-card variant="outlined">
              <v-card-title>
                <v-row class="trip-ls-title">
                  <h5> {{ $gettext("List of Trips") }} </h5>
                  <v-btn
                    color="primary"
                    size="small"
                    class="mx-2"
                    icon="fas fa-plus"
                    @click="openCreateNewTripDialog"
                  />
                </v-row>
              </v-card-title>
              <v-card-text>
                <v-list-item
                  v-for="(item, key) in listOfTrips"
                  :key="key"
                  :active="key === tripKey"
                  @click="onClickTripList(key)"
                  @mouseenter="onMouseOverTripList(key)"
                  @mouseleave="onMouseLeaveTripList"
                >
                  <v-list-item-title>
                    {{ item }}
                  </v-list-item-title>
                  <template v-slot:append>
                    <v-btn
                      variant="text"
                      icon="fas fa-trash"
                      size="small"
                      class="ma-1"
                      :disabled="listOfTrips.length === 1"
                      @click.stop="deleteTrip(key)"
                    />
                  </template>
                </v-list-item>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="7">
            <ScheduleChart
              v-if="showSchedule"
              :data="{datasets}"
            />
          </v-col>
          <v-col cols="3">
            <v-row
              style="height: 10px"
            >
              <v-col cols="6">
                <h3>{{ $gettext("Departures") }}</h3>
              </v-col>
              <v-col cols="6">
                <h3>{{ $gettext("Arrivals") }}</h3>
              </v-col>
            </v-row>
            <v-form
              style="height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-around;
              padding-top: 70px;
              padding-bottom: 40px"
            >
              <div
                v-for="(item, key) in links.features"
                :key="key"
              >
                <v-row>
                  <v-col cols="6">
                    <v-text-field
                      v-model="item.properties.departures[tripKey]"
                      density="compact"
                      type="time"
                      step="1"
                      :error="formErrorKey.find(o => o.key === key && o.departure)!==undefined"
                      :error-messages="formErrorKey.find(o => o.key === key && o.departure)
                        ? $gettext('Invalid Time') : ''"
                      @update:model-value="buildChartDataset"
                      @mouseenter="mouseoverSchedule(key, 'departures')"
                      @mouseleave="mouseleaveSchedule()"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="item.properties.arrivals[tripKey]"
                      density="compact"
                      type="time"
                      step="1"
                      :error="formErrorKey.find(o => o.key === key && !o.departure)!==undefined"
                      :error-messages="formErrorKey.find(o => o.key === key && !o.departure)
                        ? $gettext('Invalid Time') : ''"
                      @update:model-value="buildChartDataset"
                      @mouseenter="mouseoverSchedule(key, 'arrivals')"
                      @mouseleave="mouseleaveSchedule()"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-form>
          </v-col>
        </v-row>
        <PromiseDialog
          ref="newTripDialog"
          confirm-color="success"
          :max-width="800"
          :title="$gettext('Create New Trip')"
        >
          <div class="content">
            <v-radio-group v-model="newTripMethod">
              <div
                class="optionContainer"
                :class="{ selected: newTripMethod === 'single' }"
                @click="newTripMethod='single'"
              >
                <v-radio
                  color="primary"
                  value="single"
                >
                  <template #label>
                    <h2>
                      Single Trip
                    </h2>
                  </template>
                </v-radio>
                <div class="input">
                  <p class="text-caption">
                    Create one trip with a start time.
                  </p>

                  <v-text-field
                    v-model="startTime"
                    variant="underlined"
                    width="30%"
                    autofocus
                    :label="$gettext('Start Time')"
                    type="time"
                    step="1"
                    :disabled="newTripMethod !== 'single'"
                    @keydown.enter="newTripDialog.confirm"
                  />
                </div>
              </div>
              <div
                class="optionContainer"
                :class="{ selected: newTripMethod === 'multiple' }"
                @click="newTripMethod='multiple'"
              >
                <v-radio
                  color="primary"
                  value="multiple"
                >
                  <template #label>
                    <h2>
                      Multiple Trips
                    </h2>
                  </template>
                </v-radio>
                <div class="input">
                  <p class="text-caption">
                    Create several trips over a time range, with a specified headway
                  </p>
                  <div class="row">
                    <v-text-field
                      v-model="startTime"
                      variant="underlined"
                      autofocus
                      :label="$gettext('Start Time')"
                      type="time"
                      step="1"
                      :disabled="newTripMethod !== 'multiple'"
                      @keydown.enter="newTripDialog.confirm"
                    />
                    <v-text-field
                      v-model="endTime"
                      variant="underlined"
                      autofocus
                      :rules="endTimeRules"
                      :label="$gettext('End Time')"
                      type="time"
                      step="1"
                      :disabled="newTripMethod !== 'multiple'"
                      @keydown.enter="newTripDialog.confirm"
                    />
                    <NumberInput
                      v-model="headway"
                      label="headway"
                      base-units="sec"
                      display-units="min"
                      :disabled="newTripMethod !== 'multiple'"
                    />
                  </div>
                </div>
              </div>
            </v-radio-group>
          </div>
        </PromiseDialog>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-btn
          color="error"
          variant="text"
          prepend-icon="fas fa-arrows-rotate"
          @click="ConvertToFrequencyTrip"
        >
          {{ $gettext("delete") }}
        </v-btn>
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="cancel"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="success"
          variant="text"
          :disabled="formErrorKey.length > 0"
          @click="saveAndQuit"
        >
          {{ $gettext("Save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <SimpleDialog
    v-model="showSaveDialog"
    :title="$gettext('Save Changes?')"
    confirm-color="primary"
    :confirm-button="$gettext('Yes')"
    :cancel-button="$gettext('No')"
    @confirm="handleSimpleDialog(true)"
    @cancel="handleSimpleDialog(false)"
  >
    <template #action>
      <v-btn
        @click="showSaveDialog=false"
      >
        {{ $gettext('Cancel') }}
      </v-btn>
    </template>
  </SimpleDialog>
</template>

<style lang="scss" scoped>
.trip-ls-title{
  padding: 1.2rem;
  align-items: center;
  justify-content: space-between;
}
.title{
  padding: 1rem;
}
.content{
  display: flex;
  width: 100%;
}
.button-label{
  font-weight:bold;
  font-size: larger;
}
.optionContainer{
  border: 1px solid rgba(var(--v-theme-black),0.5);
  border-radius: 5px;
  margin-bottom:0.5rem;
}.selected {
  border: 1px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}

.input{
  margin-left: 2.5rem;
  margin-right: 1rem;
}
.row{
  display: flex;
  gap:1rem;
}
</style>
