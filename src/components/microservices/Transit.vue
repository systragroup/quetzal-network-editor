<script setup lang="ts">
import { useTransitStore } from '@src/store/Transit'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, onMounted, onBeforeUnmount, toRaw } from 'vue'
import s3 from '@src/AWSClient'
import { VariantFormData } from '@src/types/components'
import VariantForm from '../common/VariantForm.vue'
import { RunInputs } from '@src/types/api'
import Warning from '../utils/Warning.vue'
import { useODStore } from '@src/store/od'
import Markdown from '../utils/Markdown.vue'
import { useGettext } from 'vue3-gettext'
import { TransitParams, TransitParamsObject } from '@src/types/typesStore'
import { cloneDeep } from 'lodash'

const { $gettext } = useGettext()
const indexStore = useIndexStore()
const runTransit = useTransitStore()
const linksStore = useLinksStore()
const odStore = useODStore()

// const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const odIsEmpty = computed(() => odStore.layerIsEmpty)
const stateMachineArn = computed(() => runTransit.stateMachineArn)
const running = computed(() => runTransit.running)
const status = computed(() => runTransit.status)
const error = computed(() => runTransit.error)
const errorMessage = computed(() => runTransit.errorMessage)
const callID = computed(() => runTransit.callID)
const bucket = computed(() => runTransit.bucket)
const storeParameters = computed(() => runTransit.parameters)
const population = computed(() => indexStore.otherFiles.filter(file => file.path === 'inputs/population.geojson')[0])

const filesMissing = computed(() => linksIsEmpty.value)

const parameters = ref<VariantFormData[]>([])

const paramModel: Record<string, VariantFormData> = {
  use_road_network: {
    key: 'use_road_network', label: $gettext('use road network'), value: null,
    type: 'boolean', variant: false, category: 'general',
    hint: 'Use road network nodes to compute population mesh (population is distributed on road nodes.)',
    rules: ['required', 'nonNegative'],
  },
  step_size: {
    key: 'step_size', label: $gettext('Population mesh size (0.001 ~100m)'), value: null,
    type: 'number', variant: false, category: 'general',
    units: 'degree', hint: 'Population is created from zones as a mesh of point with this distance',
    rules: ['required', 'nonNegative'],
  },
  max_length: {
    key: 'max_length', label: $gettext('Footpaths max length'), value: null,
    type: 'number', units: 'metres', variant: true, category: 'footpaths',
    hint: 'as the crow flight walking speed', rules: ['required', 'nonNegative'],
  },
  speed: {
    key: 'speed', label: $gettext('Footpaths speed'), value: null,
    type: 'number', units: 'km/h', variant: true, category: 'footpaths',
    hint: 'max length for a footpath (walk distance between stations)', rules: ['required', 'largerThanZero'],
  },
  n_ntlegs: {
    key: 'n_ntlegs', label: $gettext('Footpaths number of connections'), value: null,
    type: 'number', variant: true, category: 'footpaths',
    hint: 'number of connection between the zones and the footpaths', rules: ['required', 'largerThanZero'],
  },
  catchment_radius: {
    key: 'catchment_radius', label: $gettext('Catchment radius'), value: 500,
    type: 'number', units: 'metres', variant: true, category: 'catchment_radius',
    hint: 'vehicle type catchment radius', rules: ['required', 'nonNegative'],
  },
}

function createForm(params: TransitParamsObject<any>[], key: string) {
  const formList: VariantFormData[] = []
  params.forEach(param => {
    const model = cloneDeep(paramModel[key])
    model.value = param.value
    if (param.variant) { model.key = `${key}#${param.variant}` }
    formList.push(model)
  })
  return formList
}

function createCatchmentForm(params: TransitParamsObject<number>[], route_type: string) {
  const formList: VariantFormData[] = []
  params.forEach(param => {
    const model = cloneDeep(paramModel.catchment_radius)
    model.value = param.value
    model.label = `${route_type} ${model.label}`
    if (param.variant) {
      model.key = `${route_type}#${param.variant}`
    }
    else {
      model.key = route_type
    }
    formList.push(model)
  })
  return formList
}

function initCatchmentRadius() {
  // get routeTypes in Transit parameters and in the links.
  // will add missing one and delete non existing one (if delete metro, remove metro catchment_radius)
  const storeKeys = new Set(Object.keys(storeParameters.value.catchment_radius))
  const routeTypesSet = new Set(linksStore.links.features.map(link => link.properties.route_type))

  // add new route_types to the store (new catchment radius for it)
  const keysToAdd = Array.from(routeTypesSet).filter(el => !storeKeys.has(el))
  keysToAdd.forEach((route_type) => runTransit.addCatchmentRadius(route_type))

  // delete storeParam if route_type doesnt exist anymore.
  const keysToDelete = Array.from(storeKeys).filter(el => !routeTypesSet.has(el))
  keysToDelete.forEach((route_type) => runTransit.deleteCatchmentRadius(route_type))
}

function createCatchmentRadiusForm() {
  const keys = Object.keys(storeParameters.value.catchment_radius)
  keys.forEach(route_type => {
    parameters.value.push(...createCatchmentForm(storeParameters.value.catchment_radius[route_type], route_type))
  })
}

function createGeneralForm() {
  parameters.value.push(...createForm(storeParameters.value.general.step_size, 'step_size'))
  parameters.value.push(...createForm(storeParameters.value.general.use_road_network, 'use_road_network'))
}

function createFootpathsForm() {
  parameters.value.push(...createForm(storeParameters.value.footpaths.max_length, 'max_length'))
  parameters.value.push(...createForm(storeParameters.value.footpaths.n_ntlegs, 'n_ntlegs'))
  parameters.value.push(...createForm(storeParameters.value.footpaths.speed, 'speed'))
}

onMounted(() => {
  initCatchmentRadius()
  createGeneralForm()
  createFootpathsForm()
  createCatchmentRadiusForm()
  // parameters.value = [...general.value, ...footpaths.value, ...catchmentRadius.value]
})

onBeforeUnmount(() => {
  saveParams()
})

function saveParams() {
  const category = Object.groupBy(parameters.value, el => el.category)
  const res: any = { general: {}, footpaths: {}, catchment_radius: {} }
  Object.keys(res).forEach(cat => {
    let params = category[cat] as any
    if (params) {
      params = Object.groupBy(params, (el: any) => el.key.split('#')[0])
      Object.keys(params).forEach(key => {
        params[key] = params[key]?.map((el: any) => { return { value: el.value, variant: el.key.split('#')[1] } })
      })
      res[cat] = params
    }
  })

  const payload: TransitParams = {
    general: res.general,
    catchment_radius: res.catchmentRadius,
    footpaths: res.footpaths,
  }

  runTransit.saveParams(payload)
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
  runTransit.startExecution(stateMachineArn.value, inputs)
}

async function exportFiles() {
  const userStore = useUserStore()

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
      if (population.value.content == null && userStore.model !== null) {
        population.value.content = await s3.readJson(userStore.model, userStore.scenario + '/' + population.value.path)
      }
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
      <VariantForm
        ref="formRef"
        v-model="parameters"
        :variants="['am','pm']"
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
      </VariantForm>
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
