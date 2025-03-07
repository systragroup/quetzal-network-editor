<script setup>
import s3 from '@src/AWSClient'
import { useMRCStore } from '@src/store/MatrixRoadCaster'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'

import { ref, computed, onMounted } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const runMRC = useMRCStore()
const running = computed(() => { return runMRC.running })
const error = computed(() => { return runMRC.error })
const errorMessage = computed(() => { return runMRC.errorMessage })
const bucket = computed(() => { return runMRC.bucket })
const callID = computed(() => { return runMRC.callID })
const timer = computed(() => { return runMRC.timer })
const status = computed(() => { return runMRC.status })
const selectedZoneFile = ref(runMRC.zoneFile)

const rlinksStore = userLinksStore()
const store = useIndexStore()

const validForm = ref(true)
const showP = ref(false)
const otherFiles = computed(() => store.otherFiles.filter(el => el.extension === 'geojson').map(el => el.name))
const useZone = computed(() => parameters.value.filter(el => el.name == 'use_zone')[0].value)
const isGoogle = computed(() => parameters.value.filter(el => el.name == 'api')[0].value === 'google')

const parameters = ref([
  {
    name: 'api',
    text: 'Api',
    value: 'google',
    type: 'String',
    hint: 'api to use',
    items: ['google', 'here'],
    rules: [],
  },
  {
    name: 'use_zone',
    text: 'Use zone',
    value: false,
    type: 'Boolean',
    units: '',
    hint: 'use zone',
    rules: [
    ],
  },
  {
    name: 'num_zones',
    text: 'number of zones',
    value: null,
    type: 'Number',
    units: '',
    hint: 'number of zones. road nodes will be aggregate to form centroids',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    name: 'train_size',
    text: 'number of OD (api call)',
    value: null,
    type: 'Number',
    units: '',
    hint: 'number of OD to get from the API, the rest will be interpolated with ML',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    name: 'date_time',
    text: 'date Time',
    value: null,
    type: 'String',
    units: '',
    hint: 'HERE DateTime in the past. (YYYY-MM-DDTHH:MM:SS(UTC-timezone) (-04:00 for montreal)). Google: datetime in the future. The timezone is not used here (local timezone used)',
    rules: [
      'required', 'dateTimeRule', 'futureRule',
    ],
  },
  {
    name: 'ff_time_col',
    text: 'freeflow time on roads',
    value: null,
    items: rlinksStore.rlineAttributes,
    type: 'String',
    units: '',
    hint: 'road links time (link length / speed) to use as a first approximation. this is the freeflow speed, or speed limit',
    rules: [
      'required',
    ],
  },
  {
    name: 'max_speed',
    text: 'max speed on road',
    value: null,
    type: 'Number',
    units: '',
    hint: 'Maximum allowed speed on a road. applying an OD matrix on the road network could result il unrealistic speed if not used.',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    name: 'num_random_od',
    text: 'number of OD to plot',
    value: null,
    type: 'Number',
    units: '',
    hint: 'number of OD calibration plot to produce. those are random OD.',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    name: 'hereApiKey',
    text: 'api key',
    value: null,
    type: 'password',
    units: '',
    hint: 'Google or Here api key to download a set of OD',
    rules: [
      'required',
    ],
  },
])

onMounted(() => {
  // init params to the store ones.
  const storeParams = runMRC.parameters
  parameters.value.forEach(param => param.value = storeParams[param.name])
})

function getApproxTimer () {
  // payload is number of road links
  const numZones = runMRC.parameters.num_zones
  const trainSize = runMRC.parameters.train_size
  const numPlotOD = runMRC.parameters.num_random_od
  // API call time (1.8sec per call), 15 iteration X number of links, loadning saving, plotting 15sec.
  runMRC.timer = Math.min(numZones, trainSize) * 1.8 + rlinksStore.rlinks.features.length * 0.002 + 15
  runMRC.timer += 10 * numPlotOD // 10 sec per plots
}

async function exportFiles() {
  try {
    await s3.putObject(
      bucket.value,
      callID.value.concat('/road_links.geojson'),
      JSON.stringify(rlinksStore.rlinks))
    await s3.putObject(
      bucket.value,
      callID.value.concat('/road_nodes.geojson'),
      JSON.stringify(rlinksStore.rnodes))

    if (parameters.value.use_zone) {
      const store = useIndexStore()
      const userStore = useUserStore()
      const name = selectedZoneFile.value
      const file = store.otherFiles.filter(el => el.name === name)[0]
      if (file.content == null && userStore.model !== null) {
        file.content = await s3.readBytes(userStore.model, userStore.scenario + '/' + file.path)
      }
      await s3.putObject(
        bucket.value,
        callID.value.concat('/zones.geojson'),
        file.content)
    }
  } catch (err) {
    const store = useIndexStore()
    store.changeAlert(err)
  }
}

