<script setup>
import { ref, watch, defineModel, toRaw } from 'vue'
import ScheduleChart from '@comp/utils/ScheduleChart.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { useTheme } from 'vuetify'
import { cloneDeep } from 'lodash'
import moment from 'moment'
import { computed } from 'vue'

const showSchedule = defineModel({ type: Boolean })

const emit = defineEmits(['applyAction', 'cancelAction'])

const theme = useTheme()
const store = useIndexStore()
const linksStore = useLinksStore()

const links = ref()
const nodes = ref()
const timeFormat = 'HH:mm:ss'
const tripKey = ref(0)
const startTime = ref('08:00:00')

function toSchedule(links) {
  let currentTime = moment(startTime.value, timeFormat)
  links.features.forEach(f => {
    f.properties.departures = [currentTime.format(timeFormat)]
    currentTime = currentTime.add(f.properties.time, 'seconds')
    f.properties.arrivals = [currentTime.format(timeFormat)]
  })
}

watch(showSchedule, (val) => {
  if (val) { store.changeNotification({ text: '', autoClose: true })
    links.value = cloneDeep(linksStore.editorLinks)
    nodes.value = cloneDeep(linksStore.editorNodes)
    tripKey.value = 0

    console.log(nodeHover.value)

    if (links.value.features[0].properties.arrivals === undefined) {
      // arrivals are undefined. Probably a headway based trip
      // Convert temporarely to schedule based trips
      toSchedule(links.value)
    }

    datasets.value = buildChartDataset(links.value)
    listOfTrips.value = getListOfTrips(datasets.value) }
})

// Chart Dataset
const datasets = ref()
function buildChartDataset(links) {
  let stackedData = []
  links.features.forEach(f => {
    stackedData.push({
      x: f.properties.departures,
      y: f.properties.a,
    })
    stackedData.push({
      x: f.properties.arrivals,
      y: f.properties.b,
    })
  })

  let datasets = []
  for (let i = 0; i < stackedData[0].x.length; i++) {
    // Node Hover
    let pointRadius = Array(stackedData.length).fill(4)
    if (i === tripKey.value && nodeHover.value !== undefined) {
      pointRadius[nodeHover.value] = 6
    }

    // Build Datasets
    datasets.push({
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
      borderWidth: (i === tripHover.value) ? 4 : 2,
      pointRadius: pointRadius,
    })
  }

  return datasets
}

function updateChartDatasets() {
  datasets.value = buildChartDataset(links.value)
  listOfTrips.value = getListOfTrips(datasets.value)
  checkSchedule()
}

// Station Label
const labelsChoices = computed(() => { return Object.keys(nodes.value.features[0].properties) })
const label = ref('index')

// List of Trip
const listOfTrips = ref([])
function getListOfTrips(datasets) {
  let listOfTrips
    = datasets.map(d => {
      return {
        title: d.data[0].x,
      } })
  return listOfTrips
}

function onClickTripList(val) {
  tripKey.value = val
  datasets.value = buildChartDataset(links.value)
}

// Trip Hover from List
const tripHover = ref()
function onMouseOverTripList(val) {
  tripHover.value = val
  datasets.value = buildChartDataset(links.value)
}

function onMouseLeaveTripList() {
  tripHover.value = null
  datasets.value = buildChartDataset(links.value)
}

function deleteTrip(val) {
  links.value.features.forEach(f => f.properties.departures.splice(val, 1))
  links.value.features.forEach(f => f.properties.arrivals.splice(val, 1))
  datasets.value = buildChartDataset(links.value)
  listOfTrips.value = getListOfTrips(datasets.value)
}

// Create New Trip
const showDialog = ref(false)
function openCreateNewTripDialog() {
  showDialog.value = true
}

function cancelNewTrip() {
  showDialog.value = false
  startTime.value = '08:00:00'
}

function createNewTrip() {
  showDialog.value = false
  // Compute the time differencial between template trip departure and new start time
  const templateStartTime = moment(links.value.features[0].properties.departures[tripKey.value], timeFormat)
  const timeDiff = moment.duration(moment(startTime.value, timeFormat).diff(templateStartTime)).asSeconds()
  // Append new departures and arrivals
  links.value.features.forEach(f => {
    let newDeparture = moment(f.properties.departures[tripKey.value], timeFormat).add(timeDiff, 'seconds')
    f.properties.departures.push(newDeparture.format(timeFormat))
    let newArrival = moment(f.properties.arrivals[tripKey.value], timeFormat).add(timeDiff, 'seconds')
    f.properties.arrivals.push(newArrival.format(timeFormat))
  })
  startTime.value = '08:00:00'
  updateChartDatasets()
}

