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
    selectedCategory () { return this.$store.getters['results/selectedCategory'] },
    colorScale () { return this.$store.getters['results/colorScale'] },
    filteredCategory () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.links.features.map(
        item => item.properties[this.selectedFilter])))
      return val
    },
  },
  created () {
    // chose first available layer. if none. use Links as its an empty geojson (no bug with that)
    if (this.availableLayers.lenght > 0) { this.selectedLayer = this.availableLayers[0] }
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
    updateSelectedCategory (val) {
      this.$store.commit('results/changeSelectedCategory', val)
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
          })
          break
        default:
          this.$store.commit('results/loadLinks', {
            geojson: this.$store.getters[`${layer}/layer`],
            type: this.$store.getters[`${layer}/type`],
          })
          break
      }
    },
    changePreset (preset) {
      this.selectedPreset = preset.name
      if (this.availableLayers.includes(preset.layer)) {
        // change layer if it exist
        this.changeLayer(preset.layer)
        if (this.filterChoices.includes(preset?.selectedFilter)) {
          // if preset contain a filter. apply it if it exist.
          this.$store.commit('results/changeSelectedFilter', preset.selectedFilter)
          // if there is a list of cat. apply them, else its everything
          if (Object.keys(preset).includes('selectedCategory')) {
            this.$store.commit('results/changeSelectedCategory', preset.selectedCategory)
          } // else it will show all
        } else {
          // if the filter is in the preset but not the the layer. just put a warning.
          if (Object.keys(preset).includes('selectedFilter')) {
            this.$store.commit('changeNotification',
              {
                text: preset.selectedFilter + ' ' + $gettext('filter does not exist. use default one'),
                autoClose: true,
                color: 'error',
              })
          }
        }
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
        const style = {
          name: structuredClone(this.inputName),
          layer: structuredClone(this.selectedLayer),
          displaySettings: structuredClone(this.tempDisplaySettings),
          selectedFilter: structuredClone(this.selectedFilter),
        }
        // only add the list of category (eyes) if its not everything.
        // first filter to only get possible cat. we way load a style with non existing cat (ex highway=quenedi)
        const filteredCat = this.selectedCategory.filter(val => this.filteredCategory.includes(val))
        if (filteredCat.length < this.filteredCategory.length) {
          style.selectedCategory = structuredClone(this.selectedCategory)
        }
        this.$store.commit('addStyle', style)
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
      ref="sidePanel"
      :selected-category="selectedCategory"
      :selected-filter="selectedFilter"
      :layer-choices="availableLayers"
      :selected-layer="selectedLayer"
      :filter-choices="filterChoices"
      :filtered-cat="filteredCategory"
      :preset-choices="availablePresets"
      :selected-preset="selectedPreset"
      @update-selectedCategory="updateSelectedCategory"
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
      <MapLegend
        :color-scale="colorScale"
        :display-settings="displaySettings"
      />
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
