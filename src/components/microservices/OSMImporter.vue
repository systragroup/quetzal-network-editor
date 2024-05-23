<script setup>
import { ref, computed } from 'vue'
import { highwayList } from '@constants/highway.js'
import MapSelector from './MapSelector.vue'
import { useOSMStore } from '@src/store/OSMImporter'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'

const store = useIndexStore()
const runOSM = useOSMStore()
const rlinksStore = userLinksStore()
const showOverwriteDialog = ref(false)
const poly = ref(null)

const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })
const running = computed(() => { return runOSM.running })
const error = computed(() => { return runOSM.error })
const errorMessage = computed(() => { return runOSM.errorMessage })

function getBBOX (val) {
  poly.value = val
}

function importOSM () {
  if (rlinksIsEmpty.value) {
    runOSM.setCallID()

    let input = ''
    if (poly.value.style === 'bbox') {
      input = {
        bbox: poly.value.geometry,
        highway: runOSM.selectedHighway,
        callID: runOSM.callID,
        elevation: true,
        extended_cycleway: runOSM.selectedExtended,
      }
    } else {
      input = {
        poly: poly.value.geometry,
        highway: runOSM.selectedHighway,
        callID: runOSM.callID,
        elevation: true,
        extended_cycleway: runOSM.selectedExtended,
      }
    }

    runOSM.startExecution(input)
  } else {
    showOverwriteDialog.value = true
  }
}

function applyOverwriteDialog () {
  store.initrLinks()
  showOverwriteDialog.value = false
  importOSM()
}

</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <v-card-title>
        {{ $gettext("Import OSM network in bounding box") }}
      </v-card-title>
      <v-spacer />
      <v-card-subtitle>
        <v-alert
          v-if="error"
          density="compact"
          width="50rem"
          variant="outlined"
          text
          type="error"
        >
          {{ $gettext("There as been an error while importing OSM network. \
            Please try again. If the problem persist, contact us.") }}
          <p
            v-for="key in Object.keys(errorMessage)"
            :key="key"
          >
            <b>{{ key }}: </b>{{ errorMessage[key] }}
          </p>
        </v-alert>
      </v-card-subtitle>
      <MapSelector @change="getBBOX" />
      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-select
          v-model="runOSM.selectedHighway"
          class="select"
          :items="highwayList"
          label="Select Item"
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
          v-model="runOSM.selectedExtended"
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
  </section>
</template>
<style lang="scss" scoped>

.select{
  width:20rem;
}
.card {
  background-color: rgb(var(--v-theme-lightergrey));
  margin:1rem;
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem;
}
.map {
  max-width: 100rem;
  width:50rem;
  height: 35rem;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
