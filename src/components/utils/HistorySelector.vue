<script setup lang='ts'>
import { ref, computed, toRefs } from 'vue'

interface Props {
  order: number
}
const props = defineProps<Props>()
const { order } = toRefs(props)

const show = ref(false)
import { useLinksStore } from '@src/store/links'
const linksStore = useLinksStore()
import { userLinksStore } from '@src/store/rlinks'
const rlinksStore = userLinksStore()

const isRoadMode = computed(() => rlinksStore.editionMode)
const isEditorMode = computed(() => linksStore.editorTrip !== null)

const history = computed(() => isEditorMode.value ? linksStore.history : isRoadMode.value ? rlinksStore.history : [])
const redoStack = computed(() => isEditorMode.value ? linksStore.redoStack : isRoadMode.value ? rlinksStore.redoStack : [])
const timeline = computed(() => [
  ...history.value.map(el => ({ name: el.name, type: 'past' })),
  { name: 'Current state', type: 'current' },
  ...redoStack.value.map(el => ({ name: el.name, type: 'future' })),
])

</script>
<template>
  <v-menu
    v-if="isRoadMode||isEditorMode"
    v-model="show"
    :close-on-content-click="false"
    :persistent="true"
    no-click-animation
    location="bottom"
    offset="5"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props:menuProps }">
      <div
        class="layer-button"
        :style="{ '--n': order }"
      >
        <v-btn
          v-bind="menuProps"
          color="regular"
          icon="fas fa-clock-rotate-left"
        />
      </div>
    </template>
    <v-card
      :max-width="500"
      :max-height="'calc(100vh - 200px)'"
    >
      <v-card-title class="subtitle">
        {{ $gettext('History') }}
      </v-card-title>
      <v-list-item
        v-for="(item, key) in timeline.toReversed()"
        :key="key"
        :class="{
          'history-current': item.type === 'current',
          'history-future': item.type === 'future'
        }"
      >
        <v-list-item-title>
          {{ item.name }}
        </v-list-item-title>
      </v-list-item>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.layer-button {
  right: calc(3.5rem * var(--n) + 0.5rem);
  top:1rem;
  z-index: 2;
  position: absolute;
}
.subtitle {
  font-size: 1.5em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem
}
.is-active{
  opacity:1;
  background-color: rgb(var(--v-theme-primary));
}
.card {
  width: 500px;
  overflow-y: auto;
  padding: 40px;
}
.history-current {
  font-weight: bold;
  background: rgba(0, 150, 255, 0.1);
}

.history-future {
  opacity: 0.5;
}

</style>
