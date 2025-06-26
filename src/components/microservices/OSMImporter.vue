<script setup lang="ts">
import { ref, computed, toRaw } from 'vue'
import { highwayList } from '@constants/highway.js'
import MapSelector from './MapSelector.vue'
import { useOSMStore } from '@src/store/OSMImporter.ts'
import { userLinksStore } from '@src/store/rlinks'
import { basePolygonFeature, PolygonFeatures } from '@src/types/geojson'
import Warning from '../utils/Warning.vue'
import { OSMImporterParams } from '@src/types/typesStore'

const runOSM = useOSMStore()
const rlinksStore = userLinksStore()
const showOverwriteDialog = ref(false)
const poly = ref<PolygonFeatures>(basePolygonFeature())

const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const stateMachineArn = computed(() => runOSM.stateMachineArn)
const running = computed(() => runOSM.running)
const error = computed(() => runOSM.error)
const errorMessage = computed(() => runOSM.errorMessage)

function getBBOX (val: PolygonFeatures) {
  poly.value = val
}

function importOSM () {
  if (rlinksIsEmpty.value) {
    runOSM.setCallID()
    const input: OSMImporterParams = {
      poly: toRaw(poly.value.geometry.coordinates[0]),
      highway: toRaw(runOSM.selectedHighway),
      callID: runOSM.callID,
      elevation: true,
      extended_cycleway: runOSM.extendedCycleway,
    }
    runOSM.startExecution(stateMachineArn.value, input)
  } else {
    showOverwriteDialog.value = true
  }
}

function applyOverwriteDialog () {
  rlinksStore.$reset()
  showOverwriteDialog.value = false
  importOSM()
}

</script>
<template>
  <v-card class="card">
    <v-card-title>
      {{ $gettext("Import OSM network in bounding box") }}
    </v-card-title>
    <Warning
      class="warning"
      :show="error"
      :messages="errorMessage"
    />
    <MapSelector @change="getBBOX" />
    <v-divider />

    <v-card-actions>
      <v-select
        v-model="runOSM.selectedHighway"
        class="select"
        :items="highwayList"
        :label="$gettext('Select road types')"
        variant="underlined"
        multiple
      >
        <template v-slot:selection="{ item, index }">
          <v-chip v-if="index < 2">
            <span>{{ item.title }}</span>
          </v-chip>
          <span
            v-if="index === 2"
            class="text-grey text-caption align-self-center"
          >
            (+{{ runOSM.selectedHighway.length - 2 }} others)
          </span>
        </template>
      </v-select>
      <v-spacer />
      <v-checkbox
        v-model="runOSM.extendedCycleway"
        label="Extended cycleway"
      />
      <v-spacer />
      <v-btn
        variant="outlined"
        color="success"
        :loading="running"
        :disabled="running"
        @click="importOSM"
      >
        {{ $gettext("Download") }}
      </v-btn>
    </v-card-actions>
  </v-card>
  <v-dialog
    v-model="showOverwriteDialog"
    persistent
    max-width="500"
    @keydown.enter="applyOverwriteDialog"
    @keydown.esc="showOverwriteDialog=false"
  >
    <v-card>
      <v-card-title class="text-h5">
        {{ $gettext("Overwrite current road network ?") }}
      </v-card-title>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="regular"
          @click="showOverwriteDialog = !showOverwriteDialog"
        >
          {{ $gettext("No") }}
        </v-btn>

        <v-btn
          color="primary"
          @click="applyOverwriteDialog"
        >
          {{ $gettext("Yes") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

.select{
  width:20rem;
}
.card {
  background-color: rgb(var(--v-theme-lightergrey));
  margin:1rem;
  max-height: 85vh;
  width: fit-content;
  overflow-y: auto;
  padding: 2rem;
}
.map {
  width:50rem;
  height: 35rem;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
.warning{
  max-width:50rem;
}
</style>
