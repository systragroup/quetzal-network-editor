<script>

export default {
  name: 'LayerSelector',
  components: {
  },
  props: {
    choices: {
      type: Array,
      default: () => [],
    },
    availableLayers: {
      type: Array,
      default: () => [],
    },
  },
  data () {
    return {
      show: false,
      selectedLayers: [],
      selectedOpacity: 0,

    }
  },
  watch: {
    selectedLayers (val) {
      const resp = []
      val.forEach(item => resp.push(item))
      console.log(resp)
      this.$store.commit('setVisibleRasters', resp)
    },
    choices (vals) {
      const choices = vals.map(el => el.name)
      this.selectedLayers = this.selectedLayers.filter(layer => choices.includes(layer))
    },

  },
  mounted () {
    this.selectedLayers = this.$store.getters.visibleRasters
  },

}
</script>
<template>
  <v-menu
    v-model="show"
    :close-on-content-click="false"
    :persistent="!(true)"
    :origin="'top right'"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props }">
      <div class="layer-button">
        <v-btn
          size="small"

          v-bind="props"
        >
          <v-icon
            :color="(selectedLayers.length > 0)? 'success' : 'regular'"
          >
            fas fa-layer-group
          </v-icon>
        </v-btn>
      </div>
    </template>
    <v-card
      :max-width="300"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Static Layers') }}
      </v-card-title>
      <v-list-item
        v-for="(item,key) in choices"
        :key="key"
      >
        <v-list-item-action>
          <v-checkbox
            v-model="selectedLayers"
            :value="item.name"
            :false-icon="!availableLayers.includes(item.layer)? 'fas fa-exclamation-triangle':'fa-eye-slash fa'"
            :true-icon="'fa-eye fa'"
            :disabled="!availableLayers.includes(item.layer)"
          />
        </v-list-item-action>

        <v-tooltip
          location="top"
          open-delay="300"
          content-class="custom-tooltip"
        >
          <template v-slot:activator="{ props }">
            <v-list-item-title
              :style="{'cursor': 'default'}"
              v-bind="props"
            >
              {{ item.name }}
            </v-list-item-title>
          </template>
          <span v-if="!availableLayers.includes(item.layer)">{{ $gettext('Data not found: ') + item.layer }}</span>
          <span v-else>{{ item.displaySettings.selectedFeature + ' ' + $gettext('from') + ' ' + item.layer }}</span>
        </v-tooltip>
      </v-list-item>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.layer-button {
  left: 98%;
  top:3rem;
  width: 0px;
  z-index: 2;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: 50px;
}
.card {
  width: 500px;
  overflow-y: auto;
  padding: 40px;
}
.subtitle {
  font-size: 1.5em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem

}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.custom-tooltip {
    opacity: 1!important;
    background: var(--v-tooltip-bg, rgba(97, 97, 97, 1)) !important;
}
</style>
