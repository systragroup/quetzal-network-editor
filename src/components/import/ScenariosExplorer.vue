<script setup lang="ts">
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useClient } from '@src/axiosClient.js'

import { computed, ref, watch, onMounted, nextTick, toRaw } from 'vue'

import { useGettext } from 'vue3-gettext'
import PromiseDialog from '../utils/PromiseDialog.vue'
import { Scenario, ScenarioPayload } from '@src/types/typesStore'
import { infoSerializer } from '@src/utils/serializer.ts'
const { $gettext } = useGettext()
// const controller = new AbortController()
// const { signal } = controller
const emits = defineEmits(['load', 'unload'])

const COMMON = '_common'
const store = useIndexStore()
const userStore = useUserStore()
const loading = ref(false)
const loggedIn = computed(() => userStore.loggedIn)

const projectIsEmpty = computed(() => store.projectIsEmpty)

// model and scenario
const storeModel = computed(() => { return userStore.model }) // globaly selected Model
const storeScenario = computed(() => { return userStore.scenario }) // globaly selected Scenario
const localModel = ref<string | null>(storeModel.value) // locally selected model
const localScen = ref<string | null>(storeScenario.value) // locally selected scen
const modelScen = computed(() => { return `${storeModel.value}${storeScenario.value}` })

const modelsList = computed(() => { return userStore.modelsList }) // list of model cognito API.
const scenariosList = ref<Scenario[]>(userStore.scenariosList)

async function getLocks(model: string | null) {
  const fileName = `${COMMON}/lock.json`
  const fileExist: Boolean = await s3.checkIfFileExists(model, fileName)
  if (fileExist) {
    return await s3.readJson(model, fileName)
  }
  else return ['base']
}

async function getScenarioMetadata(bucket: string, scenario: Scenario) {
  const resp = await s3.readInfo(bucket, scenario.scenario)
  const metadata = infoSerializer(resp)
  const date = new Date(metadata.last_modified_date)
  const lastModified = date.toLocaleDateString('en-CA') + ' ' + date.toLocaleTimeString('en-CA', { hour12: false })
  scenario.lastModified = lastModified
  scenario.timestamp = date.getTime()
  scenario.userEmail = metadata.last_modified_email || 'idns-canada@systra.com'
  scenario.description = metadata.description
}

async function getScenarios() {
  if (!localModel.value) return
  const bucket = localModel.value
  loading.value = true
  const scenarios = await s3.listScenarios(bucket)
  const locks: string[] = await getLocks(bucket)
  let tempList = scenarios.map((scenario) => {
    return {
      model: bucket,
      scenario: scenario,
      key: `${bucket}${scenario}`,
      protected: locks.includes(scenario),
      lastModified: '...', // all of them to be done async
      timestamp: 0,
      userEmail: '...',
      description: '',
    }
  })
  // sort to alphabetically with locked on top.
  tempList.sort((a, b) => {
    if (a.protected !== b.protected) {
      return a.protected ? -1 : 1
    }
    return a.scenario.localeCompare(b.scenario)
  })
  // Get metadata for the first 10 values
  const first = tempList.slice(0, 10)
  await Promise.allSettled(first.map((scenario) => getScenarioMetadata(bucket, scenario)))// .then(resp => resp)
  scenariosList.value = tempList // then set, scenarioList, so scenario appears with metadata loaded (10 first)

  // load the rest of the metadata in the background
  const rest = scenariosList.value.slice(10)
  Promise.allSettled(rest.map((scenario) => getScenarioMetadata(bucket, scenario)))
    .then(() => loading.value = false)
    .catch(() => loading.value = false)
}

async function updateScenarioList(scenarioName: string) {
  // add or delete a scenario from the list
  if (!localModel.value) return
  const bucket = localModel.value

  const scenariosName = new Set(scenariosList.value.map(el => el.scenario))
  if (scenariosName.has(scenarioName)) {
    scenariosList.value = scenariosList.value.filter(el => el.scenario !== scenarioName)
  } else {
    const scenario = {
      model: bucket,
      scenario: scenarioName,
      key: `${bucket}${scenarioName}`,
      protected: false,
      lastModified: '...', // all of them to be done async
      timestamp: 0,
      userEmail: '...',
      description: '',
    }
    await getScenarioMetadata(bucket, scenario)
    scenariosList.value.push(scenario)
  }
}

