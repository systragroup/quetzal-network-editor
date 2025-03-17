<script setup lang="ts">
import { useTransitStore } from '@src/store/Transit'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, onMounted, onBeforeUnmount, toRaw } from 'vue'
import s3 from '@src/AWSClient'
import { useGettext } from 'vue3-gettext'
import { FormData } from '@src/types/components'
import SimpleForm from '../common/SimpleForm.vue'
import { RunInputs } from '@src/types/api'
import Warning from '../utils/Warning.vue'
import { useODStore } from '@src/store/od'
import Markdown from '../utils/Markdown.vue'
const { $gettext } = useGettext()
const indexStore = useIndexStore()
const runTransit = useTransitStore()
const linksStore = useLinksStore()
const odStore = useODStore()

// const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const odIsEmpty = computed(() => odStore.layerIsEmpty)
const running = computed(() => runTransit.running)
const status = computed(() => runTransit.status)
const error = computed(() => runTransit.error)
const errorMessage = computed(() => runTransit.errorMessage)
const callID = computed(() => runTransit.callID)
const bucket = computed(() => runTransit.bucket)
const storeParameters = computed(() => runTransit.parameters)
const population = computed(() => indexStore.otherFiles.filter(file => file.path === 'inputs/population.geojson')[0])

const filesMissing = computed(() => linksIsEmpty.value)

const footpaths = ref<FormData[]>([
  {
    key: 'max_length',
    label: $gettext('Footpaths max length'),
    value: null,
    disabled: false,
    type: 'number',
    units: 'metres',
    hint: 'as the crow flight walking speed',
    rules: ['required', 'nonNegative'],
  },
  {
    key: 'speed',
    label: $gettext('Footpaths speed'),
    value: null,
    disabled: false,
    units: 'km/h',
    type: 'number',
    hint: 'max length for a footpath (walk distance between stations)',
    rules: ['required', 'largerThanZero'],
  },
  {
    key: 'n_ntlegs',
    label: $gettext('Footpaths number of connection'),
    value: null,
    disabled: false,
    type: 'number',
    hint: 'number of connection between the origin (or destination) and the footpaths',
    rules: ['required', 'largerThanZero'],
  },
])

const catchmentRadius = ref<FormData[]>([])

const parameters = computed(() => [...catchmentRadius.value, ...footpaths.value])

function createCatchmentRadius(key: string): FormData {
  return {
    key: key,
    label: `${key} catchment Radius`,
    value: 500,
    type: 'number',
    units: 'metres',
    hint: 'vehicle type catchment radius',
    rules: ['required', 'nonNegative'],
  }
}

const routeTypeList = computed(() =>
  Array.from(new Set(linksStore.links.features.map(link => link.properties.route_type))))

function initCatchmentRadius() {
  routeTypeList.value.forEach(type => catchmentRadius.value.push(createCatchmentRadius(type)))
  const storeKeys = new Set(Object.keys(storeParameters.value.catchment_radius))
  // init Local Params to store params if exist
  catchmentRadius.value.forEach(param => {
    if (storeKeys.has(param.key)) param.value = storeParameters.value.catchment_radius[param.key]
  })
  // delete store param if it doesnt exist anymore.
  const catchmentKeys = new Set(routeTypeList.value)
  storeKeys.forEach(key => {
    if (!catchmentKeys.has(key)) delete storeParameters.value.catchment_radius[key] })
}

function initFootpaths() {
  footpaths.value.forEach(param => param.value = storeParameters.value.footpaths[param.key])
}

onMounted(() => {
  initFootpaths()
  initCatchmentRadius()
})

onBeforeUnmount(() => {
  saveParams()
})

function saveParams() {
  runTransit.saveParams({ footpaths: footpaths.value, catchment_radius: catchmentRadius.value })
}

const formRef = ref()

async function start () {
  const resp = await formRef.value.validate()
  if (!resp) { return }
  saveParams()
  const userStore = useUserStore()
  runTransit.running = true
  runTransit.setCallID()
  await exportFiles()
  const params = toRaw(runTransit.parameters)
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
  runTransit.startExecution(inputs)
}

async function exportFiles() {
  const promises = []
  try {
    promises.push(s3.putObject(
      bucket.value,
      callID.value.concat('/inputs/pt/links.geojson'),
      JSON.stringify(linksStore.links)))

    promises.push(s3.putObject(
      bucket.value,
      callID.value.concat('/inputs/pt/nodes.geojson'),
      JSON.stringify(linksStore.nodes)))

    if (!odIsEmpty.value) {
      promises.push(s3.putObject(
        bucket.value,
        callID.value.concat('/inputs/od/od.geojson'),
        JSON.stringify(odStore.layer)))
    }

    if (population.value) {
      promises.push(s3.putObject(
        bucket.value,
        callID.value.concat('/inputs/population.geojson'),
        JSON.stringify(population.value.content)))
    }

    await Promise.all(promises)
  } catch (err: unknown) {
    const store = useIndexStore()
    store.changeAlert(err)
    runTransit.running = false
  }
}

function stopRun () { runTransit.stopExecution() }
const mdString = `
# Transit Analysis
## inputs
* **PT network**
* **inputs/population.geojson** (optional) with **density** in $\\frac{people}{km^2}$.\n
* **road network** (optional)
* od/od.geojson (optional) 
## outputs
* metrics (.csv) per **route_id** and **route_type**. \n
* the path used by each OD (*If OD are provided*).
* catchemnt radius on each PT nodes
`
</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <Markdown
        :source="mdString"
      />
      <Warning
        :show="filesMissing"
        :title="$gettext('need PT network')"
        type="warning"
      />
      <Warning
        :show="error"
        :messages="errorMessage"
      />
      <v-spacer />
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
            :disabled="running || filesMissing"
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