// Node Hover from Schedule
const nodeHover = ref()
function mouseoverSchedule(key, type) {
  nodeHover.value = 2 * key
  if (type == 'arrivals') { nodeHover.value++ }
  updateChartDatasets()
}

function mouseleaveSchedule() {
  nodeHover.value = undefined
  updateChartDatasets()
}

// Checks on Schedule
const formErrorKey = ref([])
function checkSchedule() {
  const timeData = datasets.value[tripKey.value].data.map(d => d.x)
  let scheduleErrorKey = []
  for (let i = 0; i < timeData.length - 1; i++) {
    let a = moment(timeData[i], timeFormat)
    let b = moment(timeData[i + 1], timeFormat)
    if (moment.duration(b.diff(a)).asSeconds() < 0) {
      scheduleErrorKey.push(i)
    }
  }
  formErrorKey.value = scheduleErrorKey.map(e => {
    return {
      key: parseInt(e / 2),
      departure: (e % 2 === 0),
    }
  })
}

function save() {
  showSchedule.value = false
  let payload = []
  links.value.features.forEach(f => {
    payload.push({
      departures: toRaw(f.properties['departures']),
      arrivals: toRaw(f.properties['arrivals']),
    })
  })
  linksStore.editEditorLinksInfo(payload)
  emit('applyAction')
}

function ConvertToFrequencyTrip() {
  linksStore.deletePropertie({ name: 'departures', table: 'links' })
  linksStore.deletePropertie({ name: 'arrivals', table: 'links' })
  emit('applyAction')
  // return to a frequency base trip.
}

</script>
<template>
  <v-dialog
    v-model="showSchedule"
    scrollable
    persistent
    max-width="90rem"
  >
    <v-card
      max-height="60rem"
    >
      <v-card-title class="text-h5">
        {{ $gettext("Edit Schedule") }}
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-row style="min-height: 20rem">
          <v-col cols="3">
            <v-select
              v-model="label"
              :items="labelsChoices.sort()"
              prepend-inner-icon="fas fa-tag"
              density="compact"
              variant="outlined"
              :label="$gettext('Station Label')"
              @update:model-value="updateChartDatasets"
            />
            <v-card variant="outlined">
              <v-card-title>
                <v-row>
                  <v-col cols="9">
                    <h5> {{ $gettext("List of Trips") }} </h5>
                  </v-col>
                  <v-col
                    cols="3"
                    class="text-right"
                  >
                    <v-btn
                      color="primary"
                      size="small"
                      class="mx-2"
                      icon="fas fa-plus"
                      @click="openCreateNewTripDialog"
                    />
                  </v-col>
                </v-row>
              </v-card-title>
              <v-card-text>
                <v-list-item
                  v-for="(item, key) in listOfTrips"
                  :key="key"
                  :active="key === tripKey"
                  @click="onClickTripList(key)"
                  @mouseover="onMouseOverTripList(key)"
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
                      color="regular"
                      :disabled="listOfTrips.length === 1"
                      @click.stop="deleteTrip(key)"
                    />
                  </template>
                </v-list-item>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
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
                      :error="formErrorKey.find(o => o.key === key && o.departure == true)"
                      :error-messages="formErrorKey.find(o => o.key === key && o.departure == true)
                        ? $gettext('Invalid Time') : ''"
                      @update:model-value="updateChartDatasets"
                      @mouseover="mouseoverSchedule(key, 'departures')"
                      @mouseleave="mouseleaveSchedule()"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="item.properties.arrivals[tripKey]"
                      density="compact"
                      type="time"
                      step="1"
                      :error="formErrorKey.find(o => o.key === key && o.departure == false)"
                      :error-messages="formErrorKey.find(o => o.key === key && o.departure == false)
                        ? $gettext('Invalid Time') : ''"
                      @update:model-value="updateChartDatasets"
                      @mouseover="mouseoverSchedule(key, 'arrivals')"
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
          @click="emit('cancelAction')"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="success"
          variant="text"
          :disabled="formErrorKey.length > 0"
          @click="save"
        >
          {{ $gettext("Save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
