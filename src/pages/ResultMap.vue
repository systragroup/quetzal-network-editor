<script>

import { onMounted, ref, computed } from 'vue'
import { useResult } from '@comp/results/results.js'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { useIndexStore } from '@src/store/index'

import MapResults from '@comp/results/MapResults.vue'
import ResultsSidePanel from '@comp/results/ResultsSidePanel.vue'

const $gettext = s => s

export default {
  name: 'ResultMap',
  components: {
    MapResults,
    ResultsSidePanel,

  },

  setup () {
    const selectedLayer = ref('links')
    const selectedPreset = ref(null)

    const linksStore = useLinksStore()
    const rlinksStore = userLinksStore()
    const ODStore = useODStore()
    const store = useIndexStore()
    const {
      visibleLayer, NaNLayer, type, loadLayer, displaySettings, hasOD, matAvailableIndex,
      selectedCategory, selectedFilter, attributes, applySettings, changeSelectedFilter, filteredCategory,
      updateSelectedFeature, changeSelectedCategory,
    } = useResult()
    loadLayer(linksStore.links, null, null, 'headway')

    function updateSelectedFilter (val) {
      changeSelectedFilter(val)
      updateSelectedFeature()
    }
    function updateSelectedCategory (val) {
      changeSelectedCategory(val)
      updateSelectedFeature(val)
    }

    function changeLayer (layer) {
      selectedLayer.value = layer
      switch (layer) {
        case 'links':
          loadLayer(linksStore.links, null, null, 'headway')
          break
        case 'rlinks':
          loadLayer(rlinksStore.rlinks, null, null, 'speed')
          break
        case 'nodes':
          loadLayer(linksStore.nodes, null, null, 'boardings')
          break
        case 'rnodes':
          loadLayer(rlinksStore.rnodes, null, null, 'boardings')
          break
        case 'od':
          loadLayer(ODStore.layer, null, null, 'name')
          break
        default:
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters[`${layer}/layer`],
            type: this.$store.getters[`${layer}/type`],
            hasOD: this.$store.getters[`${layer}/hasOD`],
            ODindex: this.$store.getters[`${layer}/matAvailableIndex`],
          })
          break
      }
    }

    return {
      store,
      selectedLayer,
      selectedPreset,
      visibleLayer,
      NaNLayer,
      type,
      displaySettings,
      selectedCategory,
      selectedFilter,
      attributes,
      filteredCategory,
      applySettings,
      updateSelectedFilter,
      updateSelectedCategory,
      changeLayer,
    }
  },

}
</script>
<template>
  <section class="map-view">
    <ResultsSidePanel
      ref="sidePanel"
      :selected-category="selectedCategory"
      :selected-filter="selectedFilter"
      :layer-choices="store.availableLayers"
      :selected-layer="selectedLayer"
      :filter-choices="attributes"
      :filtered-cat="filteredCategory"
      :preset-choices="store.styles"
      :selected-preset="selectedPreset"
      @update-selectedCategory="updateSelectedCategory"
      @update-selectedFilter="updateSelectedFilter"
      @select-layer="changeLayer"
      @select-preset="changePreset"
      @delete-preset="clickDeletePreset"
    />
    <MapResults
      v-if="visibleLayer.features"
      :key="type"
      :layer-type="type"
      :links="visibleLayer"
      :nan-links="NaNLayer"
      :selected-feature="displaySettings.selectedFeature"
      :opacity="displaySettings.opacity"
      :offset="displaySettings.offset"
      @selectClick="featureClicked"
    >
    <!--
      <div
        v-for="file in availablePresets"
        :key="file.name"
      >
        <template v-if=" visibleRasters.includes(file.name) && availableLayers.includes(file.layer)">
          <StaticLayer
            :preset="file"
            :map="map"
            :order="visibleRasters.indexOf(file.name)+1"
          />
        </template>
      </div>
    -->
    </MapResults>
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
