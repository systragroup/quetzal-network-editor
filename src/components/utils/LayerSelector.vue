<script setup>
import { useIndexStore } from '@src/store/index'
import { ref, onMounted, watch, toRefs } from 'vue'
import DragList from './DragList.vue'

const props = defineProps({
  choices: {
    type: Array,
    default: () => [],
  },
  availableLayers: {
    type: Array,
    default: () => [],
  },
  map: {
    type: Object,
    default: () => {},
  },
})
const { choices, map } = toRefs(props)
const store = useIndexStore()
const show = ref(false)
const selectedLayers = ref([])
onMounted(() => { selectedLayers.value = store.visibleRasters })
watch(selectedLayers, (val) => {
  const order = choices.value.map(l => l.name)
  const orderedSelected = order.filter(el => val.includes(el))
  store.setVisibleRasters(orderedSelected)
})
watch(choices, (vals) => {
  const names = vals.map(el => el.name)
  selectedLayers.value = selectedLayers.value.filter(layer => names.includes(layer))
}, { deep: true })

function moveLayer (name) {
  if (selectedLayers.value.includes(name)) {
    const order = choices.value.map(l => l.name)
    const orderedSelected = order.filter(el => selectedLayers.value.includes(el))
    store.setVisibleRasters(orderedSelected)
    // order all active layers
    for (let i = 0; i < orderedSelected.length - 1; i++) {
      const topLayer = orderedSelected[i]
      const bottomLayer = orderedSelected[i + 1]
      map.value.moveLayer(bottomLayer + '-layer', topLayer + '-layer')
    }
  }
}

// const selectedOpacity = ref(0)

</script>
<template>
  <v-menu
    v-model="show"
    :close-on-content-click="false"
    :persistent="!(true)"
    no-click-animation
    location="bottom"
    offset="5"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props:menuProps }">
      <div class="layer-button">
        <v-btn
          v-bind="menuProps"
          :color="(selectedLayers.length > 0)? 'success' : 'white'"
          icon="fas fa-layer-group"
        />
      </div>
    </template>
    <v-card
      :max-width="500"
      :max-height="'calc(100vh - 200px)'"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Static Layers') }}
      </v-card-title>
      <DragList
        v-slot="item"
        :items="choices"
        @move="moveLayer"
      >
        <v-list-item>
          <template v-slot:prepend>
            <v-checkbox-btn
              v-model="selectedLayers"
              :value="item.name"
              :false-icon="!availableLayers.includes(item.layer)? 'fas fa-exclamation-triangle':'fa-eye-slash fa'"
              :true-icon="'fa-eye fa'"
              :color="'primary'"
              :disabled="!availableLayers.includes(item.layer)"
            />
          </template>
          <v-tooltip
            location="top"
            open-delay="300"
          >
            <template v-slot:activator="{ props:ttprops }">
              <v-list-item-title
                :style="{'cursor': 'default','padding-left':'1rem'}"
                v-bind="ttprops"
              >
                {{ item.name }}
              </v-list-item-title>
            </template>
            <span v-if="!availableLayers.includes(item.layer)">{{ $gettext('Data not found: ') + item.layer }}</span>
            <span v-else>{{ item.displaySettings.selectedFeature + ' ' + $gettext('from') + ' ' + item.layer }}</span>
          </v-tooltip>
          <template v-slot:append>
            <v-icon
              :style="{'cursor':'grab'}"
              size="small"
              icon="fa-solid fa-arrows-up-down"
            />
          </template>
        </v-list-item>
      </DragList>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.layer-button {
  left: calc(96% - 10rem);
  top:1rem;
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
</style>
