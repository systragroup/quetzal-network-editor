<script>
import LinksSidePanel from './LinksSidePanel.vue'
import RoadSidePanel from './RoadSidePanel.vue'
import ODSidePanel from './ODSidePanel.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'

export default {
  name: 'SidePanel',
  components: {
    LinksSidePanel,
    RoadSidePanel,
    ODSidePanel,
  },
  emits: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'cloneButton', 'deleteButton', 'propertiesButton', 'change-mode'],
  setup (_, context) {
    const store = useIndexStore()
    const linksStore = useLinksStore()

    const showLeftPanel = computed(() => { return store.showLeftPanel })
    const showLeftPanelContent = ref(true)
    watch(showLeftPanel, (val) => {
      if (val) {
        // Leave time for animation to end (.fade-enter-active css rule)
        setTimeout(() => {
          showLeftPanelContent.value = true
        }, 500)
      } else {
        showLeftPanelContent.value = false
      }
    })

    const editorTrip = computed(() => { return linksStore.editorTrip })

    const tab = ref('pt')
    onMounted(() => {
      if (linksStore.links.features.length === 0 && !store.projectIsEmpty) {
        tab.value = 'road'
      }
    })
    watch(tab, (mode) => {
      context.emit('change-mode', mode)
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

    return {
      tab,
      store,
      showLeftPanel,
      showLeftPanelContent,
      editorTrip,
      leftPanelDiv,
      isResizing,
      windowOffest,
      width,
      startResize,
    }
  },

}
</script>
<template>
  <section
    ref="leftPanelDiv"
    :class="showLeftPanel ? 'left-panel elevation-4' : 'left-panel-close'"
    :style="{ width:showLeftPanel? width + 'px' : '0px' }"
  >
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
    <div
      class="resizable-handle"
      @mousedown="startResize"
    />
    <transition name="fade">
      <div
        v-show="showLeftPanelContent"
        id="left-panel"
        ref="leftPanel"
        class="left-panel-content"
      >
        <div>
          <div :style="{'margin-top': '20px','margin-bottom': '20px','margin-right':'20px'}">
            <v-tabs
              v-model="tab"
              :disabled="editorTrip!==null"
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
            <LinksSidePanel
              v-show="tab==='pt'"
              @confirmChanges="(e) => $emit('confirmChanges',e)"
              @abortChanges="(e) => $emit('abortChanges',e)"
              @cloneButton="(e) => $emit('cloneButton',e)"
              @deleteButton="(e) => $emit('deleteButton',e)"
              @propertiesButton="(e) => $emit('propertiesButton',e)"
            />
            <RoadSidePanel
              v-show="tab==='road'"
              @deleteButton="(e) => $emit('deleteButton',e)"
              @propertiesButton="(e) => $emit('propertiesButton',e)"
            />
            <ODSidePanel
              v-show="tab==='od'"
              @deleteButton="(e) => $emit('deleteButton',e)"
              @propertiesButton="(e) => $emit('propertiesButton',e)"
            />
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
  position: absolute;
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
  position: absolute;
  right: 0;
  top: 0;
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
