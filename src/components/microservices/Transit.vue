<script setup lang="ts">
import { useTransitStore } from '@src/store/Transit'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import s3 from '@src/AWSClient'
import { VariantFormData } from '@src/types/components'
import VariantForm from '../common/VariantForm.vue'
import { RunInputs } from '@src/types/api'
import Warning from '../utils/Warning.vue'
import { useODStore } from '@src/store/od'
import Markdown from '../utils/Markdown.vue'
import { useGettext } from 'vue3-gettext'
import { cloneDeep } from 'lodash'
import { TransitParams, TransitParamsCategory } from '@src/types/typesStore'

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
    type: 'boolean', variant: '', category: 'general',
    hint: 'Use road network nodes to compute population mesh (population is distributed on road nodes.)',
    rules: ['required', 'nonNegative'],
  },
  step_size: {
    key: 'step_size', label: $gettext('Population mesh size (0.001 ~100m)'), value: null,
    type: 'number', variant: '', category: 'general',
    units: 'degree', hint: 'Population is created from zones as a mesh of point with this distance',
    rules: ['required', 'nonNegative'],
  },
  max_length: {
    key: 'max_length', label: $gettext('Footpaths max length'), value: null,
    type: 'number', units: 'metres', variant: '', category: 'footpaths',
    hint: 'as the crow flight walking speed', rules: ['required', 'nonNegative'],
  },
  speed: {
    key: 'speed', label: $gettext('Footpaths speed'), value: null,
    type: 'number', units: 'km/h', variant: '', category: 'footpaths',
    hint: 'max length for a footpath (walk distance between stations)', rules: ['required', 'largerThanZero'],
  },
  n_ntlegs: {
    key: 'n_ntlegs', label: $gettext('Footpaths number of connections'), value: null,
    type: 'number', variant: '', category: 'footpaths',
    hint: 'number of connection between the zones and the footpaths', rules: ['required', 'largerThanZero'],
  },
  catchment_radius: {
    key: 'catchment_radius', label: $gettext('Catchment radius'), value: 500,
    type: 'number', units: 'metres', variant: '', category: 'catchment_radius',
    hint: 'vehicle type catchment radius', rules: ['required', 'nonNegative'],
  },
}

const variantChoice = computed(() => linksStore.variantChoice)

function initVariants() {
  const keepSet = new Set([...variantChoice.value, ''])
  const storeVariants = new Set(storeParameters.value.map(param => param.variant))
  const toDelete = Array.from(storeVariants).filter(el => !keepSet.has(el))
  toDelete.forEach(variant => runTransit.deleteVariant(variant))
}

function initCatchmentRadius() {
  // get routeTypes in Transit parameters and in the links.
  // will add missing one and delete non existing one (if delete metro, remove metro catchment_radius)
  const filtered = storeParameters.value.filter(param => param.category === 'catchment_radius')
  const storeKeys = new Set(filtered.map(param => param.key))
  const routeTypesSet = new Set(linksStore.links.features.map(link => link.properties.route_type))

  // add new route_types to the store (new catchment radius for it)
  const keysToAdd = Array.from(routeTypesSet).filter(el => !storeKeys.has(el))
  keysToAdd.forEach((route_type) => runTransit.addCatchmentRadius(route_type))

  // delete storeParam if route_type doesnt exist anymore.
  const keysToDelete = Array.from(storeKeys).filter(el => !routeTypesSet.has(el))
  keysToDelete.forEach((route_type) => runTransit.deleteParam('catchment_radius', route_type))
}

function createBasicForm(category: TransitParamsCategory) {
  const filtered = storeParameters.value.filter(el => el.category === category)
  filtered.forEach(param => {
    const model = cloneDeep(paramModel[param.key])
    model.value = param.value
    model.variant = param.variant
    parameters.value.push(model)
  })
}

function createCatchmentRadiusForm() {
  const filtered = storeParameters.value.filter(el => el.category === 'catchment_radius')
  filtered.forEach(param => {
    const model = cloneDeep(paramModel.catchment_radius)
    model.value = param.value
    model.variant = param.variant
    model.key = param.key
    model.label = `${model.label} (${param.key})`
    parameters.value.push(model)
  })
}

onMounted(() => {
  initCatchmentRadius()
  initVariants()
  createBasicForm('general')
  createBasicForm('footpaths')
  createCatchmentRadiusForm()
})

onBeforeUnmount(() => {
  saveParams()
})

function saveParams() {
  runTransit.saveParams(parameters.value)
  formatParams()
}

function formatParams() {
  // change [{cat:'',key:'',val:'',variant:''}] to {cat: {key: val#variant}}
  const group: Record<string, TransitParams[]> = Object.groupBy(storeParameters.value, el => el.category)
  const params: Record<string, Record<string, any>> = {}
  Object.keys(group).forEach(cat => {
    params[cat] = group[cat].reduce((acc: Record<string, any>, el: TransitParams) => {
      const key = el.variant !== '' ? `${el.key}#${el.variant}` : el.key
      acc[key] = el.value
      return acc
    }, {})
  })
  return params
}

async function start () {
  const resp = await formRef.value.validate()
  if (!resp) { return }
  saveParams()
  const userStore = useUserStore()
  runTransit.running = true
  runTransit.setCallID()
  await exportFiles()
  const params = formatParams()
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

const formRef = ref()

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
        :variants="variantChoice"
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
