<script setup>
import LinksSidePanel from './LinksSidePanel.vue'
import RoadSidePanel from './RoadSidePanel.vue'
import ODSidePanel from './ODSidePanel.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

const emits = defineEmits(['changeMode'])
const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

const showLeftPanel = computed(() => { return store.showLeftPanel })
const showLeftPanelContent = ref(true)
watch(showLeftPanel, (val) => {
  if (val) {
    // Leave time for animation to end (.fade-enter-active css rule)
    setTimeout(() => {
      showLeftPanelContent.value = true
    }, 200)
  } else {
    showLeftPanelContent.value = false
  }
})

const tcEditionMode = computed(() => linksStore.editorTrip !== null)
const disableTabs = computed(() => tcEditionMode.value || rlinksStore.editionMode)

const tab = ref()
onMounted(() => {
  rlinksStore.editionMode = false
  // default Tab when loading page.
  if (linksStore.links.features.length === 0 && !store.projectIsEmpty) {
    tab.value = 'road'
  } else {
    tab.value = 'pt'
  }
})

// Active a v-if once. So the component is loaded when click, and stay loaded for next click.
const loadComponent = ref({ pt: false, road: false, od: false })
watch(tab, (val) => {
  emits('change-mode', val)
  loadComponent.value[val] = true
})

const leftPanelDiv = ref(null)
const isResizing = ref(false)
const windowOffest = ref(0)
const width = ref(400) // Initial width of the resizable section
function startResize (event) {
  event.preventDefault()
  isResizing.value = true
  windowOffest.value = event.clientX - leftPanelDiv.value.clientWidth
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}
function resize (event) {
  if (isResizing.value) {
    const w = event.clientX - windowOffest.value
    width.value = w > 400 ? w : 400
    // event.target.style.cursor = 'col-resize'
  }
}
function stopResize () {
  isResizing.value = false
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
  // event.target.style.cursor = 'default'
}

</script>
<template>
  <section
    :class="showLeftPanel ? 'left-panel elevation-4' : 'left-panel-close'"
    :style="{ width: showLeftPanel? width + 'px ' : '0px' }"
  >
    <div
      class="resizable-handle"
      @mousedown="startResize"
    />
    <div
      class="left-panel-toggle-btn elevation-4"
      @click="store.changeLeftPanel()"
    >
      <v-icon
        size="small"
        color="secondarydark"
      >
        {{ showLeftPanel ? 'fas fa-chevron-left' : 'fas fa-chevron-right' }}
      </v-icon>
    </div>
    <transition name="fade">
      <div
        v-show="showLeftPanelContent"
        ref="leftPanelDiv"
        class="left-panel-content"
        :style="{ width: width + 'px'}"
      >
        <div>
          <div :style="{'margin-top': '20px','margin-bottom': '20px','margin-right':'20px'}">
            <v-tabs
              v-model="tab"
              :disabled="disableTabs"
              bg-color="secondary"
              grow
            >
              <v-tab value="pt">
                {{ $gettext("PT") }}
              </v-tab>
              <v-tab value="road">
                {{ $gettext("Road") }}
              </v-tab>
              <v-tab value="od">
                {{ $gettext("OD") }}
              </v-tab>
            </v-tabs>
            <template v-if="loadComponent.pt">
              <LinksSidePanel
                v-show="tab==='pt'"
                @clone-button="(e) => $emit('cloneButton',e)"
              />
            </template>

            <template v-if="loadComponent.road">
              <RoadSidePanel
                v-show="tab==='road'"
              />
            </template>
            <template v-if="loadComponent.od">
              <ODSidePanel
                v-show="tab==='od'"
              />
            </template>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>
<style lang="scss" scoped>
.left-panel {
  height: 100%;
  background-color:rgb(var(--v-theme-primarydark));
  transition: 0.3s;
  display:flex;
  z-index: 20;
}
.left-panel-close {
transition:0.3s;
width:0;
}
.left-panel .resizable-handle {
  width: 5px;
  height: 100%;
  background-color: rgb(var(--v-theme-background));
  left:100%;
  display: flex;
  position: relative;
  cursor: col-resize; /* Use the col-resize cursor for horizontal resizing */
}
.left-panel-content {
  display:inline-block;
  width : 100%;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  resize: horizontal;
  overflow: auto;

}
.left-panel-toggle-btn {
  left: 100%;
  width: 25px;
  z-index: 1;
  background-color: rgb(var(--v-theme-primarydark));
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: 50px;
  transition: 0.3s;
  cursor: pointer;
}
.left-panel-title {
  height: 50px;
  line-height: 55px;
  padding-left: 20px;
  font-size: 1.1em;
  margin-bottom: 10px;
}
.trip-list {
  height: height;
  padding-left:20px
}
.scrollable {
   overflow-y:scroll;

}
.drawer-list-item {
  padding: 0 13px !important;
  justify-content: flex-start !important;
  flex: 0;
  transition: 0.3s;
}
.list-item-icon {
  display: flex !important;
  flex-flow: row !important;
  justify-content: center !important;
  margin: 0 !important;
  color: white;
}

</style>
