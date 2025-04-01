<script setup>

import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useRunStore } from '@src/store/run'

import { computed, ref, watch, onMounted } from 'vue'

import { useGettext } from 'vue3-gettext'
import PromiseDialog from '../utils/PromiseDialog.vue'
const { $gettext } = useGettext()

const emits = defineEmits(['load', 'unload'])
const store = useIndexStore()
const userStore = useUserStore()
const runStore = useRunStore()
const loading = ref(false)
const loggedIn = computed(() => userStore.loggedIn)

const projectIsEmpty = computed(() => store.projectIsEmpty)

// logic to show the v-menu
const model = computed(() => { return userStore.model }) // globaly selected Model
const localModel = ref(model.value)

watch(localModel, async () => {
  // when we click on a tab (model), fetch the scenario list.
  userStore.setScenariosList([])
  await getScenario()
})

async function getScenario() {
  loading.value = true
  await userStore.getScenario(localModel.value)
  loading.value = false
}

const modelsList = computed(() => { return userStore.bucketList }) // list of model cognito API.
const scenario = computed(() => { return userStore.scenario }) // globaly selected Scenario
const modelScen = computed(() => { return userStore.model + userStore.scenario })
onMounted(async () => {
  // a scenario is selected: scroll to it.
  // note: 0 because null + null = 0
  if (modelScen.value !== 0) {
    document.getElementById(modelScen.value).scrollIntoView()
    // also. go fetch the scenario List if DB changed.
    await getScenario()
  }
})
const localScen = ref(scenario.value) // locally selected scen. need to cancel selection for example.
const locked = ref(false)
watch(modelsList, async (val) => {
  // kind of a onMounted
  // This component is rendered before we fetch the bucket list on cognito API.
  // so, when it fetch, set the model to the first one and get the scenario.
  if (localModel.value === null) { localModel.value = modelsList.value[0] }
  // when logout. this will happen. we want to reset localModel for its watcher to work on login.
  if (val.length === 0) { localModel.value = null }
})
function formatTab(tab) {
  return tab.startsWith('quetzal-') ? tab.slice(8) : tab
}

watch(scenario, (val) => {
  if (val !== localScen.value) {
    localScen.value = ''
  }
})

function selectScenario (e, val) {
  if (e?.type === 'keydown') { return }
  localScen.value = val.scenario
  locked.value = val.protected
  if (val.scenario) {
    if (projectIsEmpty.value && !scenario.value) {
      loadProject()
    } else {
      showSelectDialog()
    }
  }
}
async function loadProject () {
  runStore.cleanRun()
  userStore.setModel(localModel.value)
  userStore.setScenario({ scenario: localScen.value, protected: locked.value })
  emits('load', 'emit')
}