onMounted(async () => {
  // a scenario is selected: scroll to it.
  if (modelScen.value !== 'nullnull') {
    showScenario.value = true
    nextTick(() => {
      const elem = document.getElementById(modelScen.value)
      if (elem) { elem.scrollIntoView() }
    })
    // update scenario list
    await getScenarios()
  }
})

watch(loggedIn, async (val) => {
  if (val) {
    try {
      const { quetzalClient } = useClient()
      const resp = await quetzalClient.get('buckets')
      userStore.setModelsList(resp.data)
    } catch (err: any) {
      const store = useIndexStore()
      store.changeAlert({ name: 'Cognito Client error', message: err.response.data.detail })
    }
  } else { // logout
    localModel.value = null
    scenariosList.value = []
    localScen.value = null
    showScenario.value = false
    userStore.setModelsList([])
  }
  // set model
  // if only one select it
  const lastOpenModel = String(localStorage.getItem('model'))
  if (modelsList.value.includes(lastOpenModel)) {
    selectModel(lastOpenModel)
  } else if (modelsList.value.length === 1) {
    selectModel(modelsList.value[0])
  }
})

function formatTab(tab: string) {
  return tab.startsWith('quetzal-') ? tab.slice(8) : tab
}

const locked = ref(false)

function selectScenario (e: Event | null, val: ScenarioPayload) {
  if (e?.type === 'keydown') { return }
  localScen.value = val.scenario
  locked.value = val.protected
  if (val.scenario) {
    if (projectIsEmpty.value && !storeScenario.value) {
      loadProject()
    } else {
      showSelectDialog()
    }
  }
}

async function loadProject() {
  userStore.setModel(localModel.value)
  userStore.setScenario({ scenario: localScen.value, protected: locked.value })
  userStore.setScenariosList(scenariosList.value)
  getDocs(localModel.value)
  getModelConfig(localModel.value)
  getModelSteps(localModel.value)
  localStorage.setItem('model', String(storeModel.value))
  emits('load', 'emit')
}

async function getDocs(model: string | null) {
  let filesList = await s3.listFiles(model, `${COMMON}/docs/`)
  filesList = filesList.filter(name => !name.endsWith('/'))
  const formatted = filesList.map(name => { return { path: name, content: null } })
  store.loadDocFiles(formatted)
}

async function getModelConfig(model: string | null) {
  const fileName = `${COMMON}/modelConfig.json`
  const fileExist: Boolean = await s3.checkIfFileExists(model, fileName)
  if (fileExist) {
    const json = await s3.readJson(model, fileName)
    store.loadModelConfig(json)
  }
}

async function getModelSteps(model: string | null) {
  const fileName = `${COMMON}/steps.json`
  const fileExist: Boolean = await s3.checkIfFileExists(model, fileName)
  if (fileExist) {
    const json = await s3.readJson(model, fileName)
    store.loadmodelSteps(json)
  }
}

const searchString = ref('')
const sortModel = ref<'scenario' | 'timestamp' | 'userEmail'>('scenario')
const sortDirection = ref(true)
const sortedScenariosList = computed(() => {
  // sort by alphabetical order, with protectedScens one one top
  let arr = scenariosList.value
  if (searchString.value) {
    arr = arr.filter(el => el.scenario.toLowerCase().includes(searchString.value.toLowerCase()))
  }
  const sorted = arr.sort((a, b) => {
    if (a.protected === b.protected) { // both true or both false. we go alphabetically
      const res = String(a[sortModel.value]).localeCompare(String(b[sortModel.value]),
        undefined, { sensitivity: 'base' })
      return sortDirection.value ? res : -res
    } else if (a.protected) {
      return -1 // `a` comes before `b`
    } else {
      return 1 // `b` comes before `a`
    }
  })
  return sorted
})

interface DialogProps {
  title: string
  confirmButton: string
}