async function run (event) {
  const resp = await event
  if (!resp.valid) { return }
  runMRC.setCallID()
  const inputs = { callID: callID.value }
  parameters.value.forEach(item => {
    inputs[item.name] = item.value
  })
  runMRC.setParameters(inputs)
  console.log('exporting roads to s3')
  runMRC.running = true
  getApproxTimer()
  await exportFiles()
  runMRC.startExecution(runMRC.parameters)
}

function stopRun () { runMRC.stopExecution() }

const showHint = ref(false)
// eslint-disable-next-line max-len, no-useless-escape
const re = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
const rules = {
  required: v => !!v || $gettext('Required'),
  largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
  nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
  dateTimeRule: v => re.test(v) || $gettext('invalid date time'),
  futureRule: v => (isGoogle.value && (Date.parse(v) > Date.now())) || $gettext('datetime must be in the future'),
}

</script>
<template>
  <v-row class="ma-0 pa-2 background">
    <v-col>
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('ML Matrix Road Caster') }}
        </v-card-title>
        <p> {{ $gettext('1) Find n zones centroids using a Kmean clustering on the nodes') }}</p>
        <p> {{ $gettext('   or import and use your own zoning.') }}</p>
        <p> {{ $gettext('2) Call the Here Matrix API on random OD ( around 1% is sufficient )') }}</p>
        <p> {{ $gettext('3) Interpolate every other OD time with an hybrid Machine learning model') }}</p>
        <p> {{ $gettext('4) ajust the speed on the road network to match the routing time with the OD time using an iterative algorithm') }}</p>
        <v-alert
          v-if="error"
          class="alert"
          density="compact"
          variant="outlined"
          text
          type="error"
        >
          {{ $gettext("Service ended with an execution error or have been aborted. \
            Please retry. If the problem persist, contact us.") }}
          <p
            v-for="key in Object.keys(errorMessage)"
            :key="key"
          >
            <b>{{ key }}: </b>{{ errorMessage[key] }}
          </p>
        </v-alert>
        <v-form
          @submit.prevent="run"
        >
          <div
            v-for="(item, key) in parameters"
            :key="key"
          >
            <v-text-field
              v-if="item.type==='password'"
              v-model="item.value"
              :type="showP ? 'text' : 'password'"
              :append-icon="showP ? 'fas fa-eye' : 'fas fa-eye-slash'"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @click:append="showP = !showP"
            />
            <v-row
              v-else-if="item.type === 'Boolean'"
              class="zone-row"
            >
              <v-switch
                v-model="item.value"
                class="pr-2"
                color="primary"
                variant="underlined"
                :label="$gettext(item.text)"
                :hint="showHint? $gettext(item.hint): ''"
                :persistent-hint="showHint"
                :rules="item.rules.map((rule) => rules[rule])"
              />
              <v-select
                v-model="selectedZoneFile"
                :items="otherFiles"
                :disabled="!useZone"
              />
            </v-row>

            <v-text-field
              v-else-if="typeof item.items === 'undefined'"
              v-model="item.value"
              :disabled="useZone && item.name === 'num_zones'"
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
              :items="item.items.sort()"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @wheel="()=>{}"
            />
          </div>
          <v-card-actions>
            <v-btn
              color="success"
              variant="elevated"
              :loading="running"
              :disabled="running || !validForm"
              type="submit"
              prepend-icon=" fa-solid fa-play"
            >
              {{ $gettext("Run") }}
            </v-btn>
            <v-btn
              v-show="running & status === 'RUNNING'"
              color="grey"
              variant="text"
              @click="stopRun()"
            >
              {{ $gettext("Abort") }}
            </v-btn>
            <v-card-text v-show="running">
              ~ {{ timer>0? Math.ceil(timer/60): $gettext('less than 1') }}{{ $gettext(' minutes remaining') }}
            </v-card-text>
            <v-spacer />
            <v-btn

              size="small"
              @click="showHint = !showHint"
            >
              <v-icon>far fa-question-circle small</v-icon>
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>

.card {
  height: 85vh;
  width:50vw;
  overflow-y: auto;
  padding: 2.5rem;
  background-color: rgb(var(--v-theme-lightergrey));
}
.card2 {
  height: 85vh;
  overflow-y: auto;
  padding: 2.5rem;
  margin-right: 3rem;
  background-color: rgb(var(--v-theme-lightergrey));
}
.zone-row {
  padding:1rem;
}
.row {
  height: 100%
}
.col {
  max-height: 100%;
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
.card button {
  margin-top: 0;
}
.background {
  background-color:var(--v-background-base);
  overflow-y: auto;
}
div.gallery {
  margin: 5px;
  background-color: var(--v-white-base);
  border: 1px solid var(--v-lightgrey-base);
  float: left;
  width: 50rem;
}
div.gallery:hover {
  border: 1px solid var(--v-darkgrey-base);
}
div.gallery img {
  width: 100%;
  height: auto;
}
.alert{
  max-width: 100%;
  min-height: 5rem;
  overflow-y: scroll;
}
</style>
