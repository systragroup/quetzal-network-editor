<script setup>
import { ref, watch, toRaw, computed } from 'vue'
import ScheduleChart from '@comp/utils/ScheduleChart.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { useTheme } from 'vuetify'
import { cloneDeep } from 'lodash'
import { isScheduleTrip, hhmmssToSeconds, secondsTohhmmss, hash } from '@src/utils/utils'

import SimpleDialog from '@src/components/utils/SimpleDialog.vue'

const showSchedule = defineModel({ type: Boolean })

const emit = defineEmits(['applyAction', 'cancelAction', 'toggle'])

const theme = useTheme()
const store = useIndexStore()
const linksStore = useLinksStore()

const links = ref()
const nodes = computed(() => linksStore.editorNodes)
const tripKey = ref(0)
const startTime = ref('08:00:00')

const initialHash = ref()

function toSchedule(links) {
  let currentTime = hhmmssToSeconds(startTime.value)
  links.features.forEach(f => {
    f.properties.departures = [secondsTohhmmss(currentTime)]
    currentTime = currentTime + f.properties.time
    f.properties.arrivals = [secondsTohhmmss(currentTime)]
  })
}

watch(showSchedule, (val) => {
  if (val) { store.changeNotification({ text: '', autoClose: true })
    links.value = cloneDeep(linksStore.editorLinks)
    initialHash.value = hash(JSON.stringify(links.value))
    tripKey.value = 0
    if (!isScheduleTrip(links.value.features[0])) {
      // arrivals are undefined. Probably a headway based trip
      // Convert temporarely to schedule based trips
      toSchedule(links.value)
    }

    buildChartDataset()
  }
})

// Station Label
const labelsChoices = computed(() => {
  if (nodes.value.features.length > 0) {
    return Object.keys(nodes.value.features[0].properties)
  } else { return [] }
})
const label = ref('index')

// List of Trip

const listOfTrips = computed(() => {
  const list = datasets.value.map(d => { return { title: d.data[0].x } })
  return list
})

// Create New Trip
const showDialog = ref(false)
function openCreateNewTripDialog() {
  showDialog.value = true
}

function cancelNewTrip() {
  showDialog.value = false
  startTime.value = '08:00:00'
}

function findInsertIndex(arr, num) {
  // return index to insert
  // ex: arr = [8,10,12,16] & num = 9 => return 1. if smaller return 0 if larger return len(arr)
  const index = arr.findIndex(element => element >= num)
  // Handle case when the number is larger than all elements
  return index === -1 ? arr.length : index
}

function createNewTrip() {
  showDialog.value = false
  const departuresList = links.value.features[0].properties.departures.map(el => hhmmssToSeconds(el))
  const startTimeSecs = hhmmssToSeconds(startTime.value)
  // get the position to append the new Ttrip (if we add 9h to [8h, 10h], we have [8h, 9h, 10h])
  const index = findInsertIndex(departuresList, startTimeSecs)

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
  startTime.value = '08:00:00'
  buildChartDataset()
}

function deleteTrip(val) {
  links.value.features.forEach(f => f.properties.departures.splice(val, 1))
  links.value.features.forEach(f => f.properties.arrivals.splice(val, 1))
  if (tripKey.value === listOfTrips.value.length - 1) {
    tripKey.value -= 1
  }

  buildChartDataset()
}

// Checks on Schedule
const formErrorKey = computed(() => {
  const timeData = datasets.value[tripKey.value].data.map(d => d.x)
  let scheduleErrorKey = []
  for (let i = 0; i < timeData.length - 1; i++) {
    let a = hhmmssToSeconds(timeData[i])
    let b = hhmmssToSeconds(timeData[i + 1])
    if ((b - a) < 0) {
      scheduleErrorKey.push(i)
    }
  }
  return scheduleErrorKey.map(e => {
    return {
      key: parseInt(e / 2),
      departure: (e % 2 === 0),
    }
  })
})

function applyChanges() {
  let payload = []
  links.value.features.forEach(f => {
    payload.push({
      departures: toRaw(f.properties['departures']),
      arrivals: toRaw(f.properties['arrivals']),
    })
  })
  linksStore.editEditorLinksInfo(payload)
}

function saveAndQuit() {
  applyChanges()
  emit('applyAction')
}

function ConvertToFrequencyTrip() {
  linksStore.deleteEditorLinksPropertie({ name: 'departures' })
  linksStore.deleteEditorLinksPropertie({ name: 'arrivals' })
  emit('applyAction')
  // return to a frequency base trip.
}

function cancel() {
  emit('cancelAction')
}

// Chart Dataset
const datasets = ref([])
function buildChartDataset() {
  let stackedData = []
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

  let datas = []
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
function mouseoverSchedule(key, type) {
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

function onClickTripList(val) {
  tripKey.value = val
  buildChartDataset()
}

// Trip Hover from List
const tripHover = ref()
function onMouseOverTripList(val) {
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
function handleSimpleDialog(event) {
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
      </v-card-title>

      <v-divider />
      <v-card-text>
        <v-row style="min-height: 20rem">
          <v-col cols="2">
            <v-select
              v-model="label"
              :items="labelsChoices.sort()"
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
                    {{ item.title }}
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
        <v-dialog
          v-model="showDialog"
          max-width="20rem"
          persistent
        >
          <v-card>
            <v-card-text>
              <h4>Create New Trip</h4>
            </v-card-text>
            <v-card-text>
              <v-text-field
                v-model="startTime"
                :label="$gettext('Start Time')"
                type="time"
                step="1"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="grey"
                variant="text"
                @click="cancelNewTrip"
              >
                {{ $gettext("Cancel") }}
              </v-btn>

              <v-btn
                color="green-darken-1"
                variant="text"
                @click="createNewTrip"
              >
                {{ $gettext("Save") }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
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
    body=""
    confirm-color="primary"
    :confirm-button="$gettext('Yes')"
    :cancel-button="$gettext('No')"
    @confirm="handleSimpleDialog(true)"
    @cancel="handleSimpleDialog(false)"
  >
    <v-btn
      @click="showSaveDialog=false"
    >
      {{ $gettext('Cancel') }}
    </v-btn>
  </SimpleDialog>
</template>

<style lang="scss" scoped>
.trip-ls-title{
  padding: 1.2rem;
  align-items: center;
  justify-content: space-between;
}
</style>
