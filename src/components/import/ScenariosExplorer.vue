<script>

import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useRunStore } from '@src/store/run'
import router from '@src/router/index'

import { computed, ref, watch, toRaw, onMounted } from 'vue'

const $gettext = s => s

export default {
  name: 'ScenariosExplorer',
  components: {

  },
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const runStore = useRunStore()
    const windowHeight = computed(() => store.windowHeight)
    const loading = ref(false)
    const loggedIn = computed(() => userStore.loggedIn)

    const projectIsEmpty = computed(() => store.projectIsEmpty)

    // logic to show the v-menu
    const showScenarios = computed(() => store.showScenarios)
    const menu = ref(false)
    const model = computed(() => { return userStore.model }) // globaly selected Model
    const localModel = ref('')
    watch(showScenarios, (val) => {
      if (val !== menu.value) { menu.value = val }
    })
    watch(menu, async (val) => {
      if (val !== showScenarios.value) { store.changeShowScenarios() }
      if (val) {
        userStore.isTokenExpired()
        // when we click on the menu. fetch the scenario list (update in place)
        loading.value = true
        await userStore.getScenario({ model: localModel.value })
        loading.value = false
      }
    })
    onMounted(() => {
      localModel.value = model.value
      localScen.value = scenario.value
    })
    watch(localModel, async (val) => {
      // when we click on a tab (model), fetch the scenario list.
      userStore.setScenariosList([])
      loading.value = true
      await userStore.getScenario({ model: val })
      loading.value = false
    })

    const modelsList = computed(() => { return userStore.bucketList }) // list of model cognito API.
    const scenario = computed(() => { return userStore.scenario }) // globaly selected Scenario
    const modelScen = computed(() => { return model.value + scenario.value })
    const localScen = ref('') // locally selected scen. need to cancel selection for example.
    const locked = ref(false)
    watch(modelsList, async (val) => {
      // kind of a onMounted
      // This component is rendered before we fetch the bucket list on cognito API.
      // so, when it fetch, set the model to the first one and get the scenario.
      if (localModel.value === '') { localModel.value = modelsList.value[0] }
      await userStore.getScenario({ model: localModel.value })
    })
    watch(scenario, (val) => {
      if (val !== localScen.value) {
        localScen.value = ''
      }
    })

    function selectScenario (e, val) {
      if (e.type === 'keydown') { return }
      localScen.value = val.scenario
      locked.value = val.protected
      if (val.scenario) {
        if (projectIsEmpty.value) {
          loadProject()
        } else {
          showDialog.value = true
        }
      }
    }
    async function loadProject () {
      runStore.cleanRun()
      userStore.setModel(localModel.value)
      userStore.setScenario({ scenario: localScen.value, protected: locked.value })
      router.push({ name: 'Import', query: { s3Path: localModel.value } })
      menu.value = false
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

    const showDialog = ref(false)
    const copyDialog = ref(false)
    const deleteDialog = ref(false)
    const input = ref('')
    const errorMessage = ref('')
    const selectedScenario = ref(null)
    const scenarioToDelete = ref(null)

    async function createProject () {
      if (input.value === '') {
        errorMessage.value = 'Please enter a name'
      } else if (input.value.includes('/')) {
        errorMessage.value = 'cannot have / in name'
      } else if (scenariosList.value.map(p => p.scenario).includes(input.value)) {
        errorMessage.value = 'project already exist'
      } else {
        try {
          if (selectedScenario.value) {
            // this is a copy
            await s3.copyFolder(localModel.value, selectedScenario.value + '/', input.value)
            store.changeNotification(
              { text: $gettext('Scenario successfully copied'), autoClose: true, color: 'success' })
          } else {
            // this is a new project
            // copy the parameters file from Base. this will create a new project .
            // take first Scen. should be base or any locked scen
            const protectedList = userStore.scenariosList.filter(scen => scen.protected)
            const base = protectedList[0].scenario
            await s3.newScenario(localModel.value, base, input.value)
            store.changeNotification(
              { text: $gettext('Scenario created'), autoClose: true, color: 'success' })
          }
        } catch (err) { store.changeAlert(err); selectedScenario.value = null }
        closeCopy()
        loading.value = true
        // wait 500ms to fetch the scenarios to make sure its available on the DB
        setTimeout(() => {
          userStore.getScenario({ model: localModel.value }).then(() => { loading.value = false })
            .catch((err) => { store.changeAlert(err); loading.value = false })
        }, 500)
      }
    }
    function applyDialog () {
      menu.value = false
      showDialog.value = false
      loadProject()
    }
    function cancelDialog () {
      // reset vmodel back to loaded scenario
      modelScen.value = model.value + scenario.value
      localScen.value = scenario.value
      showDialog.value = false
      menu.value = false
    }
    function deleteScenario () {
      deleteDialog.value = false
      s3.deleteFolder(localModel.value, scenarioToDelete.value + '/').then(resp => {
        deleteDialog.value = false
        userStore.getScenario({ model: localModel.value })
        store.changeNotification(
          { text: $gettext('Scenario deleted'), autoClose: true, color: 'success' })
      }).catch((err) => {
        deleteDialog.value = false
        console.error(err)
        store.changeNotification(
          { text: $gettext('An error occured'), autoClose: true, color: 'error' })
      })
    }
    function closeCopy () {
      copyDialog.value = false
      input.value = ''
      selectedScenario.value = null
      errorMessage.value = ''
    }

    return {
      store,
      menu,
      userStore,
      runStore,
      searchString,
      sortModel,
      sortDirection,
      windowHeight,
      projectIsEmpty,
      loggedIn,
      modelsList,
      model,
      localModel,
      scenario,
      scenariosList,
      loading,
      showDialog,
      modelScen,
      localScen,
      errorMessage,
      copyDialog,
      selectedScenario,
      scenarioToDelete,
      input,
      deleteDialog,
      locked,
      selectScenario,
      loadProject,
      applyDialog,
      cancelDialog,
      deleteScenario,
      createProject,
      closeCopy,
    }
  },

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
        {{ tab.slice(8) }}
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
        label="search"
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
        :key="scen.model + scen.scenario"
        :value="scen.model + scen.scenario"
        class="list-item"
        :class="{'is-active': modelScen === scen.model + scen.scenario}"
        lines="two"
        @click="(e)=>{selectScenario(e,scen)}"
      >
        <v-list-item-title>{{ scen.scenario }}</v-list-item-title>
        <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
        <v-list-item-subtitle>{{ scen.userEmail }}</v-list-item-subtitle>
        <template v-slot:append>
          <v-btn
            variant="text"
            icon="fas fa-copy"
            class="ma-1"
            size="small"
            color="regular"
            @click.stop="()=>{copyDialog=true; selectedScenario=scen.scenario; input = scen.scenario +' copy'}"
          />
          <v-btn
            variant="text"
            :icon=" scen.protected? 'fas fa-lock':'fas fa-trash'"
            :disabled="(scen.model+scen.scenario===modelScen) || (scen.protected)"
            class="ma-1"
            color="regular"
            size="small"
            @click.stop="()=>{deleteDialog=true; scenarioToDelete=scen.scenario;}"
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
    <v-list-action>
      <v-btn
        width="100%"
        class="mt-2"
        prepend-icon="fa-solid fa-cloud-arrow-up"

        @click="()=>{copyDialog=true; selectedScenario=null; input = ''}"
      >
        {{ $gettext('new scenario') }}
      </v-btn>
    </v-list-action>
  </div>
  <div v-else-if="loggedIn && modelsList.length==0">
    <div>
      <v-skeleton-loader type="heading,list-item-three-line,list-item-three-line" />
    </div>
  </div>
  <v-dialog
    v-if="showDialog"
    v-model="showDialog"
    persistent
    max-width="350"
  >
    <v-card>
      <v-card-text>
        <span class="text-h5">
          <strong>
            {{ $gettext("Load Scenario?") }}
          </strong>
        </span>
      </v-card-text>
      <v-card-text class="text-h6">
        {{ $gettext("This will ERASE the current project") }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="regular"
          @click="cancelDialog"
        >
          {{ $gettext("No") }}
        </v-btn>

        <v-btn
          color="primary"
          @click="applyDialog"
        >
          {{ $gettext("Yes") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog
    v-if="deleteDialog"
    v-model="deleteDialog"
    persistent
    max-width="350"
  >
    <v-card>
      <v-card-text>
        <span class="text-h5">
          <strong>
            {{ $gettext("Delete") + ' '+ scenarioToDelete+' ?' }}
          </strong>
        </span>
      </v-card-text>
      <v-card-text class="text-h6">
        {{ $gettext("The scenario will be permanently deleted") }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="regular"
          @click="()=>deleteDialog=false"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="error"
          @click="deleteScenario"
        >
          {{ $gettext("Delete") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog
    v-if="copyDialog"
    v-model="copyDialog"
    persistent
    max-width="290"
  >
    <v-card>
      <v-card-text>
        <span class="text-h5">
          <strong>
            {{ selectedScenario? $gettext("copy") +' '+ selectedScenario : $gettext('New Scenario') }}
          </strong>
        </span>
      </v-card-text>
      <v-card-text>
        <v-container>
          <v-col cols="12">
            <v-text-field
              v-model="input"
              variant="underlined"
              autofocus
              :label="$gettext('name')"
            />
          </v-col>
        </v-container>
      </v-card-text>
      <v-card-text :style="{textAlign: 'center',color:'red'}">
        {{ errorMessage }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          color="grey"
          variant="text"
          @click="closeCopy"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="green-darken-1"
          variant="text"
          @click="createProject"
        >
          {{ $gettext("ok") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
  //max-height:400px; /* Set a max height for the middle content */
  overflow: auto; /* Enable scrolling if the content overflows */
  max-height:calc(100% - 10rem);

}
</style>
