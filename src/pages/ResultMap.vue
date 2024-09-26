<!-- eslint-disable no-case-declarations -->
<script setup>

import { ref, computed } from 'vue'
import { useResult } from '@comp/results/results.js'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { useIndexStore } from '@src/store/index'

import { cloneDeep } from 'lodash'
import MapResults from '@comp/results/MapResults.vue'
import ResultsSidePanel from '@comp/results/ResultsSidePanel.vue'
import ResultsSettings from '@comp/results/ResultsSettings.vue'
import MapLegend from '@comp/utils/MapLegend.vue'
import LayerSelector from '@comp/utils/LayerSelector.vue'
import StyleSelector from '@comp/utils/StyleSelector.vue'
import StaticLayer from '@comp/utils/StaticLayer.vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const store = useIndexStore()
const {
  visibleLayer, NaNLayer, type, loadLayer, displaySettings, hasOD, ODfeatures, matSelectedIndex, changeOD,
  isIndexAvailable, selectedCategory, selectedFilter, attributes, applySettings, changeSelectedFilter,
  filteredCategory, updateSelectedFeature, changeSelectedCategory, colorScale,
} = useResult()

const mapRef = ref() //  we update the map with this ref
function updateSettings (payload) {
  applySettings(payload)
  mapRef.value.update()
}
function updateSelectedFilter (val) {
  changeSelectedFilter(val)
  updateSelectedFeature()
  mapRef.value.update()
}
function updateSelectedCategory (val) {
  changeSelectedCategory(val)
  updateSelectedFeature()
  mapRef.value.update()
}

const selectedLayer = ref('')

async function changeLayer (layer, settings = null) {
  selectedLayer.value = layer
  switch (layer) {
    case 'links':
      await loadLayer(linksStore.links, null, settings)
      break
    case 'rlinks':
      await loadLayer(rlinksStore.rlinks, null, settings)
      break
    case 'nodes':
      await loadLayer(linksStore.nodes, null, settings)
      break
    case 'rnodes':
      await loadLayer(rlinksStore.rnodes, null, settings)
      break
    case 'od':
      await loadLayer(ODStore.layer, null, settings)
      break
    default:
      const data = await store.getOtherFile(layer, 'geojson')
      const matrix = await store.getOtherFile(layer, 'json')
      await loadLayer(data, matrix, settings)
      break
  }
  mapRef.value.update()
}

const selectedPreset = ref(null)
const availableLayers = computed(() => store.availableLayers)

const visibleRasters = computed(() => store.visibleRasters)
const availableStyles = computed(() => store.styles)

const presetToDelete = ref('')
const showDeleteDialog = ref(false)
const showPresetDialog = ref(false)
const inputName = ref('')
const tempDisplaySettings = ref({})

async function changePreset (preset) {
  selectedPreset.value = preset.name
  if (availableLayers.value.includes(preset.layer)) {
    // change layer if it exist
    await changeLayer(preset.layer, preset.displaySettings)
    if (attributes.value.includes(preset?.selectedFilter)) {
      // if preset contain a filter. apply it if it exist.
      changeSelectedFilter(preset.selectedFilter)
      // if there is a list of cat. apply them, else its everything
      if (Object.keys(preset).includes('selectedCategory')) {
        changeSelectedCategory(preset.selectedCategory)
      }
      // else it will show all
    } else {
      // if the filter is in the preset but not the the layer. just put a warning.
      if (Object.keys(preset).includes('selectedFilter')) {
        store.changeNotification(
          {
            text: preset.selectedFilter + ' ' + $gettext('filter does not exist. use default one'),
            autoClose: true,
            color: 'error',
          })
      }
    }
  } else {
    store.changeNotification(
      { text: $gettext('Preset Layer does not exist'), autoClose: true, color: 'error' })
  }
  // apply all settings.
  // if its an OD. click on the selected index.
  if (Object.keys(preset).includes('selectedIndex') && isIndexAvailable(preset.selectedIndex)) {
    changeOD(preset.selectedIndex)
    store.changeNotification({})
  }
  mapRef.value.update()
}

function clickDeletePreset (event) {
  // open a dialog to make sure we want to delete
  presetToDelete.value = event.name
  showDeleteDialog.value = true
}