const searchString = ref('')
const sortModel = ref('scenario')
const sortDirection = ref(true)
const scenariosList = computed(() => {
  // sort by alphabetical order, with protectedScens one one top
  let arr = userStore.scenariosList
  if (searchString.value) {
    arr = arr.filter(el => el.scenario.toLowerCase().includes(searchString.value.toLowerCase()))
  }
  return arr.sort((a, b) => {
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
})

const copyDialog = ref()
const input = ref('')
const selectedScenario = ref(null)

const rules = ref({
  required: v => v !== '' || $gettext('Please enter a name'),
  noSlash: v => !v.includes('/') || $gettext('cannot have / in name'),
  noHash: v => !v.includes('#') || $gettext('cannot have # in name'),
  noDuplicated: v => !scenariosList.value.map(p => p.scenario).includes(v) || $gettext('project already exist'),
})

async function createProject (selected) {
  selectedScenario.value = selected
  input.value = selected ? selected + ' copy' : ''
  const resp = await copyDialog.value.openDialog()
  if (resp) {
    try {
      store.changeLoading(true)
      if (selectedScenario.value) {
        // this is a copy
        await s3.copyFolder(localModel.value, selectedScenario.value + '/', input.value, false)
        store.changeNotification(
          { text: $gettext('Scenario successfully copied'), autoClose: true, color: 'success' })
      } else {
        // this is a new project
        // copy the parameters file from Base. this will create a new project .
        // take first Scen. should be base or any locked scen
        const protectedList = userStore.scenariosList.filter(scen => scen.protected)
        const base = protectedList[0].scenario
        await s3.copyFolder(localModel.value, base, input.value, true)
        store.changeNotification(
          { text: $gettext('Scenario created'), autoClose: true, color: 'success' })
      }
      selectScenario(null, { model: localModel.value, scenario: input.value, protected: false })
    } catch (err) {
      store.changeAlert(err)
    } finally {
      input.value = ''
      selectedScenario.value = null
      store.changeLoading(false)
      await getScenario()
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
  if (modelScen.value === localModel.value + localScen.value) {
    userStore.unloadProject()
    emits('unload')
  } else {
    loadProject()
  }
}

function cancelSelectDialog () {
  // reset vmodel back to loaded scenario
  modelScen.value = model.value + scenario.value
  localScen.value = scenario.value
}

// Delete dialog
const deleteDialog = ref()
const scenarioToDelete = ref('')

async function deleteScenario (name) {
  scenarioToDelete.value = name
  const resp = await deleteDialog.value.openDialog()
  if (!resp) return
  try {
    store.changeLoading(true)
    await s3.deleteFolder(localModel.value, scenarioToDelete.value + '/')
    await getScenario()
    store.changeNotification({ text: $gettext('Scenario deleted'), autoClose: true, color: 'success' })
  } catch (err) {
    store.changeAlert(err)
  } finally {
    store.changeLoading(false)
  }
}

async function mouseOn(val) {
  const info = await val.info
  userStore.setInfoPreview(info)
}
async function mouseOff() {
  userStore.setInfoPreview(null)
}

</script>
<template>
  <div
    v-if="loggedIn && modelsList.length>0"
    class="test"
  >
    <v-tabs
      v-model="localModel"
      show-arrows
      fixed-tabs
    >
      <v-tab
        v-for="tab in modelsList"
        :key="tab"
        :value="tab"
        :disabled="loading"
      >
        {{ formatTab(tab) }}
      </v-tab>
    </v-tabs>
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
        @click:clear="searchString=null"
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
        >
          <span class="hidden-sm-and-down lowercase-text">date</span>

          <v-icon end>
            fas fa-calendar-week
          </v-icon>
        </v-btn>
        <v-btn
          value="userEmail"
          size="small"
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
    <div
      class="v-card-content"
    >
      <v-list-item
        v-for="scen in scenariosList"
        :id="scen.model + scen.scenario"
        :key="scen.model + scen.scenario"
        :value="scen.model + scen.scenario"
        class="list-item"
        :class="{'is-active': modelScen === scen.model + scen.scenario}"
        lines="two"
        @click="(e)=>selectScenario(e,scen)"
        @mouseenter="mouseOn(scen)"
        @mouseleave="mouseOff()"
      >
        <v-list-item-title class="name-wrap">
          {{ scen.scenario }}
        </v-list-item-title>
        <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
        <v-list-item-subtitle>{{ scen.userEmail }}</v-list-item-subtitle>
        <template v-slot:append>
          <v-btn
            variant="text"
            icon="fas fa-copy"
            class="ma-1"
            size="small"
            @click.stop="createProject(scen.scenario)"
          />
          <v-btn
            variant="text"
            :icon=" scen.protected? 'fas fa-lock':'fas fa-trash'"
            :disabled="(scen.model+scen.scenario===modelScen) || (scen.protected)"
            class="ma-1"
            size="small"
            @click.stop="deleteScenario(scen.scenario)"
          />
        </template>
      </v-list-item>
      <v-spacer />
      <v-progress-linear
        v-if="loading"
        color="primary"
        indeterminate
      />
      <v-spacer />
    </div>
    <v-divider />
    <div>
      <v-btn
        width="100%"
        class="mt-2"
        prepend-icon="fa-solid fa-cloud-arrow-up"

        @click="createProject(null)"
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
    :title="modelScen === localModel + localScen? $gettext('Unload Scenario?'):$gettext('Load %{sc} ?', {sc: localScen})"
    confirm-color="primary"
    :confirm-button="$gettext('Yes')"
    :cancel-button="$gettext('No')"
  >
    {{ $gettext('Any unsaved changes to %{sc} will be lost', {sc: scenario}) }}
  </PromiseDialog>

  <PromiseDialog
    ref="deleteDialog"
    :title="$gettext('Delete %{sc}?', { sc: scenarioToDelete })"
    :confirm-button="$gettext('Delete')"
    confirm-color="error"
  >
    {{ $gettext('The scenario will be permanently deleted') }}
  </PromiseDialog>
  <PromiseDialog
    ref="copyDialog"
    :title="selectedScenario? $gettext('Copy %{sc}?', { sc: selectedScenario }): $gettext('New Scenario')"
    :confirm-button="$gettext('Create')"
    confirm-color="primary"
  >
    <v-text-field
      v-model="input"
      variant="underlined"
      autofocus
      :rules="[rules.required,rules.noSlash,rules.noHash,rules.noDuplicated]"
      :label="$gettext('name')"
    />
  </PromiseDialog>
</template>
<style lang="scss" scoped>

.pointer{
  cursor: pointer;
}
.container{
  display:flex;
  justify-content:flex-start;
  align-items: center;
  margin:0.5rem;
}
.test{
  display:flex;
  flex-direction: column;
  height:calc(100% - 100px);
}
.item{
  flex:1;
}
.custom-title {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color: rgb(var(--v-theme-secondarydark));
}
.is-active{
  opacity:1;
  background-color: rgb(var(--v-theme-primary));
}
.list-item{
  border-top: 1px solid rgb(var(--v-theme-lightgrey));
}
.lowercase-text {
  text-transform: lowercase;
}
.text-right {
  justify-content: end;
}
.v-card-content {
  overflow: auto; /* Enable scrolling if the content overflows */
  max-height:calc(100% - 10rem);
}
.name-wrap{
  text-wrap: wrap;
}
</style>
