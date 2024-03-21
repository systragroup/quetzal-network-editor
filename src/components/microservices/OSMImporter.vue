<script>
import { highwayList as cHighwayList } from '@constants/highway.js'
import MapSelector from './MapSelector.vue'
import { useOSMStore } from '@src/store/OSMImporter'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'

export default {
  name: 'OSMImporter',
  components: {
    MapSelector,
  },

  setup () {
    const store = useIndexStore()
    const runOSM = useOSMStore()
    const rlinksStore = userLinksStore()
    const showOverwriteDialog = ref(false)
    const poly = ref(null)
    const nodes = ref({})
    const selectedHighway = ref(null)
    const selectedExtended = ref(false)
    const highwayList = ref(cHighwayList)

    const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })
    const highway = computed(() => { return runOSM.highway })
    const extendedCycleway = computed(() => { return runOSM.extendedCycleway })
    const callID = computed(() => { return runOSM.callID })
    const running = computed(() => { return runOSM.running })
    const error = computed(() => { return runOSM.error })
    const errorMessage = computed(() => { return runOSM.errorMessage })
    function getBBOX (val) {
      poly.value = val
    }
    function importOSM () {
      if (rlinksIsEmpty.value) {
        runOSM.saveParams({ highway: selectedHighway.value, extendedCycleway: selectedExtended.value })
        runOSM.setCallID()
        runOSM.startExecution({ coords: poly.value.geometry, method: poly.value.style })
      } else {
        showOverwriteDialog.value = true
      }
    }

    function applyOverwriteDialog () {
      store.initrLinks()
      showOverwriteDialog.value = false
      importOSM()
    }

    onMounted(() => {
      selectedHighway.value = highway.value
      selectedExtended.value = extendedCycleway.value
    })

    onBeforeUnmount(() => {
      runOSM.saveParams({ highway: selectedHighway.value, extendedCycleway: selectedExtended.value })
    })

    return {
      showOverwriteDialog,
      poly,
      nodes,
      selectedHighway,
      selectedExtended,
      highwayList,
      rlinksIsEmpty,
      highway,
      extendedCycleway,
      callID,
      running,
      error,
      errorMessage,
      getBBOX,
      importOSM,
      applyOverwriteDialog,
    }
  },
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
          v-model="selectedHighway"
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
              (+{{ selectedHighway.length - 2 }} others)
            </span>
          </template>
        </v-select>
        <v-spacer />
        <v-checkbox
          v-model="selectedExtended"
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
