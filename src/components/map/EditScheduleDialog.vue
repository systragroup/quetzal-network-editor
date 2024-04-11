<script setup>
import { ref } from 'vue'
import ScheduleChart from './ScheduleChart.vue'
import { useLinksStore } from '@src/store/links'
import { useTheme } from 'vuetify'
import { cloneDeep } from 'lodash'
import moment from 'moment'

const theme = useTheme()
const linksStore = useLinksStore()

const links = ref(cloneDeep(linksStore.editorLinks))
const timeFormat = 'HH:mm:ss'
const tripKey = ref(0)
const tripHover = ref()
const showDialog = ref(false)
const startTime = ref('08:00:00')

// FUNCTIONS
function toSchedule(links) {
  let currentTime = moment(startTime.value, timeFormat)
  links.features.forEach(f => {
    f.properties.departures = [currentTime.format(timeFormat)]
    currentTime = currentTime.add(f.properties.time, 'seconds')
    f.properties.arrivals = [currentTime.format(timeFormat)]
  })
}

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
    datasets.push({
      id: i,
      data: stackedData.map(d => {
        return {
          x: d.x[i],
          y: d.y,
        } }),

      backgroundColor: (i === tripKey.value)
        ? theme.current.value.colors.secondary
        : theme.current.value.colors.lightgrey,
      borderColor: (i === tripKey.value)
        ? theme.current.value.colors.primary
        : theme.current.value.colors.lightgrey,
      borderWidth: (i === tripHover.value) ? 5 : 3,
    })
  }

  return datasets
}

if (links.value.features[0].properties.arrivals === undefined) {
  // arrivals are undefined. Probably a headway based trip
  // Convert temporarely to schedule based trips
  toSchedule(links.value)
}

// Chart Datasets
const datasets = ref(buildChartDataset(links.value))

function updateChartDatasets() {
  datasets.value = buildChartDataset(links.value)
  listOfTrips.value = getListOfTrips(datasets.value)
}

// List of Trip
function getListOfTrips(datasets) {
  let listOfTrips
    = datasets.map(d => {
      return {
        value: d.id,
        title: 'Starts at ' + d.data[0].x,
      } })
  return listOfTrips
}

const listOfTrips = ref(getListOfTrips(datasets.value))

function onClickTripList(val) {
  tripKey.value = val
  datasets.value = buildChartDataset(links.value)
}

function onMouseOverTripList(val) {
  tripHover.value = val
  datasets.value = buildChartDataset(links.value)
}

function onMouseLeaveTripList() {
  tripHover.value = null
  datasets.value = buildChartDataset(links.value)
}

function openCreateNewTripDialog() {
  showDialog.value = true
}

function cancelNewTrip() {
  showDialog.value = false
  startTime.value = '08:00:00'
}

function createNewTrip() {
  showDialog.value = false
  let currentTime = moment(startTime.value, timeFormat)
  links.value.features.forEach(f => {
    f.properties.departures.push(currentTime.format(timeFormat))
    currentTime = currentTime.add(f.properties.time, 'seconds')
    f.properties.arrivals.push(currentTime.format(timeFormat))
  })
  startTime.value = '08:00:00'
  updateChartDatasets()
}

</script>
<template>
  <v-row style="height: 40rem">
    <v-col cols="3">
      <v-card>
        <v-card-title>
          <v-row>
            <v-col cols="9">
              <h5> List of Trips </h5>
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
            v-for="item in listOfTrips"
            :key="item.value"
            :active="item.value == tripKey"
            :title="item.title"
            @click="onClickTripList(item.value)"
            @mouseover="onMouseOverTripList(item.value)"
            @mouseleave="onMouseLeaveTripList"
          />
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="6">
      <ScheduleChart
        :data="{datasets}"
      />
    </v-col>
    <v-col cols="3">
      <v-form
        style="height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        padding-top: 20px;
        padding-bottom: 50px"
      >
        <div
          v-for="(item, key) in links.features"
          :key="key"
        >
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="item.properties.departures[tripKey]"
                :label="item.properties.a"
                type="time"
                step="1"
                @update:model-value="updateChartDatasets"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="item.properties.arrivals[tripKey]"
                :label="item.properties.b"
                type="time"
                step="1"
                @update:model-value="updateChartDatasets"
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
          label="Start Time"
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
</template>