const copyDialog = ref()
const input = ref('')

const dialogProps = ref<DialogProps>({
  title: '',
  confirmButton: '',
})

const rules = ref({
  required: (v: any) => v !== '' || $gettext('Please enter a name'),
  noSlash: (v: any) => !v.includes('/') || $gettext('cannot have / in name'),
  noHash: (v: any) => !v.includes('#') || $gettext('cannot have # in name'),
  noCommon: (v: any) => v !== COMMON || $gettext('reserved name.'),
  noDuplicated: (v: any) => !scenariosList.value.map(p => p.scenario).includes(v) || $gettext('project already exist'),
})

async function createProject() {
  input.value = ''
  dialogProps.value = { title: $gettext('New Scenario'), confirmButton: $gettext('create') }
  const resp = await copyDialog.value.openDialog()
  if (resp) {
    try {
      store.changeLoading(true)
      // copy the parameters file from Base. this will create a new project .
      // take first Scen. should be base or any locked scen
      const protectedList = scenariosList.value.filter(scen => scen.protected)
      const base = protectedList[0].scenario
      await s3.copyFolder(localModel.value, base, input.value, true)
      await updateScenarioList(input.value)
      store.changeNotification(
        { text: $gettext('Scenario created'), autoClose: true, color: 'success' })

      selectScenario(null, { scenario: input.value, protected: false })
    } catch (err) {
      store.changeAlert(err)
      await getScenarios()
      store.changeLoading(false)
    } finally {
      input.value = ''
    }
  }
}

async function copyProject (selectedScenario: string) {
  input.value = selectedScenario + ' copy'
  dialogProps.value = {
    title: $gettext('Copy %{sc}?', { sc: String(selectedScenario) }),
    confirmButton: $gettext('copy'),
  }
  const resp = await copyDialog.value.openDialog()
  if (resp) {
    try {
      store.changeLoading(true)
      await s3.copyFolder(localModel.value, selectedScenario + '/', input.value, false)
      await updateScenarioList(input.value)
      selectScenario(null, { scenario: input.value, protected: false })
      store.changeNotification(
        { text: $gettext('Scenario successfully copied'), autoClose: true, color: 'success' })
    } catch (err) {
      store.changeAlert(err)
      await getScenarios()
      store.changeLoading(false)
    } finally {
      input.value = ''
    }
  }
}

async function renameProject() {
  input.value = storeScenario.value || ''
  dialogProps.value = {
    title: $gettext('Rename %{sc}?', { sc: String(storeScenario.value) }),
    confirmButton: $gettext('rename'),
  }
  const resp = await copyDialog.value.openDialog()
  if (resp) {
    try {
      store.changeLoading(true)
      const oldName = toRaw(storeScenario.value)!
      const oldPath = oldName + '/'
      const newName = input.value
      await s3.copyFolder(storeModel.value, oldPath, newName, false)
      await s3.deleteFolder(storeModel.value, oldPath)
      await updateScenarioList(newName) // add new
      await updateScenarioList(oldName) // delete old
      userStore.setScenario({ scenario: newName, protected: false })
      store.changeNotification(
        { text: $gettext('scenario renamed'), autoClose: true, color: 'success' })
    } catch (err) {
      store.changeAlert(err)
      await getScenarios()
    } finally {
      input.value = ''
      store.changeLoading(false)
    }
  }
}

// select project when 1 is already loaded
const selectDialog = ref()

async function showSelectDialog () {
  const resp = await selectDialog.value.openDialog()
  if (resp) {
    applySelectDialog()
  } else {
    cancelSelectDialog()
  }
}
function applySelectDialog () {
  if (modelScen.value === `${localModel.value}${localScen.value}`) {
    userStore.unloadProject()
    emits('unload')
  } else {
    loadProject()
  }
}

function cancelSelectDialog () {
  // reset vmodel back to loaded scenario
  localScen.value = storeScenario.value
  store.changeLoading(false)
}

// Delete dialog
const deleteDialog = ref()

