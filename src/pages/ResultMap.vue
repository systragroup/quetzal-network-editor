<script setup>

import { ref, computed, nextTick, onMounted } from 'vue'
import { useResult } from '@comp/results/results'
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
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'
const { $gettext } = useGettext()

const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const store = useIndexStore()
const {
  layer, visibleLayer, nanLayer, type, loadLayer, displaySettings, hasOD, attributesWithOD, matSelectedIndex, changeOD,
  isIndexAvailable, selectedCategory, selectedFilter, attributes, applySettings,
  changeSelectedFilter, refreshVisibleLinks,
  filteredCategory, updateSelectedFeature, changeSelectedCategory, colorScale,
} = useResult()

const mapRef = ref() //  we update the map with this ref
function updateSettings (payload) {
  applySettings(payload)
  refreshVisibleLinks()
  updateSelectedFeature()
  nextTick(() => mapRef.value.update())
}
function updateSelectedFilter (val) {
  changeSelectedFilter(val)
  refreshVisibleLinks()
  updateSelectedFeature()
  nextTick(() => mapRef.value.update())
}
function updateSelectedCategory (val) {
  changeSelectedCategory(val)
  refreshVisibleLinks()
  updateSelectedFeature()
  nextTick(() => mapRef.value.update())
}

const selectedLayer = ref('')

async function changeLayer (layer, preset = null) {
  switch (layer) {
    case 'links':
      loadLayer(linksStore.links, null, preset)
      break
    case 'rlinks':
      loadLayer(rlinksStore.rlinks, null, preset)
      break
    case 'nodes':
      loadLayer(linksStore.nodes, null, preset)
      break
    case 'rnodes':
      loadLayer(rlinksStore.rnodes, null, preset)
      break
    case 'od':
      loadLayer(ODStore.layer, null, preset)
      break
    default:
      const data = await store.getOtherFile(layer, 'geojson')
      const matrix = await store.getOtherFile(layer, 'json')
      loadLayer(data, matrix, preset)
      break
  }
  selectedLayer.value = layer
  mapRef.value.update()
}

const selectedPreset = ref(null)
const availableLayers = computed(() => store.availableLayers)

const visibleRasters = computed(() => store.visibleRasters)
const availableStyles = computed(() => store.styles)

async function changePreset (preset) {
  selectedPreset.value = preset.name
  if (availableLayers.value.includes(preset.layer)) {
    // change layer if it exist
    await changeLayer(preset.layer, preset)
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

// preset creation

const presetDialog = ref()
const inputName = ref('')

async function savePreset (preset) {
  // open a dialog to chose the name and accept
  const tempDisplaySettings = preset
  inputName.value = selectedPreset.value
  const resp = await presetDialog.value.openDialog()
  if (resp) {
    const style = {
      name: cloneDeep(inputName.value),
      layer: cloneDeep(selectedLayer.value),
      displaySettings: cloneDeep(tempDisplaySettings),
      selectedFilter: cloneDeep(selectedFilter.value),
    }

    // only add the list of category (eyes) if its not everything.
    // first filter to only get possible cat. we way load a style with non existing cat (ex highway=quenedi)
    const filteredCat = selectedCategory.value.filter(val => filteredCategory.value.includes(val))
    if (filteredCat.length < filteredCategory.value.length) {
      style.selectedCategory = cloneDeep(selectedCategory.value)
    }

    // if its an OD preset. save the selected index.
    if (attributesWithOD.value.includes(tempDisplaySettings.selectedFeature) && hasOD.value) {
      style.selectedIndex = cloneDeep(matSelectedIndex.value)
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

// delete preset

const deleteDialog = ref()

async function deleteButton (preset) {
  const presetToDelete = preset.name
  // obj contain trip and message.
  const resp = await deleteDialog.value.openDialog()
  if (resp) {
    store.deleteStyle(presetToDelete)
    if (presetToDelete === selectedPreset.value) {
    // if it was selected. unselect it
      selectedPreset.value = null
    }
    store.changeNotification(
      { text: $gettext('Preset deleted'), autoClose: true, color: 'success' })
    presetToDelete.value = ''
  }
}

// show values dialog
const showDialog = ref(false)
const formData = ref([])
function featureClicked (event) {
  if (event.action === 'featureClick') {
    const index = event.feature.index
    if (index) {
      formData.value = layer.value.features.filter(el => el.properties.index === index)[0].properties
      showDialog.value = true
    } else {
      // formData.value = event.feature
      store.changeNotification({ text: $gettext('Layer have no index. Cannot show properties'),
        autoClose: true, color: 'warning' })
    }
    // OD click.
  } else {
    // will verify in this function if hasOD and the selected feature is an OD.
    changeOD(event.feature.index)
    mapRef.value.update()
  }
}

import { useMapStore } from '@src/store/map'
const mapStore = useMapStore()

onMounted(() => {
  // if we visit result first in the app (map is still in mtl)
  // try to recenter on links oor rlink
  if (mapStore.initalPosition) {
    const layer = linksStore.linksIsEmpty ? rlinksStore.rlinks : linksStore.links
    mapRef.value.fitBounds(layer)
  }
})

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
      @delete-preset="deleteButton"
    />
    <MapResults
      v-if="visibleLayer.features"
      ref="mapRef"
      :key="type+String(displaySettings.extrusion)"
      v-slot="slotProps"
      :selected-layer="selectedLayer"
      :layer-type="type"
      :extrusion="displaySettings.extrusion"
      :labels="displaySettings.labels"
      :links="visibleLayer"
      :nan-links="nanLayer"
      :selected-feature="displaySettings.selectedFeature"
      :opacity="displaySettings.opacity"
      :offset="displaySettings.offset"
      @select-click="featureClicked"
    >
      <div class="legend">
        <MapLegend
          v-show="visibleLayer.features.length>0"
          key="result"
          :order="0"
          :color-scale="colorScale"
          :display-settings="displaySettings"
        />
      </div>
      <div :style="{'display':'flex'}">
        <ResultsSettings
          :display-settings="displaySettings"
          :feature-choices="attributes"
          :type="type"
          @submit="updateSettings"
          @save-preset="savePreset"
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
    <PromiseDialog
      ref="presetDialog"
      :title="$gettext('Create or modify preset')"
    >
      <v-text-field
        v-model="inputName"
        autofocus
        :rules="[value => !!value || 'Required.']"
        :label="$gettext('name')"
      />
    </PromiseDialog>
    <PromiseDialog
      ref="deleteDialog"
      :title=" $gettext('Delete %{name}?', { name: selectedPreset }) "
      :confirm-button="$gettext('Delete')"
      confirm-color="error"
    />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: 100%;
  width: 100%;
  display: flex;
}
.legend {
  position:absolute
}

</style>
