<script>
import { highwayList } from '@constants/highway.js'
import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import MapSelector from './MapSelector.vue'

export default {
  name: 'OSMImporter',
  components: {
    MapSelector,
  },

  data () {
    return {
      showOverwriteDialog: false,
      poly: null,
      nodes: {},
      selectedHighway: null,
      selectedExtended: false,
      highwayList: highwayList,
    }
  },
  computed: {
    rlinksIsEmpty () { return this.$store.getters.rlinksIsEmpty },
    highway () { return this.$store.getters['runOSM/highway'] },
    extendedCycleway () { return this.$store.getters['runOSM/extendedCycleway'] },
    callID () { return this.$store.getters['runOSM/callID'] },
    running () { return this.$store.getters['runOSM/running'] },
    error () { return this.$store.getters['runOSM/error'] },
    errorMessage () { return this.$store.getters['runOSM/errorMessage'] },
  },

  created () {
    this.selectedHighway = this.highway
    this.selectedExtended = this.extendedCycleway
  },
  beforeDestroy () {
    this.$store.commit('runOSM/saveParams',
      { highway: this.selectedHighway, extendedCycleway: this.selectedExtended })
  },
  methods: {
    getBBOX (val) {
      this.poly = val
    },
    importOSM () {
      if (this.rlinksIsEmpty) {
        this.$store.commit('runOSM/saveParams',
          { highway: this.selectedHighway, extendedCycleway: this.selectedExtended })
        this.$store.commit('runOSM/setCallID')
        this.$store.dispatch('runOSM/startExecution', { coords: this.poly.geometry, method: this.poly.style })
      } else {
        this.showOverwriteDialog = true
      }
    },

    applyOverwriteDialog () {
      this.$store.commit('loadrLinks', linksBase)
      this.$store.commit('loadrNodes', nodesBase)
      this.showOverwriteDialog = false
      this.importOSM()
    },
  },

}
</script>
<template>
  <section>
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
          dense
          width="50rem"
          outlined
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
      <v-card-actions>
        <MapSelector @change="getBBOX" />
      </v-card-actions>
      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-select
          v-model="selectedHighway"
          :items="highwayList"
          attach
          chips
          :menu-props="{ top: true, offsetY: true,maxHeight:'30rem'}"
          label="Highways to import"
          multiple
        >
          <template v-slot:selection="{ item, index }">
            <v-chip v-if="index <= 0">
              <span>{{ item }}</span>
            </v-chip>
            <span
              v-if="index === 1"
              class="grey--text text-caption"
            >
              (+{{ selectedHighway.length - 1 + ' ' + $gettext('more') }} )
            </span>
          </template>
        </v-select>
        <v-spacer />
        <v-checkbox
          v-if="$store.getters.model === 'quetzal-cyclops-dev'"
          v-model="selectedExtended"
          label="Extended cycleway"
        />
        <v-spacer />
        <v-btn
          text
          outlined
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

.card {
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem;
}
.map {
  max-width: 100rem;
  width:50rem;
  height: 35rem;
}
.v-card__text {
    padding: 0px 24px 0px;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
