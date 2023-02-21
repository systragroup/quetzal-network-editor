<script>

import ResultsSidePanel from '../components/ResultsSidePanel.vue'
import MapResults from '../components/MapResults.vue'
import ResultsSettings from '../components/ResultsSettings.vue'
import loadedLinks from '../../example/loaded_links.geojson'
import loadedNodes from '../../example/loaded_nodes.geojson'
export default {
  name: 'ResultMap',
  components: {
    ResultsSidePanel,
    MapResults,
    ResultsSettings,

  },

  data () {
    return {
      mapIsLoaded: false,
      mapboxPublicKey: null,
      minZoom: {
        nodes: 14,
        links: 8,
      },
      selectedTrips: [],
      showSettings: false,
      selectedFeature: 'volume',
      maxWidth: 10,
      minWidth: 1,
      numStep: 10,
      scale: 'equal', // 'log'

    }
  },
  computed: {
    links () { return this.$store.getters['results/links'] },
    visibleLinks () { return this.$store.getters['results/visibleLinks'] },
    tripId () { return this.$store.getters['results/tripId'] },
    filterChoices () { return this.$store.getters['results/lineAttributes'] },
  },
  watch: {
    selectedTrips (val) {
      this.$store.commit('results/changeSelectedTrips', val)
      this.$store.commit('results/updateSelectedFeature', {
        selectedFeature: this.selectedFeature,
        maxWidth: this.maxWidth,
        minWidth: this.minWidth,
        numStep: this.numStep,
        scale: this.scale,
      })
    },
  },
  beforeCreate () {
    this.$store.commit('results/loadLinks', loadedLinks)
    this.$store.commit('results/loadNodes', loadedNodes)
  },
  created () {
    this.selectedTrips = structuredClone(this.$store.getters['results/selectedTrips'])
  },

  methods: {

    changeSettings (payload) {
      this.selectedFeature = payload.selectedFeature
      this.maxWidth = Number(payload.maxWidth)
      this.minWidth = Number(payload.minWidth)
      this.numStep = Number(payload.numStep)
      this.scale = payload.scale
      this.showSettings = false
      this.$store.commit('results/updateSelectedFeature', {
        selectedFeature: this.selectedFeature,
        maxWidth: this.maxWidth,
        minWidth: this.minWidth,
        numStep: this.numStep,
        scale: this.scale,
      })
    },
  },
}
</script>
<template>
  <section class="map-view">
    <ResultsSidePanel
      v-model="selectedTrips"
      :links="links"
      :filter-choices="filterChoices"
      :trip-id="tripId"
    />
    <v-menu
      v-model="showSettings"
      :close-on-content-click="false"
      :close-on-click="false"
      :origin="'top right'"
      transition="scale-transition"
      :position-y="30"
      :nudge-width="200"
      offset-x
      offset-y
    >
      <template v-slot:activator="{ on, attrs }">
        <div class="setting">
          <v-btn

            fab
            small
            v-bind="attrs"
            v-on="on"
          >
            <v-icon
              color="regular"
            >
              fa-solid fa-cog
            </v-icon>
          </v-btn>
        </div>
      </template>
      <ResultsSettings
        :selected-feature="selectedFeature"
        :max-width="maxWidth"
        :min-width="minWidth"
        :num-step="numStep"
        :scale="scale"

        @submit="changeSettings"
      />
    </v-menu>
    <MapResults
      :links="visibleLinks"
      :selected-trips="selectedTrips"
      :selected-feature="selectedFeature"
    />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;

}

.setting {
  left: 98%;
  width: 0px;
  z-index: 2;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: 50px;
}
</style>
