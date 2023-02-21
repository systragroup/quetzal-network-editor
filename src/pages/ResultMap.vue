<script>

import ResultsSidePanel from '../components/ResultsSidePanel.vue'
import MapResults from '../components/MapResults.vue'
import ResultsSettings from '../components/ResultsSettings.vue'
import MapLegend from '../components/utils/MapLegend.vue'
import loadedLinks from '../../example/loaded_links.geojson'
import loadedNodes from '../../example/loaded_nodes.geojson'
export default {
  name: 'ResultMap',
  components: {
    ResultsSidePanel,
    MapResults,
    ResultsSettings,
    MapLegend,

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

    }
  },
  computed: {
    links () { return this.$store.getters['results/links'] },
    visibleLinks () { return this.$store.getters['results/visibleLinks'] },
    tripId () { return this.$store.getters['results/tripId'] },
    filterChoices () { return this.$store.getters['results/lineAttributes'] },
    displaySettings () { return this.$store.getters['results/displaySettings'] },
    colorScale () { return this.$store.getters['results/colorScale'] },
  },
  watch: {
    selectedTrips (val) {
      this.$store.commit('results/changeSelectedTrips', val)
      this.$store.commit('results/updateSelectedFeature')
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
    applySettings (payload) {
      this.$store.commit('results/applySettings', payload)
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

    <ResultsSettings
      v-model="showSettings"
      :display-settings="displaySettings"
      @submit="applySettings"
    />
    <div class="left-panel">
      <div
        :class="$store.getters.showLeftPanel ? 'legend-open elevation-4' : 'legend-close elevation-4'"
      >
        <MapLegend
          :color-scale="colorScale"
          :display-settings="displaySettings"
        />
      </div>
    </div>

    <MapResults
      :links="visibleLinks"
      :selected-trips="selectedTrips"
      :selected-feature="displaySettings.selectedFeature"
    />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;

}
.left-panel {
  height: 100%;
  position: absolute;

}
.legend-open {
  left: 350px;
  top: 80%;
  width: 160px;
  z-index: 3;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
  height: 50px;
  background-color: rgb(255, 255, 255);
  border: thin solid rgb(196, 196, 196);
}
.legend-close {
  left: 50px;
  top: 80%;
  width: 160px;
  z-index: 3;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
  height: 50px;
  background-color: rgb(255, 255, 255);
  border: thin solid rgb(196, 196, 196);
}

.hist {
  position: relative;
  bottom: -10px;
  flex-grow: 1;
  height: 20px;
  background-color: rgba(231, 17, 17);
  text-align: center;
  width:10px;
}

</style>
