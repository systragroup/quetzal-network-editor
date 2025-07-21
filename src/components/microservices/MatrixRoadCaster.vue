<script setup lang="ts">
import s3 from '@src/AWSClient'
import { useMRCStore } from '@src/store/MatrixRoadCaster'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'

import { ref, computed, onMounted } from 'vue'
import { useGettext } from 'vue3-gettext'
import { FormData } from '@src/types/components'
import Warning from '../utils/Warning.vue'
import SimpleForm from '../common/SimpleForm.vue'
import Markdown from '../utils/Markdown.vue'
import { getRules } from '@src/utils/form'
const { $gettext } = useGettext()

const runMRC = useMRCStore()
const running = computed(() => runMRC.running)
const error = computed(() => runMRC.error)
const errorMessage = computed(() => runMRC.errorMessage)
const bucket = computed(() => runMRC.bucket)
const callID = computed(() => runMRC.callID)
const timer = computed(() => runMRC.timer)
const status = computed(() => runMRC.status)
const storeParameters = computed(() => runMRC.parameters)

const selectedZoneFile = ref(runMRC.zoneFile)

const rlinksStore = userLinksStore()
const store = useIndexStore()

const otherFiles = computed(() => store.otherFiles.filter(el => el.extension === 'geojson').map(el => el.name))
const useZone = computed(() => storeParameters.value.use_zone)

const parameters = ref<FormData[]>([
  {
    key: 'api',
    label: 'Api',
    value: 'google',
    type: 'select',
    hint: 'api to use',
    items: ['google', 'here'],
    rules: [],
  },
  {
    key: 'use_zone',
    label: 'Use zone',
    value: false,
    type: 'boolean',
    units: '',
    hint: 'use zone',
    rules: [
    ],
  },
  {
    key: 'num_zones',
    label: 'number of zones',
    value: null,
    type: 'number',
    disabled: false,
    units: '',
    hint: 'number of zones. road nodes will be aggregate to form centroids',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    key: 'train_size',
    label: 'number of OD (api call)',
    value: null,
    type: 'number',
    units: '',
    hint: 'number of OD to get from the API, the rest will be interpolated with ML',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    key: 'date_time',
    label: 'date Time',
    value: null,
    type: 'string',
    units: '',
    hint: 'HERE DateTime in the past. (YYYY-MM-DDTHH:MM:SS(UTC-timezone) (-04:00 for montreal)). Google: datetime in the future. The timezone is not used here (local timezone used)',
    rules: ['required', dateTimeRule, futureRule],
  },
  {
    key: 'ff_time_col',
    label: 'freeflow time on roads',
    value: null,
    items: rlinksStore.rlineAttributes,
    type: 'select',
    units: '',
    hint: 'road links time (link length / speed) to use as a first approximation. this is the freeflow speed, or speed limit',
    rules: [
      'required',
    ],
  },
  {
    key: 'max_speed',
    label: 'max speed on road',
    value: null,
    type: 'number',
    units: '',
    hint: 'Maximum allowed speed on a road. applying an OD matrix on the road network could result il unrealistic speed if not used.',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    key: 'num_random_od',
    label: 'number of OD to plot',
    value: null,
    type: 'number',
    units: '',
    hint: 'number of OD calibration plot to produce. those are random OD.',
    rules: [
      'required', 'largerThanZero',
    ],
  },
  {
    key: 'hereApiKey',
    label: 'api key',
    value: null,
    type: 'string',
    units: '',
    hint: 'Google or Here api key to download a set of OD',
    rules: [
      'required',
    ],
  },
])

onMounted(() => {
  // init params to the store ones.
  parameters.value.forEach(param => param.value = storeParameters.value[param.key])
})

function change(item: FormData) {
  // save params on change.
  runMRC.saveParam(item)
  // disabled num_zones if useZone
  parameters.value.filter(el => el.key === 'num_zones')[0].disabled = useZone.value
}

function getApproxTimer () {
  const numZones = storeParameters.value.num_zones
  const trainSize = storeParameters.value.train_size
  const numPlotOD = storeParameters.value.num_random_od
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

    if (useZone.value) {
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

// Start

const formRef = ref()

async function start () {
  const resp = await formRef.value.validate()
  if (!resp) { return }
  runMRC.setCallID()
  runMRC.running = true
  runMRC.saveParams(parameters.value)
  getApproxTimer()
  await exportFiles()
  const input = { callID: callID.value, ...storeParameters.value }
  runMRC.start(input)
}

function stopRun () { runMRC.stopExecution() }

// rules

const isGoogle = computed(() => storeParameters.value.api === 'google')

// eslint-disable-next-line max-len, no-useless-escape
const re = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
function dateTimeRule(v: string) {
  return re.test(v) || $gettext('invalid date time') }
function futureRule(v: string) {
  return (isGoogle.value && (Date.parse(v) > Date.now())) || $gettext('datetime must be in the future') }

const showPassword = ref(false)
const mdString = $gettext(`
# ML Matrix Road Caster
  1) Find n zones centroids using a Kmean clustering on the nodes or use your own zoning.
  2) Call the Google or Here Matrix API on random OD ( around 1% is sufficient )
  3) Interpolate every other OD time with an hybrid Machine learning model
  4) ajust the speed on the road network to match the routing time with the OD time using an iterative algorithm') 
`)

</script>
<template>
  <v-card class="card">
    <Markdown :source="mdString" />
    <Warning
      :show="error"
      :messages="errorMessage"
    />

    <SimpleForm
      ref="formRef"
      v-model="parameters"
      @change="change"
    >
      <template #use_zone="{item, showHint}">
        <div class="zone-row">
          <v-switch
            v-model="item.value"
            class="pr-2"
            color="primary"
            variant="underlined"
            :label="$gettext(item.label)"
            :hint="showHint? item.hint: ''"
            :persistent-hint="showHint"
            @change="change(item)"
          />
          <v-select
            v-model="selectedZoneFile"
            :items="otherFiles"
            :disabled="!useZone"
            @change="change(item)"
          />
        </div>
      </template>
      <template #hereApiKey="{item, showHint}">
        <v-text-field
          v-model="item.value"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'fas fa-eye' : 'fas fa-eye-slash'"
          :label="$gettext(item.label)"
          :suffix="item.units"
          :hint="showHint? item.hint: ''"
          :persistent-hint="showHint"
          :rules="getRules(item.rules)"
          @click:append="showPassword = !showPassword"
          @change="change(item)"
        />
      </template>

      <v-card-actions>
        <v-btn
          variant="outlined"
          color="success"
          :loading="running"
          @click="start"
        >
          {{ $gettext("Process") }}
        </v-btn>
        <v-btn
          v-show="running && status === 'RUNNING'"
          color="grey"
          variant="text"
          @click="stopRun()"
        >
          {{ $gettext("Abort") }}
        </v-btn>
        <v-card-text v-show="running">
          ~ {{ timer>0? Math.ceil(timer/60): $gettext('less than 1') }}{{ $gettext(' minutes remaining') }}
        </v-card-text>
      </v-card-actions>
    </SimpleForm>
  </v-card>
</template>
<style lang="scss" scoped>

.card {
  background-color: rgb(var(--v-theme-lightergrey));
  margin:1rem;
  max-height: 85vh;
  width: 50rem;
  overflow-y: auto;
  padding: 2rem;
}
.zone-row {
  display:flex;
  flex-direction: row;
}
.subtitle {
  font-size: 2em;
  color:var(--v-secondary-dark);
  font-weight: bold;
  margin: 10px;
  margin-left: 0;
}
.background {
  background-color:var(--v-background-base);
  overflow-y: auto;
}

</style>
