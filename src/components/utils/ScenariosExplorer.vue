<script>

import s3 from '../../AWSClient'
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
      vmodelScen: '',
      errorMessage: '',
      copyDialog: false,
      selectedScenario: null,
      input: '',
      deleteDialog: false,

    }
  },
  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    loggedIn () { return this.$store.getters.loggedIn },
    scenariosList () { return this.$store.getters.scenariosList },
    filterdScenarios () { return this.scenariosList.filter(scen => scen.model === this.model) },
    modelsList () { return this.$store.getters.cognitoGroups },
    model () { return this.$store.getters.model },
    scenario () { return this.$store.getters.scenario },
  },
  mounted () {
  },

  methods: {
    selectScenario (val) {
      if (val) {
        if (this.projectIsEmpty) {
          this.loadProject()
        } else {
          this.showDialog = true
        }
      }
    },
    loadProject () {
      this.$store.commit('setScenario', this.vmodelScen)
      s3.readJson(this.model, 'quenedi.config.json').then(resp => {
        console.log(resp)
        this.$router.push({ name: 'Import', query: { s3Path: resp } })
        this.menu = false
      })
    },

    applyDialog () {
      this.menu = false
      this.showDialog = false
      this.loadProject()
    },
    cancelDialog () {
      // reset vmodel back to loaded scenario
      this.vmodelScen = this.scenario
      this.showDialog = false
      this.menu = false
    },
    deleteScenario () {
      this.menu = false
      this.deleteDialog = false
      s3.deleteScenario(this.model, this.selectedScenario).then(resp => {
        this.menu = false
        this.deleteDialog = false
        s3.getScenario(this.model).then(
          res => { this.$store.commit('setScenariosList', res) }).catch(
          err => console.error(err))
        this.$store.commit('changeNotification',
          { text: $gettext('scenario deleted'), autoClose: true, color: 'success' })
      }).catch((err) => {
        this.menu = false
        this.deleteDialog = false
        console.error(err)
        this.$store.commit('changeNotification',
          { text: $gettext('an error occured'), autoClose: true, color: 'error' })
      })
    },
    async copyProject () {
      if (this.input === '') {
        this.errorMessage = 'Please enter a name'
      } else if (this.input.includes('/')) {
        this.errorMessage = 'cannot have / in name'
      } else if (this.filterdScenarios.map(p => p.scenario).includes(this.input)) {
        this.errorMessage = 'project already exist'
      } else {
        // eslint-disable-next-line max-len
        s3.copyScenario(this.model, this.selectedScenario, this.input).then(
          () => {
            s3.getScenario(this.model).then(
              res => { this.$store.commit('setScenariosList', res) }).catch(
              err => console.error(err))
          },
        ).catch(err => console.log(err))
        this.closeCopy()
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
      :close-on-content-click="false"

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
          v-for="tab in modelsList"
          :key="tab"
        >
          <v-tab>{{ tab }}</v-tab>
        </v-tabs>
        <v-list-item-group
          v-model="vmodelScen"
          color="primary"
          :mandatory="vmodelScen? true:false"
          @change="selectScenario"
        >
          <v-list-item
            v-for="scen in filterdScenarios"
            :key="scen.model + scen.scenario"
            :value="scen.scenario"
            two-line
          >
            <v-list-item-content>
              <v-list-item-title>{{ scen.scenario }}</v-list-item-title>
              <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
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
              :disabled="scen.scenario===vmodelScen"
              class="ma-1"
              @click.stop="()=>{deleteDialog=true; selectedScenario=scen.scenario;}"
            >
              <v-icon
                small
                color="grey"
              >
                fas fa-trash
              </v-icon>
            </v-btn>
          </v-list-item>
          <v-divider />
        </v-list-item-group>
        <v-list-item>
          <v-btn
            text
          >
            new scenario
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
      @keydown.enter="deleteScenario"
      @keydown.esc="()=>deleteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h4">
          {{ $gettext("Delete ")+ selectedScenario+' ?' }}
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
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="deleteScenario"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="copyDialog"
      persistent
      max-width="290"
      @keydown.enter="copyProject"
      @keydown.esc="cancel"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("copy ") + selectedScenario }}
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
            @click="copyProject"
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
</style>
