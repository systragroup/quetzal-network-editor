<script>
import { useIndexStore } from '@src/store/index'
import { ref, onMounted, watch } from 'vue'

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
  setup (props) {
    const store = useIndexStore()
    const show = ref(false)
    const selectedLayers = ref([])
    onMounted(() => { selectedLayers.value = store.visibleRasters })
    watch(selectedLayers, (val) => {
      const resp = []
      val.forEach(item => resp.push(item))
      store.setVisibleRasters(resp)
    })
    watch(props.choices, (vals) => {
      const choices = vals.map(el => el.name)
      selectedLayers.value = selectedLayers.value.filter(layer => choices.includes(layer))
    })

    const selectedOpacity = ref(0)

    return { show, selectedLayers, selectedOpacity }
  },
}
</script>
<template>
  <v-menu
    v-model="show"
    :close-on-content-click="false"
    :persistent="!(true)"
    no-click-animation
    location="bottom end"
    offset="5"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props }">
      <div class="layer-button">
        <v-btn
          v-bind="props"
          :color="(selectedLayers.length > 0)? 'success' : 'regular'"
          icon="fas fa-layer-group"
        />
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
        <template v-slot:prepend>
          <v-checkbox-btn
            v-model="selectedLayers"
            :value="item.name"
            :false-icon="!availableLayers.includes(item.layer)? 'fas fa-exclamation-triangle':'fa-eye-slash fa'"
            :true-icon="'fa-eye fa'"
            :disabled="!availableLayers.includes(item.layer)"
          />
        </template>
        <v-tooltip
          location="top"
          open-delay="300"
          content-class="custom-tooltip"
        >
          <template v-slot:activator="{ props }">
            <v-list-item-title
              :style="{'cursor': 'default','padding-left':'1rem'}"
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
  left: 96%;
  top:5rem;
  z-index: 2;
  position: relative;
  align-items: center;
  justify-content: center;

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
