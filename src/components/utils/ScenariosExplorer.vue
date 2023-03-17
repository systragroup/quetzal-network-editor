<script>

import s3 from '../../AWSClient'
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

    }
  },
  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    loggedIn () { return this.$store.getters.loggedIn },
    scenariosList () { return this.$store.getters.scenariosList },
    modelsList () { return this.$store.getters.cognitoGroups },
    model () { return this.$store.getters.model },
    scenario () { return this.$store.getters.scenario },
  },
  mounted () { this.vmodelScen = this.scenario },

  methods: {
    change (val) {
      if (val && this.projectIsEmpty) {
        this.loadProject()
      } else {
        this.showDialog = true
      }
    },
    loadProject () {
      this.$store.commit('setScenario', this.vmodelScen)
      s3.readJson(this.model, this.vmodelScen + '/quenedi.json').then(resp => {
        this.$router.push({ name: 'Import', query: { s3Path: resp.network_paths } })
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

  },
}
</script>
<template>
  <section>
    <v-menu
      v-if="loggedIn"
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
          {{ model + '/' + scenario }}
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
          @change="change"
        >
          <v-list-item
            v-for="scen in scenariosList"
            :key="scen.model + scen.scenario"
            :value="scen.scenario"
            two-line
            :disabled="vmodelScen === scen.scenario"
          >
            <v-list-item-content>
              <v-list-item-title>{{ scen.scenario }}</v-list-item-title>
              <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-card>
    </v-menu>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="350"
      @keydown.enter="applyDialog"
      @keydown.esc="showDialog=false"
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
  </section>
</template>
<style lang="scss" scoped>
.title {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color:var(--v-secondarydark-base);
}
</style>