function clickSavePreset (event) {
  // open a dialog to chose the name and accept
  tempDisplaySettings.value = event
  inputName.value = selectedPreset.value
  showPresetDialog.value = true
}
async function createPreset (event) {
  const resp = await event
  if (resp.valid) {
    showPresetDialog.value = false
    const style = {
      name: cloneDeep(inputName.value),
      layer: cloneDeep(selectedLayer.value),
      displaySettings: cloneDeep(tempDisplaySettings.value),
      selectedFilter: cloneDeep(selectedFilter.value),
    }

    // only add the list of category (eyes) if its not everything.
    // first filter to only get possible cat. we way load a style with non existing cat (ex highway=quenedi)
    const filteredCat = selectedCategory.value.filter(val => filteredCategory.value.includes(val))
    if (filteredCat.length < filteredCategory.value.length) {
      style.selectedCategory = cloneDeep(selectedCategory.value)
    }

    // if its an OD preset. save the selected index.
    if (ODfeatures.value.includes(tempDisplaySettings.value.selectedFeature) && hasOD.value) {
      style.selectedIndex = matSelectedIndex.value
    }

    store.addStyle(style)
    if (visibleRasters.value.includes(inputName.value)) {
      store.changeNotification(
        {
          text: $gettext('Preset changed. Please reload the active layer on the map'),
          autoClose: true,
          color: 'warning',
        })
    } else {
      store.changeNotification(
        { text: $gettext('Preset Saved'), autoClose: true, color: 'success' })
    }

    selectedPreset.value = cloneDeep(inputName.value)
  }
}

function deletePreset () {
  store.deleteStyle(presetToDelete.value)
  showDeleteDialog.value = false
  if (presetToDelete.value === selectedPreset.value) {
    // if it was selected. unselect it
    selectedPreset.value = null
  }
  store.changeNotification(
    { text: $gettext('Preset deleted'), autoClose: true, color: 'success' })
  presetToDelete.value = ''
}

const showDialog = ref(false)
const formData = ref([])
function featureClicked (event) {
  if (event.action === 'featureClick') {
    formData.value = event.feature
    showDialog.value = true
    // OD click.
  } else {
    // will verify in this function if hasOD and the selected feature is an OD.
    changeOD(event.feature.index)
    mapRef.value.update()
  }
}

</script>
<template>
  <section class="map-view">
    <ResultsSidePanel
      :selected-category="selectedCategory"
      :selected-filter="selectedFilter"
      :layer-choices="availableLayers"
      :selected-layer="selectedLayer"
      :filter-choices="attributes"
      :filtered-cat="filteredCategory"
      :preset-choices="availableStyles"
      :selected-preset="selectedPreset"
      @update-selected-category="updateSelectedCategory"
      @update-selected-filter="updateSelectedFilter"
      @select-layer="changeLayer"
      @select-preset="changePreset"
      @delete-preset="clickDeletePreset"
    />

    <div class="left-panel">
      <MapLegend
        v-show="visibleLayer.features.length>0"
        key="result"
        :order="0"
        :color-scale="colorScale"
        :display-settings="displaySettings"
      />
    </div>
    <MapResults
      v-if="visibleLayer.features"
      ref="mapRef"
      :key="type+String(displaySettings.extrusion)"
      v-slot="slotProps"
      :selected-layer="selectedLayer"
      :layer-type="type"
      :extrusion="displaySettings.extrusion"
      :links="visibleLayer"
      :nan-links="NaNLayer"
      :selected-feature="displaySettings.selectedFeature"
      :opacity="displaySettings.opacity"
      :offset="displaySettings.offset"
      @selectClick="featureClicked"
    >
      <div :style="{'display':'flex'}">
        <ResultsSettings
          :display-settings="displaySettings"
          :feature-choices="attributes"
          :type="type"
          @submit="updateSettings"
          @save-preset="clickSavePreset"
        />
        <StyleSelector />

        <LayerSelector
          v-if="availableStyles.length>0"
          :choices="availableStyles"
          :map="slotProps.map"
          :available-layers="availableLayers"
        />
      </div>
      <div
        v-for="file in availableStyles"
        :key="file.name"
      >
        <template v-if=" visibleRasters.includes(file.name) && availableLayers.includes(file.layer)">
          <StaticLayer
            :preset="file"
            :map="slotProps.map"
            :order="visibleRasters.indexOf(file.name)+1"
            :visible-rasters="visibleRasters"
          />
        </template>
      </div>
    </MapResults>

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
              v-for="(value, key) in formData"
              :key="key"
              :model-value="value"
              :label="key"
              variant="filled"
              readonly
            />
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="success"
            variant="text"
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
        <v-form
          validate-on="submit lazy"
          @submit.prevent="createPreset"
        >
          <v-card-text>
            <v-container>
              <v-col cols="12">
                <v-text-field
                  v-model="inputName"
                  autofocus
                  :rules="[value => !!value || 'Required.']"
                  :label="$gettext('name')"
                />
              </v-col>
            </v-container>
          </v-card-text>
          <v-card-actions>
            <v-spacer />

            <v-btn
              color="grey"
              variant="text"
              @click="showPresetDialog=false"
            >
              {{ $gettext("Cancel") }}
            </v-btn>

            <v-btn
              color="green-darken-1"
              variant="text"
              type="submit"
            >
              {{ $gettext("ok") }}
            </v-btn>
          </v-card-actions>
        </v-form>
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
            variant="text"
            @click="showDeleteDialog=false"
          >
            {{ $gettext("Cancel") }}
          </v-btn>
          <v-btn
            color="error"
            variant="text"
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

</style>
