<script>

import ResultsSidePanel from '@comp/results/ResultsSidePanel.vue'
import MapResults from '@comp/results/MapResults.vue'
import ResultsSettings from '@comp/results/ResultsSettings.vue'
import MapLegend from '@comp/utils/MapLegend.vue'
const $gettext = s => s

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
      minZoom: {
        nodes: 14,
        links: 8,
      },
      showSettings: false,
      selectedLayer: 'links',
      selectedPreset: null,
      selectedCategory: [],
      form: {},
      showDialog: false,
      showPresetDialog: false,
      showDeleteDialog: false,
      inputName: '', //  preset Name in dialog
      tempDisplaySettings: {}, // put display settings to save them if click yes on dialog
      presetToDelete: '', // name of the preset to delete. use in dialog to confirm.

    }
  },
  computed: {
    windowHeight () { return this.$store.getters.windowHeight - 100 },
    availableLayers () { return this.$store.getters.availableLayers },
    availablePresets () { return this.$store.getters.styles },
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
  beforeDestroy () {
    this.$store.commit('results/unload')
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
            type: 'LineString',
            selectedFeature: 'headway',
          })
          break
        case 'rlinks':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rlinks,
            type: 'LineString',
            selectedFeature: 'speed',
          })
          break
        case 'nodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.nodes,
            type: 'Point',
            selectedFeature: 'boardings',
          })
          break
        case 'rnodes':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters.rnodes,
            type: 'Point',
            selectedFeature: 'boardings',
          })
          break
        case 'od':
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters['od/layer'],
            type: 'LineString',
            selectedFeature: 'volume',
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
    changePreset (preset) {
      this.selectedPreset = preset.name
      if (this.availableLayers.includes(preset.layer)) {
        this.changeLayer(preset.layer)
      } else {
        this.$store.commit('changeNotification',
          { text: $gettext('Preset Layer does not exist'), autoClose: true, color: 'error' })
      }
      this.applySettings(preset.displaySettings)
    },
    featureClicked (event) {
      if (event.action === 'featureClick') {
        this.form = event.feature
        this.showDialog = true
        // OD click.
      } else if (this.$store.getters[`${this.selectedLayer}/hasOD`]) {
        const prop = this.displaySettings.selectedFeature
        this.$store.commit(`${this.selectedLayer}/changeZone`, { index: event.feature.index, selectedProperty: prop })
        this.$store.commit('results/updateLinks', this.$store.getters[`${this.selectedLayer}/layer`])
      }
    },
    clickSavePreset (event) {
      // open a dialog to chose the name and accept
      this.tempDisplaySettings = event
      this.inputName = this.selectedPreset
      this.showPresetDialog = true
    },
    clickDeletePreset (event) {
      // open a dialog to make sure we want to delete
      this.presetToDelete = event.name
      this.showDeleteDialog = true
    },
    createPreset () {
      if (this.$refs.form.validate()) {
        this.showPresetDialog = false
        this.$store.commit('addStyle',
          { name: this.inputName, layer: this.selectedLayer, displaySettings: this.tempDisplaySettings })
        this.$store.commit('changeNotification',
          { text: $gettext('Preset Saved'), autoClose: true, color: 'success' })

        this.selectedPreset = this.inputName
      }
    },
    deletePreset () {
      this.$store.commit('deleteStyle', this.presetToDelete)
      this.showDeleteDialog = false
      if (this.presetToDelete === this.selectedPreset) {
        // if it was selected. unselect it
        this.selectedPreset = null
      }
      this.$store.commit('changeNotification',
        { text: $gettext('Preset deleted'), autoClose: true, color: 'success' })
      this.presetToDelete = ''
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
      :preset-choices="availablePresets"
      :selected-preset="selectedPreset"
      @update-selectedFilter="updateSelectedFilter"
      @select-layer="changeLayer"
      @select-preset="changePreset"
      @delete-preset="clickDeletePreset"
    />

    <ResultsSettings
      v-model="showSettings"
      :display-settings="displaySettings"
      :feature-choices="filterChoices"
      @submit="applySettings"
      @save-preset="clickSavePreset"
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
      :offset="displaySettings.offset"
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
    <v-dialog
      v-model="showPresetDialog"
      persistent
      max-width="400"
      @keydown.esc="showPresetDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Create or modify preset") }}
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-col cols="12">
              <v-form
                ref="form"
                lazy-validation
                @submit.prevent="createPreset"
              >
                <v-text-field
                  v-model="inputName"
                  autofocus
                  :rules="[value => !!value || 'Required.']"
                  :label="$gettext('name')"
                />
              </v-form>
            </v-col>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer />

          <v-btn
            color="grey"
            text
            @click="showPresetDialog=false"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="createPreset"
          >
            {{ $gettext("ok") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="showDeleteDialog"
      persistent
      max-width="400"
      @keydown.esc="showDeleteDialog=false"
      @keydown.enter="deletePreset"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Delete") + ' ' + presetToDelete + ' ?' }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />

          <v-btn
            color="grey"
            text
            @click="showDeleteDialog=false"
          >
            {{ $gettext("Cancel") }}
          </v-btn>
          <v-btn
            color="error"
            text
            @click="deletePreset"
          >
            {{ $gettext("delete") }}
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
