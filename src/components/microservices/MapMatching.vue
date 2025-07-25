<script setup lang="ts">
import { useMapMatchingStore } from '@src/store/MapMatching'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import s3 from '@src/AWSClient'
import { useGettext } from 'vue3-gettext'
import { FormData } from '@src/types/components'
import SimpleForm from '../common/SimpleForm.vue'
import { RunInputs } from '@src/types/api'
import Warning from '../utils/Warning.vue'
import Markdown from '../utils/Markdown.vue'
const { $gettext } = useGettext()

const runMapMatching = useMapMatchingStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const running = computed(() => runMapMatching.running)
const status = computed(() => runMapMatching.status)
const error = computed(() => runMapMatching.error)
const errorMessage = computed(() => runMapMatching.errorMessage)
const timer = computed(() => runMapMatching.timer)
const callID = computed(() => runMapMatching.callID)
const bucket = computed(() => runMapMatching.bucket)
const storeParameters = computed(() => runMapMatching.parameters)

const routeTypeList = computed(() =>
  Array.from(new Set(linksStore.links.features.map(link => link.properties.route_type))))

const parameters = ref<FormData[]>([
  {
    key: 'exclusions',
    label: $gettext('route_type exclusion'),
    value: null,
    items: routeTypeList.value,
    type: 'select',
    multiple: true,
    hint: 'routes type to not mapmatch (ex subway are not on roads)',
  },
  {
    key: 'SIGMA',
    label: 'Sigma',
    value: null,
    advanced: true,
    type: 'number',
    units: 'meters',
    rules: ['required'],
    hint: 'emission probablity constant. the bigger it \
    is the further away a stops can be from roads.',
  },
  {
    key: 'BETA',
    label: 'beta',
    value: null,
    advanced: true,
    type: 'number',
    units: 'meters',
    rules: ['required'],
    hint: 'transition probablity constant. The smaller the smaller  \
    the difference between the as-the-crow and routing distance can be (if use difference is true)',
  },
  {
    key: 'POWER',
    label: 'power',
    value: null,
    advanced: true,
    type: 'number',
    rules: ['required'],
    hint: 'Power used in the Emission Probability',
  },
  {
    key: 'DIFF',
    label: $gettext('Use difference'),
    value: null,
    advanced: true,
    type: 'boolean',
    units: 'bool',
    rules: ['required'],
    hint: 'If False, act_dist is ignore in the transition probability. This change the emission to only \
    consider the shortest path between nodes. ',
  },
  {
    key: 'ptMetrics',
    label: $gettext('Add indicators on road links'),
    value: null,
    type: 'boolean',
    units: 'bool',
    hint: 'Add PT metrics to road links (ex: number of trips & number of lines)',
  },
  {
    key: 'keepTime',
    label: $gettext('Keep PT time and calculate new PT speed'),
    value: true,
    type: 'boolean',
    units: 'bool',
    hint: 'if true. keep time and calculate speed. if false. keep speed and calcule time',
  }])

onMounted(() => {
  // remove nonExistant routeType from v-model selection (was deleted, or scen changed.)
  storeParameters.value.exclusions = storeParameters.value.exclusions.filter(el => routeTypeList.value.includes(el))
  parameters.value.forEach(param => param.value = storeParameters.value[param.key])
})

onBeforeUnmount(() => {
  runMapMatching.saveParams(parameters.value)
})

const formRef = ref()

async function start () {
  const resp = await formRef.value.validate()
  if (!resp) { return }
  const userStore = useUserStore()
  runMapMatching.saveParams(parameters.value)
  runMapMatching.running = true
  runMapMatching.setCallID()
  getApproxTimer()
  await exportFiles()
  const params = runMapMatching.parameters
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
  runMapMatching.start(inputs)
}

function getApproxTimer () {
  // same as in the python function. to decide the number of machine.
  const num_trips = linksStore.tripList.length
  let tot_num_iteration = num_trips / 6
  function get_num_machine(num_it: number, target_it = 20, choices = [12, 8, 4, 2, 1]) {
    // return the number of machine (in choices) required to have target_it per machine
    let num_machine = Math.floor(num_it / target_it)
    let best_diff = 100
    let best_val = 12
    for (let v of choices) { // choice of output
      let diff = Math.abs(num_machine - v)
      if (diff < best_diff) {
        best_diff = diff
        best_val = v
      }
    }
    return best_val
  }

  const num_machine = get_num_machine(tot_num_iteration, 20, [12, 8, 4, 2, 1])
  // spit and merge 10 secs each. maybe 20sec for MM prep + 1 sec per it. 10sec for export
  runMapMatching.timer = (tot_num_iteration / num_machine) + 20 + 20 + 10// 1 sec per it
}

async function exportFiles() {
  const promises = []
  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/road_links.geojson'),
    JSON.stringify(rlinksStore.rlinks)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/road_nodes.geojson'),
    JSON.stringify(rlinksStore.rnodes)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/links.geojson'),
    JSON.stringify(linksStore.links)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/nodes.geojson'),
    JSON.stringify(linksStore.nodes)))

  try {
    await Promise.all(promises)
  } catch (err: unknown) {
    console.log('err')
    const store = useIndexStore()
    store.changeAlert(err)
  }
}

function stopRun () { runMapMatching.stopExecution() }
const mdString = `
# Match PT network on road network
$Probability = Emission + Transmission$ , or\n 
$Probability = \\frac{1}{2} (\\frac{d_{proj}}{\\sigma} )^{power} + \\frac{1}{\\beta} |d_{dijkstra} - d_{acf}^{*}|$ \n 
\\* $d_{acf} = 0$ if use difference is false \n 

*Hidden Markov Map Matching Through Noise and Sparseness* \n
*Paul Newson and John Krumm 2009*
`

const showWarning = computed(() => rlinksIsEmpty.value || linksIsEmpty.value)

</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <Markdown :source="mdString" />
      <Warning
        :show="showWarning"
        :title="$gettext('need a road and a PT network')"
        type="warning"
      />
      <Warning
        :show="error"
        :messages="errorMessage"
      />
      <v-divider />

      <SimpleForm
        ref="formRef"
        v-model="parameters"
      >
        <v-card-actions>
          <v-btn
            variant="outlined"
            color="success"
            :loading="running"
            :disabled="running || (rlinksIsEmpty || linksIsEmpty)"
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
  </section>
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
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
.items {
  margin-bottom:0.3rem;
}
.alert{
  max-height: 10rem;
  overflow-y: auto;
}

</style>
