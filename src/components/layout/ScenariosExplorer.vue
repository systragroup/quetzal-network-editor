<script>

import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useRunStore } from '@src/store/run'

import { computed, ref } from 'vue'

const $gettext = s => s

export default {
  name: 'ScenariosExplorer',
  components: {

  },

  props: [],
  events: [],
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const runStore = useRunStore()
    const windowHeight = computed(() => store.windowHeight)
    const projectIsEmpty = computed(() => store.projectIsEmpty)

    const loggedIn = computed(() => userStore.loggedIn)

    const modelsList = computed(() => { return userStore.bucketList })
    const model = computed(() => { return userStore.model })
    const scenario = computed(() => { return userStore.scenario })

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

    return {
      store,
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
      scenario,
      scenariosList,
    }
  },
  data () {
    return {
      menu: false,
      showDialog: false,
      modelScen: '',
      localModel: '',
      localScen: '',
      errorMessage: '',
      copyDialog: false,
      selectedScenario: null,
      scenarioToDelete: null,
      input: '',
      deleteDialog: false,
      loading: false,
      protected: false,

    }
  },

  watch: {
    async  menu (val) {
      if (val) {
        this.userStore.isTokenExpired()
        // when we click on the menu. fetch the scenario list (update in place)
        this.loading = true
        await this.userStore.getScenario({ model: this.localModel })
        this.loading = false
      }
    },
    async localModel (val) {
      console.log(val)
      // when we click on a tab (model), fetch the scenario list.
      this.userStore.setScenariosList([])
      this.loading = true
      await this.userStore.getScenario({ model: val })
      this.loading = false
    },
    async modelsList (val) {
      // This component is rendered before we fetch on S3 the bucket list.
      // so, when its fetched, set the model to the first one and get the scenario.
      if (this.localModel === '') { this.localModel = this.modelsList[0] }
      await this.userStore.getScenario({ model: this.localModel })
    },
    scenario (val) {
      if (val !== this.localScen) {
        this.localScen = ''
        this.modelScen = ''
      }
    },
  },

  methods: {
    selectScenario (val) {
      this.modelScen = val.model + val.scenario
      this.localScen = val.scenario
      this.protected = val.protected
      if (val.scenario) {
        if (this.projectIsEmpty) {
          this.loadProject()
        } else {
          this.showDialog = true
        }
      }
    },
    async loadProject () {
      this.runStore.cleanRun()
      this.userStore.setModel(this.localModel)
      this.userStore.setScenario({ scenario: this.localScen, protected: this.protected })
      this.$router.push({ name: 'Import', query: { s3Path: this.localModel } })
      this.menu = false
    },

    applyDialog () {
      this.menu = false
      this.showDialog = false
      this.loadProject()
    },
    cancelDialog () {
      // reset vmodel back to loaded scenario
      this.modelScen = this.model + this.scenario
      this.localScen = this.scenario
      this.showDialog = false
      this.menu = false
    },
    deleteScenario () {
      this.deleteDialog = false
      s3.deleteFolder(this.localModel, this.scenarioToDelete + '/').then(resp => {
        this.deleteDialog = false
        this.userStore.getScenario({ model: this.localModel })
        this.store.changeNotification(
          { text: $gettext('Scenario deleted'), autoClose: true, color: 'success' })
      }).catch((err) => {
        this.deleteDialog = false
        console.error(err)
        this.store.changeNotification(
          { text: $gettext('An error occured'), autoClose: true, color: 'error' })
      })
    },
    async createProject () {
      if (this.input === '') {
        this.errorMessage = 'Please enter a name'
      } else if (this.input.includes('/')) {
        this.errorMessage = 'cannot have / in name'
      } else if (this.scenariosList.map(p => p.scenario).includes(this.input)) {
        this.errorMessage = 'project already exist'
      } else {
        try {
          if (this.selectedScenario) {
            // this is a copy
            await s3.copyFolder(this.localModel, this.selectedScenario + '/', this.input)
            this.store.changeNotification(
              { text: $gettext('Scenario successfully copied'), autoClose: true, color: 'success' })
          } else {
            // this is a new project
            // copy the parameters file from Base. this will create a new project .
            // take first Scen. should be base or any locked scen
            const protectedList = this.userStore.scenariosList.filter(scen => scen.protected)
            const base = protectedList[0].scenario
            await s3.newScenario(this.localModel, base, this.input)
            this.store.changeNotification(
              { text: $gettext('Scenario created'), autoClose: true, color: 'success' })
          }
        } catch (err) { this.store.changeAlert(err); this.selectedScenario = null }
        this.closeCopy()
        this.loading = true
        // wait 500ms to fetch the scenarios to make sure its available on the DB
        setTimeout(() => {
          this.userStore.getScenario({ model: this.localModel }).then(() => { this.loading = false })
            .catch((err) => { this.store.changeAlert(err); this.loading = false })
        }, 500)
      }
    },

    closeCopy () {
      this.copyDialog = false
      this.input = ''
      this.selectedScenario = null
      this.errorMessage = ''
    },

  },
}
</script>
<template>
  <div v-if="loggedIn && modelsList.length>0">
    <v-menu
      v-model="menu"
      :persistent="!(!showDialog && !deleteDialog && !copyDialog)"
      :close-on-content-click="false"
      location="bottom center"
      offset="10"
      max-width="460px"
    >
      <template v-slot:activator="{ props }">
        <div
          class="custom-title pointer"
          v-bind="props"
        >
          {{ scenario? model + '/' + scenario: $gettext('Projects') }}
        </div>
      </template>
      <v-card>
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
          :style="{'max-height': `${windowHeight-200}px`}"
        >
          <v-list-item
            v-for="scen in scenariosList"
            :key="scen.model + scen.scenario"
            max-height="200px"
            :value="scen.model + scen.scenario"
            :class="{ 'is-active': modelScen === scen.model + scen.scenario}"
            lines="two"
            @click="selectScenario(scen)"
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
                color="grey"
                size="small"
                @click.stop="()=>{deleteDialog=true; scenarioToDelete=scen.scenario;}"
              />
            </template>
          </v-list-item>
          <v-list-item v-show="loading">
            <v-spacer />
            <v-progress-circular
              color="primary"
              indeterminate
            />
            <v-spacer />
          </v-list-item>
        </div>
        <v-divider />
        <v-list-item>
          <v-btn
            variant="text"
            block
            @click="()=>{copyDialog=true; selectedScenario=null; input = ''}"
          >
            {{ $gettext('new scenario') }}
          </v-btn>
        </v-list-item>
      </v-card>
    </v-menu>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="350"
      @keydown.enter="applyDialog"
      @keydown.esc="cancelDialog"
    >
      <v-card>
        <v-card-title class="text-h4">
          {{ $gettext("Load Scenario?") }}
        </v-card-title>
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
      v-model="deleteDialog"
      persistent
      max-width="350"
      @keydown.esc="()=>deleteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h4">
          {{ $gettext("Delete ")+ scenarioToDelete+' ?' }}
        </v-card-title>
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
      v-model="copyDialog"
      persistent
      max-width="290"
      @keydown.enter="createProject"
      @keydown.esc="cancelDialog"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ selectedScenario? $gettext("copy") +' '+ selectedScenario : $gettext('New Scenario') }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-col cols="12">
              <v-text-field
                v-model="input"
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
  </div>
  <div v-else-if="loggedIn && modelsList.length==0">
    <div>
      <v-progress-linear
        color="primary"
        absolute
        indeterminate
      />
    </div>
  </div>
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
.lowercase-text {
  text-transform: lowercase;
}
.text-right {
  justify-content: end;
}

.v-card-content {
  //max-height:400px; /* Set a max height for the middle content */
  overflow: auto; /* Enable scrolling if the content overflows */
}
</style>
