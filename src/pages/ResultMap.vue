<script>

import ResultsSidePanel from '../components/ResultsSidePanel.vue'
import MapResults from '../components/MapResults.vue'
import ResultsSettings from '../components/ResultsSettings.vue'
import MapLegend from '../components/utils/MapLegend.vue'

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
      selectedGroup: structuredClone(this.$store.getters['results/selectedGroup']),
      showSettings: false,
      selectedLayer: 'links',

    }
  },
  computed: {
    windowHeight () { return this.$store.getters.windowHeight - 100 },
    availableLayers () { return this.$store.getters.availableLayers },
    links () { return this.$store.getters['results/links'] },
    visibleLinks () { return this.$store.getters['results/visibleLinks'] },
    filterChoices () { return this.$store.getters['results/lineAttributes'] },
    displaySettings () { return this.$store.getters['results/displaySettings'] },
    colorScale () { return this.$store.getters['results/colorScale'] },
    filteredCategory () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.links.features.map(
        item => item.properties[this.selectedGroup.selectedFilter])))
      return val
    },
  },
  watch: {
    selectedGroup (val) {
      this.$store.commit('results/changeSelectedGroup', val)
      this.$store.commit('results/updateSelectedFeature')
    },

  },
  created () {
    this.changeLayer(this.selectedLayer)
  },

  methods: {
    applySettings (payload) {
      this.$store.commit('results/applySettings', payload)
    },
    changeLayer (layer) {
      this.selectedLayer = layer
      switch (layer) {
        case 'links':
          this.$store.commit('results/loadLinks', this.$store.getters.links)
          break
        case 'rlinks':
          this.$store.commit('results/loadLinks', this.$store.getters.rlinks)
          break
        case 'llinks':
          this.$store.commit('results/loadLinks', this.$store.getters['llinks/links'])
          break
      }
    },
  },
}
</script>
<template>
  <section class="map-view">
    <ResultsSidePanel
      v-model="selectedGroup"
      :layer-choices="availableLayers"
      :selected-layer="selectedLayer"
      :filter-choices="filterChoices"
      :filtered-cat="filteredCategory"
      @select-layer="changeLayer"
    />

    <ResultsSettings
      v-model="showSettings"
      :display-settings="displaySettings"
      :feature-choices="filterChoices"
      @submit="applySettings"
    />
    <div class="left-panel">
      <div
        :class="$store.getters.showLeftPanel ? 'legend-open elevation-4' : 'legend-close elevation-4'"
        :style="{'top':`${windowHeight}px`}"
      >
        <MapLegend
          :color-scale="colorScale"
          :display-settings="displaySettings"
        />
      </div>
    </div>

    <MapResults
      :links="visibleLinks"
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
