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
  set: (v: boolean) => store.showLeftPanel = v })

const sectionRef = ref()
const toCollapse = ref(false)
const smoothResize = ref(false)

const minLeft = ref(400) // in pixels
const left = ref(0) // in percent

// init left panel size to minValue
onMounted(() => left.value = showLeftPanel.value ? pixelToPercent(minLeft.value) : 0)

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
    smoothResize.value = true
    setTimeout(() => {
      smoothResize.value = false
      showLeftPanel.value = false
    }, 500)
    left.value = 0
  } else {
    showLeftPanel.value = true
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

</script>
<template>
  <section
    ref="sectionRef"
    class="layout-row"
  >
    <v-btn
      v-if="!showLeftPanel"
      class="reopen-btn"
      color="regular"
      icon="fas fa-chevron-right"
      @click="expand"
    />
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
    />
    <!-- Right containter (Map) -->
    <div
      class="container map-view"
      :style="{ flexBasis: (100 - left) + '%' }"
    >
      <Map :mode="mode" />
    </div>
    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />
    <ODEditDialog v-else-if="dialogType === 'od'" />
  </section>
</template>
<style lang="scss" scoped>
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

.layout-row {
  height: 100%;
  width:100%;
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
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

.resize-handle {
  width: 5px;
  cursor: col-resize;
  background-color:rgb(var(--v-theme-lightgrey));
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.reopen-btn {
  position: absolute;
  margin: 1rem;
  z-index: 1000;
}

</style>
