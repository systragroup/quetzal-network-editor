<script>
import LinksSidePanel from './LinksSidePanel.vue'
import RoadSidePanel from './RoadSidePanel.vue'
import ODSidePanel from './ODSidePanel.vue'
export default {
  name: 'SidePanel',
  components: {
    LinksSidePanel,
    RoadSidePanel,
    ODSidePanel,
  },
  props: ['selectedTrips', 'selectedrGroup'],
  events: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'cloneButton', 'deleteButton', 'propertiesButton', 'change-mode'],

  data () {
    return {
      showLeftPanelContent: true,
      tab: 0,
      mode: 'pt',
      isResizing: false,
      windowOffest: 0,
      width: 400, // Initial width of the resizable section
    }
  },
  computed: {
    showLeftPanel () { return this.$store.getters.showLeftPanel },
    windowHeight () { return this.$store.getters.windowHeight - 200 },
  },

  watch: {
    showLeftPanel (val) {
      if (val) {
        // Leave time for animation to end (.fade-enter-active css rule)
        setTimeout(() => {
          this.showLeftPanelContent = true
        }, 500)
      } else {
        this.showLeftPanelContent = false
      }
    },

    tab (val) {
      if (val === 0) {
        this.mode = 'pt'
      } else if (val === 1) {
        this.mode = 'road'
      } else {
        this.mode = 'od'
      }
      this.$emit('change-mode', this.mode)
    },
  },
  created () {
    if (this.$store.getters.links.features.length === 0 && !this.$store.getters.projectIsEmpty) {
      this.tab = 1
    }
  },
  methods: {
    startResize (event) {
      event.preventDefault()
      this.isResizing = true
      this.windowOffest = event.clientX - this.$refs.leftPanelDiv.clientWidth
      document.addEventListener('mousemove', this.resize)
      document.addEventListener('mouseup', this.stopResize)
    },
    resize (event) {
      if (this.isResizing) {
        const width = event.clientX - this.windowOffest
        this.width = width > 400 ? width : 400
        // event.target.style.cursor = 'col-resize'
      }
    },
    stopResize (event) {
      this.isResizing = false
      document.removeEventListener('mousemove', this.resize)
      document.removeEventListener('mouseup', this.stopResize)
      // event.target.style.cursor = 'default'
    },
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
      @click="$store.commit('changeLeftPanel')"
    >
      <v-icon
        small
        color="secondary"
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
              background-color="secondary"
              dark
              grow
            >
              <v-tab>{{ $gettext("PT") }}</v-tab>
              <v-tab>{{ $gettext("Road") }}</v-tab>
              <v-tab>{{ $gettext("OD") }}</v-tab>
            </v-tabs>
            <LinksSidePanel
              v-show="tab===0"
              :height="windowHeight"
              :selected-trips="selectedTrips"
              @update-tripList="(e) => $emit('update-tripList', {type: 'links', data: e})"
              @confirmChanges="(e) => $emit('confirmChanges',e)"
              @abortChanges="(e) => $emit('abortChanges',e)"
              @cloneButton="(e) => $emit('cloneButton',e)"
              @deleteButton="(e) => $emit('deleteButton',e)"
              @propertiesButton="(e) => $emit('propertiesButton',e)"
            />
            <RoadSidePanel
              v-show="tab===1"
              :height="windowHeight"
              :selectedr-goup="selectedrGroup"
              @update-tripList="(e) => $emit('update-tripList',{type: 'rlinks', data: e})"
              @deleteButton="(e) => $emit('deleteButton',e)"
              @propertiesButton="(e) => $emit('propertiesButton',e)"
            />
            <ODSidePanel
              v-show="tab===2"
              :height="windowHeight"
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
  background-color:var(--v-primarydark-base);
  transition: 0.3s;
  position: absolute;
  display:flex;
  z-index: 20;
}
.left-panel-close {
transition:0.3s;
width:0px;
}
.left-panel .resizable-handle {
  width: 5px;
  height: 100%;
  background-color: var(--v-background-lighten2);
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
.v-list__tile {
  padding: 0
}
.left-panel-toggle-btn {
  left: 100%;
  width: 25px;
  z-index: 1;
  background-color: var(--v-primarydark-base);
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
