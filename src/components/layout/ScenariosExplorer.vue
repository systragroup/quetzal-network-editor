<script>

import s3 from '@src/AWSClient'
const $gettext = s => s

export default {
  name: 'ScenariosExplorer',
  components: {

  },

  props: [],
  events: [],
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
      protectedScens: ['base'],

    }
  },
  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    loggedIn () { return this.$store.getters.loggedIn },
    scenariosList () {
      // sort by alphabetical order, with protectedScens one one top
      const arr = this.$store.getters.scenariosList
      return arr.sort((a, b) => {
        if (this.protectedScens.includes(a.scenario)) {
          return -1 // `a` comes before `b`
        } else if (this.protectedScens.includes(b.scenario)) {
          return 1 // `b` comes before `a`
        } else {
          // default sorting, not case sensitive!
          return a.scenario.localeCompare(b.scenario, undefined, { sensitivity: 'base' })
        }
      })
    },
    modelsList () { return this.$store.getters.bucketList },
    model () { return this.$store.getters.model },
    scenario () { return this.$store.getters.scenario },
  },
  watch: {
    menu (val) {
      if (val) {
        this.$store.dispatch('getScenario', { model: this.localModel })
      }
    },
    async localModel (val) {
      this.$store.commit('setScenariosList', [])
      this.loading = true
      // try {
      //  this.localConfig = await s3.readJson(val, 'quenedi.config.json')
      // } catch (err) {
      // not an error.
      // }

      await this.$store.dispatch('getScenario', { model: val })
      this.loading = false
    },
  },
  mounted () {
    this.localModel = this.modelsList[0]
  },

  methods: {
    selectScenario (val) {
      this.modelScen = val.model + val.scenario
      this.localScen = val.scenario
      if (val.scenario) {
        if (this.projectIsEmpty) {
          this.loadProject()
        } else {
          this.showDialog = true
        }
      }
    },
    async loadProject () {
      this.$store.commit('run/cleanRun')
      this.$store.commit('setModel', this.localModel)
      this.$store.commit('setScenario', this.localScen)
      await this.$store.dispatch('run/getParameters', {
        model: this.localModel,
        path: this.localScen + '/inputs/params.json',
      })

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
      s3.deleteFolder(this.localModel, this.scenarioToDelete).then(resp => {
        this.deleteDialog = false
        this.$store.dispatch('getScenario', { model: this.localModel })
        this.$store.commit('changeNotification',
          { text: $gettext('Scenario deleted'), autoClose: true, color: 'success' })
      }).catch((err) => {
        this.deleteDialog = false
        console.error(err)
        this.$store.commit('changeNotification',
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
            await s3.copyFolder(this.localModel, this.selectedScenario, this.input)
            this.$store.commit('changeNotification',
              { text: $gettext('Scenario successfully copied'), autoClose: true, color: 'success' })
          } else {
            // this is a new project
            // copy the parameters file from Base. this will create a new project .
            const base = this.protectedScens[0]
            await s3.copyFolder(this.localModel, base + '/inputs/params.json', this.input)
            this.$store.commit('changeNotification',
              { text: $gettext('Scenario created'), autoClose: true, color: 'success' })
          }
        } catch (err) { this.$store.commit('changeAlert', err); this.selectedScenario = null }
        this.closeCopy()
        this.loading = true
        // wait 500ms to fetch the scenarios to make sure its available on the DB
        setTimeout(() => {
          this.$store.dispatch('getScenario', { model: this.localModel }).then(() => { this.loading = false })
            .catch((err) => { this.$store.commit('changeAlert', err); this.loading = false })
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
  <section v-if="loggedIn && modelsList.length>0">
    <v-menu
      v-model="menu"
      :close-on-click="!showDialog && !deleteDialog && !copyDialog"
      :close-on-content-click="false"
      max-width="460px"
      offset-y
    >
      <template v-slot:activator="{ on, attrs }">
        <div
          class="title"
          v-bind="attrs"
          v-on="on"
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
            :href="'#'+tab"
          >
            {{ tab }}
          </v-tab>
        </v-tabs>
        <v-list-item
          v-for="scen in scenariosList"
          :key="scen.model + scen.scenario"
          :value="scen.model + scen.scenario"
          :class="{ 'is-active': modelScen === scen.model + scen.scenario}"
          two-line
          @click="selectScenario(scen)"
        >
          <v-list-item-content>
            <v-list-item-title>{{ scen.scenario }}</v-list-item-title>
            <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
            <v-list-item-subtitle>{{ scen.userEmail }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-btn
            icon
            class="ma-1"
            @click.stop="()=>{copyDialog=true; selectedScenario=scen.scenario; input = scen.scenario +' copy'}"
          >
            <v-icon
              small
              color="regular"
            >
              fas fa-copy
            </v-icon>
          </v-btn>
          <v-btn
            icon
            :disabled="(scen.model+scen.scenario===modelScen) || (protectedScens.includes(scen.scenario))"
            class="ma-1"
            @click.stop="()=>{deleteDialog=true; scenarioToDelete=scen.scenario;}"
          >
            <v-icon
              small
              color="grey"
            >
              {{ protectedScens.includes(scen.scenario)? 'fas fa-lock':'fas fa-trash' }}
            </v-icon>
          </v-btn>
        </v-list-item>
        <v-list-item v-show="loading">
          <v-spacer />
          <v-progress-circular
            color="primary"
            indeterminate
          />
          <v-spacer />
        </v-list-item>
        <v-divider />
        <v-list-item>
          <v-btn
            text
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
      @keydown.esc="cancel"
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
            text
            @click="closeCopy"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="createProject"
          >
            {{ $gettext("ok") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>
.title {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color:var(--v-secondarydark-base);
}
.is-active{
  opacity:1;
  background-color:var(--v-primary-base);

}
</style>