async function deleteScenario (scenarioToDelete: string) {
  dialogProps.value = {
    title: $gettext('Delete %{sc}?', { sc: scenarioToDelete }),
    confirmButton: $gettext('Delete'),
  }
  const resp = await deleteDialog.value.openDialog()
  if (!resp) return
  try {
    store.changeLoading(true)
    await s3.deleteFolder(localModel.value, scenarioToDelete + '/')
    await updateScenarioList(scenarioToDelete) // add new
    store.changeNotification({ text: $gettext('Scenario deleted'), autoClose: true, color: 'success' })
  } catch (err) {
    store.changeAlert(err)
    await getScenarios()
  } finally {
    store.changeLoading(false)
  }
}

async function mouseOn(val: Scenario) {
  // TODO use a composable maybe? no need to store this in store...
  userStore.setInfoPreview({ description: val.description })
}
async function mouseOff() {
  userStore.setInfoPreview(null)
}
const showScenario = ref(false)
async function selectModel(v: string) {
  scenariosList.value = []
  localModel.value = v
  showScenario.value = true
  sortModel.value = 'scenario'
  await getScenarios()
}

</script>
<template>
  <div class="custom-title">
    {{ loggedIn? showScenario? $gettext("Select a Project"): $gettext("Select a Model"): $gettext("Login to access projects") }}
  </div>
  <div
    v-if="loggedIn && !showScenario"
    class="model-container"
  >
    <v-list-item
      v-for="model in modelsList"
      :id="model"
      :key="model"
      :value="model"
      class="list-item"
      :class="{'is-active': storeModel === model}"
      lines="two"
      @click="(e)=>selectModel(model)"
    >
      <v-list-item-title class="model-list-item name-wrap">
        {{ formatTab(model) }}
      </v-list-item-title>
      <template v-slot:append>
        <v-icon icon="fas fa-arrow-right" />
      </template>
    </v-list-item>
  </div>
  <div
    v-if="loggedIn && showScenario"
    class="scenario-container"
  >
    <div>
      <v-tooltip
        location="right"
        open-delay="250"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            style="border-color:rgb(var(--v-theme-lightgrey))"
            v-bind="props"
            prepend-icon="fas fa-arrow-left"
            block
            variant="outlined"
            size="large"
            @click="showScenario=false"
          >
            {{ formatTab(String(localModel)) }}
          </v-btn>
        </template>
        <span>{{ $gettext('Go back to model selection') }}</span>
      </v-tooltip>
    </div>
    <v-divider />
    <div
      class="container"
    >
      <v-text-field
        v-model="searchString"
        :style="{'padding-right': '0.5rem'}"
        density="compact"
        variant="outlined"
        clear-icon="fas fa-times-circle"
        clearable
        class="item"
        :label="$gettext('search')"
        hide-details
        prepend-inner-icon="fas fa-search"
        @click:clear="searchString=''"
      />
      <v-btn-toggle
        v-model="sortModel"
        density="compact"
        mandatory
        variant="outlined"
      >
        <v-btn
          value="scenario"
          size="small"
        >
          <span class="hidden-sm-and-down lowercase-text">{{ $gettext('name') }}</span>
          <v-icon end>
            fas fa-font
          </v-icon>
        </v-btn>
        <v-btn
          value="timestamp"
          size="small"
          :disabled="loading"
        >
          <span class="hidden-sm-and-down lowercase-text">date</span>
          <v-icon end>
            fas fa-calendar-week
          </v-icon>
        </v-btn>
        <v-btn
          value="userEmail"
          size="small"
          :disabled="loading"
        >
          <span class="hidden-sm-and-down lowercase-text">email</span>
          <v-icon end>
            fas fa-at
          </v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-btn
        size="small"
        variant="text"
        :icon=" sortDirection? 'fas fa-sort-down' : 'fas fa-sort-up' "
        @click="sortDirection=!sortDirection"
      />
    </div>
    <v-divider />
    <!--  -->
    <v-progress-linear
      v-if="loading"
      color="primary"
      indeterminate
    />
    <div class="v-card-content">
      <v-virtual-scroll
        :items="sortedScenariosList"
        class="virtual-scroll"
        height="100%"
      >
        <template v-slot="{item:scen}">
          <v-list-item
            :id="scen.key"
            :key="scen.key"
            :value="scen.key"
            class="list-item"
            :class="{'is-active': modelScen === scen.key}"
            lines="two"
            @click="(e)=>selectScenario(e,scen)"
            @mouseenter="mouseOn(scen)"
            @mouseleave="mouseOff()"
          >
            <v-list-item-title class="name-wrap">
              {{ scen.scenario }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ scen.lastModified }}
            </v-list-item-subtitle>
            <v-list-item-subtitle>
              {{ scen.userEmail }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-list-item-action end>
                <v-btn
                  v-if="modelScen === scen.key && !scen.protected"
                  variant="text"
                  icon="fas fa-pen"
                  class="ma-1"
                  size="small"
                  @click.stop="renameProject"
                />
                <v-btn
                  variant="text"
                  icon="fas fa-copy"
                  class="ma-1"
                  size="small"
                  @click.stop="copyProject(scen.scenario)"
                />
                <v-btn
                  variant="text"
                  :icon=" scen.protected? 'fas fa-lock':'fas fa-trash'"
                  :disabled="(scen.key === modelScen) || (scen.protected)"
                  class="ma-1"
                  size="small"
                  @click.stop="deleteScenario(scen.scenario)"
                />
              </v-list-item-action>
            </template>
          </v-list-item>
        </template>
      </v-virtual-scroll>
    </div>
    <!--  -->
    <v-divider />
    <div>
      <v-btn
        width="100%"
        class="mt-2"
        prepend-icon="fa-solid fa-cloud-arrow-up"
        @click="createProject"
      >
        {{ $gettext('new scenario') }}
      </v-btn>
    </div>
  </div>
  <div v-else-if="loggedIn && modelsList.length==0">
    <div>
      <v-skeleton-loader type="heading,list-item-three-line,list-item-three-line" />
    </div>
  </div>

  <PromiseDialog
    ref="selectDialog"
    :title="modelScen === `${localModel}${localScen}`? $gettext('Unload Scenario?'): $gettext('Load %{sc} ?', {sc: String(localScen)})"
    confirm-color="primary"
    :confirm-button="$gettext('Yes')"
    :cancel-button="$gettext('No')"
  >
    {{ $gettext('Any unsaved changes to %{sc} will be lost', {sc: String(storeScenario)}) }}
  </PromiseDialog>

  <PromiseDialog
    ref="deleteDialog"
    v-bind="dialogProps"
    confirm-color="error"
  >
    {{ $gettext('The scenario will be permanently deleted') }}
  </PromiseDialog>
  <PromiseDialog
    ref="copyDialog"
    v-bind="dialogProps"
    confirm-color="primary"
  >
    <v-text-field
      v-model="input"
      variant="underlined"
      autofocus
      :rules="[rules.required,rules.noSlash,rules.noHash,rules.noDuplicated,rules.noCommon]"
      :label="$gettext('name')"
    />
  </PromiseDialog>
</template>
<style lang="scss" scoped>
.custom-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: bold;
}
.pointer{
  cursor: pointer;
}
.container{
  display:flex;
  justify-content:flex-start;
  align-items: center;
  margin:0.5rem;
}
.model-container{
  overflow: auto; /* Enable scrolling if the content overflows */
  max-height:100%
}
.scenario-container{
  display:flex;
  flex-direction: column;
  height:calc(100vh - 208px);
}
.item{
  flex:1;
}
.model-list-item{
  font-size: 1.5rem;
  text-transform: uppercase;
}
.is-active{
  opacity:1;
  background-color: rgb(var(--v-theme-primary));
}
.list-item{
  width:100%;
  min-width: 100%;
  border-top: 1px solid rgb(var(--v-theme-lightgrey));

}
.lowercase-text {
  text-transform: lowercase;
}
.text-right {
  justify-content: end;
}
.v-card-content {
  display: flex;
  height:100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.virtual-scroll{
  width:100%;
  min-width: 100%;
  min-height: 0;

}
.name-wrap{
  text-wrap: wrap;
}
</style>
