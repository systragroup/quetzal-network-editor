<script>

import { onMounted } from 'vue'
import { useResult } from '@comp/results/results.js'
import { useLinksStore } from '@src/store/links'
import MapResults from '@comp/results/MapResults.vue'

const $gettext = s => s

export default {
  name: 'ResultMap',
  components: {
    MapResults,

  },

  setup () {
    const linksStore = useLinksStore()
    const { visibleLayer, NaNLayer, type, loadLayer, displaySettings, hasOD, matAvailableIndex } = useResult()
    loadLayer(linksStore.links, null, null, 'headway')

    return { visibleLayer, NaNLayer, type, displaySettings, hasOD, matAvailableIndex }
  },

}
</script>
<template>
  <section class="map-view">
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
