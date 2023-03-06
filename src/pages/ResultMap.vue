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
      showSettings: false,
      selectedLayer: 'links',
      selectedCategory: [],
      form: {},
      showDialog: false,

    }
  },
  computed: {
    windowHeight () { return this.$store.getters.windowHeight - 100 },
    availableLayers () { return this.$store.getters.availableLayers },
    links () { return this.$store.getters['results/links'] },
    visibleLinks () { return this.$store.getters['results/visibleLinks'] },
    filterChoices () { return this.$store.getters['results/lineAttributes'] },
    displaySettings () { return this.$store.getters['results/displaySettings'] },
    selectedFilter () { return this.$store.getters['results/selectedFilter'] },
    colorScale () { return this.$store.getters['results/colorScale'] },
    filteredCategory () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.links.features.map(
        item => item.properties[this.selectedFilter])))
      return val
    },
  },
  watch: {
    selectedCategory (val) {
      this.$store.commit('results/changeSelectedCategory', val)
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
    updateSelectedFilter (val) {
      this.$store.commit('results/changeSelectedFilter', val)
      this.$store.commit('results/updateSelectedFeature')
    },
    changeLayer (layer) {
      this.selectedLayer = layer
      switch (layer) {
        case 'links':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.links,
            type: 'links',
            selectedFeature: 'headway',
          })
          break
        case 'rlinks':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rlinks,
            type: 'links',
            selectedFeature: 'speed',
          })
          break
        case 'nodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.nodes,
            type: 'nodes',
            selectedFeature: 'boardings',
          })
          break
        case 'rnodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rnodes,
            type: 'nodes',
            selectedFeature: 'boardings',
          })
          break
        default:
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters[`${layer}/layer`],
            type: this.$store.getters[`${layer}/type`],
          })
          break
      }
      // this.selectedFilter = this.$store.getters['results/selectedFilter']
      this.selectedCategory = this.$store.getters['results/selectedCategory']
    },
    featureClicked (event) {
      if (event.action === 'featureClick') {
        this.form = event.feature
        this.showDialog = true
      } else {
        this.$store.commit('zones/changeZone', { index: event.feature.index })
        this.$store.commit('results/updateLinks', this.$store.getters['zones/layer'])
        this.$store.commit('results/refreshVisibleLinks')
      }
    },

  },
}
</script>
<template>
  <section class="map-view">
    <ResultsSidePanel
      v-model="selectedCategory"
      :selected-filter="selectedFilter"
      :layer-choices="availableLayers"
      :selected-layer="selectedLayer"
      :filter-choices="filterChoices"
      :filtered-cat="filteredCategory"
      @update-selectedFilter="updateSelectedFilter"
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
      :key="$store.getters['results/type']"
      :links="visibleLinks"
      :selected-feature="displaySettings.selectedFeature"
      :opacity="displaySettings.opacity"
      @selectClick="featureClicked"
    />

    <v-dialog
      v-model="showDialog"
      scrollable
      persistent
      max-width="300"
      @keydown.enter="showDialog=false"
      @keydown.esc="showDialog=false"
    >
      <v-card max-height="60rem">
        <v-card-title class="text-h5">
          {{ $gettext("link Properties") }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-list>
            <v-text-field
              v-for="(value, key) in form"
              :key="key"
              :value="value"
              :label="key"
              filled
              readonly
            />
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="success"
            text
            @click="showDialog=false"
          >
            {{ $gettext("ok") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  background-color: var(--v-white-base);
  border: thin solid var(--v-mediumgrey-base);
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
  background-color: var(--v-lightgrey);
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
