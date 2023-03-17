<script>
import auth from '../../auth'
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
  watch: {
    vmodelScen (val) {
      this.$store.commit('setScenario', val)
      s3.readJson(this.model, val + '/quenedi.json').then(resp => {
        this.$router.push({ name: 'Import', query: { s3Path: resp.network_paths } })
      })

      // load project
    },
  },

  methods: {

    login () {
      if (this.projectIsEmpty) {
        auth.login()
      } else {
        this.action = 'login'
        this.showDialog = true
      }
    },
    logout () {
      if (this.projectIsEmpty) {
        this.menu = false
        auth.logout()
      } else {
        this.action = 'logout'
        this.showDialog = true
      }
    },
    applyDialog () {
      this.menu = false
      this.showDialog = false
      if (this.action === 'login') auth.login()
      if (this.action === 'logout') auth.logout()
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
          v-for="model in modelsList"
          :key="model"
        >
          <v-tab>{{ model }}</v-tab>
        </v-tabs>
        <v-list-item-group
          v-model="vmodelScen"
          color="primary"
        >
          <v-list-item
            v-for="scen in scenariosList"
            :key="scen.model + scen.scenario"
            :value="scen.scenario"
            two-line
          >
            <v-list-item-content>
              <v-list-item-title>{{ scen.scenario }}</v-list-item-title>
              <v-list-item-subtitle>{{ scen.lastModified }}</v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-card>
    </v-menu>
  </section>
</template>
<style lang="scss" scoped>
.title {
  font-size: 1.2em;
  padding-left: 1.2rem;
  color:var(--v-secondarydark-base);
}
</style>
