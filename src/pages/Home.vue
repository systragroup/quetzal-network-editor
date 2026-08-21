<script setup lang="ts">
// const SidePanel = defineAsyncComponent(() => import('@comp/map/sidePanel/SidePanel.vue'))
// const Map = defineAsyncComponent(() => import('@comp/map/Map.vue'))
import SidePanel from '@comp/map/sidePanel/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import LinksEditDialog from '@src/components/map/Dialog/LinksEditDialog.vue'
import RoadsEditDialog from '@src/components/map/Dialog/RoadsEditDialog.vue'
import ODEditDialog from '@src/components/map/Dialog/ODEditDialog.vue'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { ref, onUnmounted, computed, onMounted } from 'vue'

import { useForm } from '@src/composables/UseForm'
const { dialogType } = useForm()

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const mode = ref<'pt' | 'road' | 'od'>('pt')

onUnmounted(() => {
  linksStore.setEditorTrip(null)
  rlinksStore.editionMode = false
  if (store.anchorMode) { store.changeAnchorMode() }
  if (store.cyclewayMode) { store.changeCyclewayMode() }
})

const showLeftPanel = computed({
  get: () => store.showLeftPanel,
  set: (v: boolean) => store.showLeftPanel = v,
})

const sectionRef = ref()
const toCollapse = ref(false)
const smoothResize = ref(false)

const minLeft = ref(420) // in pixels
const left = ref(0) // in percent

// init left panel size to minValue
onMounted(() => {
  left.value = showLeftPanel.value ? pixelToPercent(minLeft.value) : 0
  toCollapse.value = !showLeftPanel.value // init to grey if hidden
})

function pixelToPercent(pixels: number) {
  const rect = sectionRef.value.getBoundingClientRect()
  return (pixels / rect.width) * 100
}

function startResize() {
  if (left.value <= 1) {
    showLeftPanel.value = true // when close and drag to open
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
}

function onResize(e: MouseEvent) {
  const rect = sectionRef.value.getBoundingClientRect()
  const pixels = e.clientX - rect.left

  let percent = (pixels / rect.width) * 100
  percent = Math.min(50, percent) // clip to max of 50%
  left.value = percent
  // grey out and collapse on mouseup
  toCollapse.value = pixels <= minLeft.value
}

function stopResize() {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
  if (toCollapse.value) {
    collapse()
  } else {
    showLeftPanel.value = true
  }
}
function toggle() {
  if (showLeftPanel.value) {
    collapse()
  } else {
    expand()
  }
}
function expand() {
  showLeftPanel.value = true
  smoothResize.value = true
  setTimeout(() => {
    smoothResize.value = false
    toCollapse.value = false
  }, 500)
  left.value = pixelToPercent(minLeft.value + 1)
}
function collapse() {
  smoothResize.value = true
  setTimeout(() => {
    smoothResize.value = false
    showLeftPanel.value = false
    toCollapse.value = true
  }, 500)
  left.value = 0
}

</script>
<template>
  <section
    ref="sectionRef"
    class="layout-row"
  >
    <!-- Left containter (side Panel) -->
    <div
      class="container left-content"
      :class="{ fading: toCollapse, smooth: smoothResize }"
      :style="{ flexBasis: left + '%' }"
    >
      <SidePanel
        v-show="showLeftPanel"
        v-model="mode"
      />
    </div>

    <!-- scroll bar -->
    <div
      class="resize-handle"
      @mousedown="startResize"
    >
      <div class="resize-grip" />
    </div>

    <!-- Right containter (Map and button) -->
    <div
      class="container"
      :style="{ flexBasis: (100 - left) + '%' }"
    >
      <!-- button to collapse side panel -->
      <div
        class="floating-toggle"
        @click="toggle"
      >
        <v-icon
          size="small"
          color="secondarydark"
        >
          {{ showLeftPanel ? 'fas fa-chevron-left' : 'fas fa-chevron-right' }}
        </v-icon>
      </div>
      <Map :mode="mode" />
    </div>
    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />
    <ODEditDialog v-else-if="dialogType === 'od'" />
  </section>
</template>
<style lang="scss" scoped>
.layout-row {
  height: 100%;
  width:100%;
  display: flex;
  flex-direction: row;
}
.container {
  overflow: hidden;
  height: 100%;
  width: 100%;
  display: flex;
}
.container.smooth{
  transition: flex-basis 0.5s ease;
}
.left-content {
  transition:
    opacity 0.5s ease,
    filter 0.5s ease;
}
.left-content.fading {
  opacity: 0.5;
  filter: grayscale(1);
  pointer-events: none;
}
.resize-handle {
  width: 5px; /* larger hitbox */
  cursor: col-resize;
  display: flex;
  background-color:rgb(var(--v-theme-grey));
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}
.resize-grip {
  width: 3px;
  height: 40px;
  border-radius: 10px;
  background-color: rgb(var(--v-theme-lightgrey));
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.7;
}
.resize-handle:hover .resize-grip {
  background-color:rgb(var(--v-theme-darkgrey));
  opacity: 1;
}
.floating-toggle {
  position: absolute;
  width: 25px;
  height: 50px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-primarydark));
  cursor: pointer;
}

</style>
