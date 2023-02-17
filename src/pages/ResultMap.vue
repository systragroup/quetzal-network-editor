<script>

import ResultsSidePanel from '../components/ResultsSidePanel.vue'
import MapResults from '../components/MapResults.vue'
import ResultsSettings from '../components/ResultsSettings.vue'
import chroma from 'chroma-js'
import linksBase from '@static/links_base.geojson'

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
      links: loadedLinks,
      visibleLinks: linksBase,
      nodes: loadedNodes,
      tripId: [],
      selectedTrips: [],
      filterChoices: [],
      showSettings: false,
      selectedFeature: 'volume',
      maxWidth: 10,
      minWidth: 1,
      numStep: 10,
      scale: 'equal', // 'log'

    }
  },
  watch: {
    selectedTrips (val) {
      this.updateVisibles()
      this.UpdateSelectedFeature()
    },

  },
  created () {
    this.tripId = Array.from(new Set(this.links.features.map(item => item.properties.trip_id)))
    this.selectedTrips = this.tripId
    const header = new Set([])
    this.links.features.forEach(element => { Object.keys(element.properties).forEach(key => header.add(key)) })
    this.filterChoices = Array.from(header)
  },

  methods: {
    UpdateSelectedFeature () {
      const key = this.selectedFeature
      const featureArr = this.visibleLinks.features.map(link => link.properties[key])
      const maxVal = Math.max.apply(Math, featureArr)
      const minVal = Math.min.apply(Math, featureArr)

      this.visibleLinks.features.forEach(
        // eslint-disable-next-line no-return-assign
        link => link.properties.display_width =
        ((this.maxWidth - this.minWidth) * ((link.properties[key] - minVal) / (maxVal - minVal))) + this.minWidth,
      )
      const colorScale = chroma.scale('OrRd').padding([0.2, 0])
        .domain([this.minWidth, this.maxWidth], this.scale).classes(this.numStep)

      this.visibleLinks.features.forEach(
        // eslint-disable-next-line no-return-assign
        link => link.properties.display_color = colorScale(link.properties.display_width).hex(),
      )
    },
    updateVisibles () {
      const tripSet = new Set(this.selectedTrips)
      this.visibleLinks.features = this.links.features.filter(link => tripSet.has(link.properties.trip_id))
    },
    changeSettings (payload) {
      this.selectedFeature = payload.selectedFeature
      this.maxWidth = payload.maxWidth
      this.minWidth = payload.minWidth
      this.numStep = payload.numStep
      this.scale = payload.scale
      this.showSettings = false
      this.UpdateSelectedFeature()
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
    <MapResults
      :visible-links="visibleLinks"
      :nodes="nodes"
      :selected-trips="selectedTrips"
      :selected-feature="selectedFeature"
    >
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
          <v-btn
            class="setting"
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
    </MapResults>
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;

}

.setting {
  position: absolute;
  top: 10px;
  right: 20px;
}
</style>
