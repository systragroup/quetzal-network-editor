<script>
import LinksSidePanel from './LinksSidePanel.vue'
import RoadSidePanel from './RoadSidePanel.vue'
export default {
  name: 'SidePanel',
  components: {
    LinksSidePanel,
    RoadSidePanel,
  },
  props: ['selectedTrips', 'selectedrGroup'],
  events: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'cloneButton', 'deleteButton', 'propertiesButton', 'newLine', 'isRoadMode'],

  data () {
    return {
      showLeftPanelContent: true,
      tab: 0,
      roadMode: false,
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
      if (val === 1) {
        this.roadMode = true
      } else {
        this.roadMode = false
      }
      this.$emit('isRoadMode', this.roadMode)
    },
  },
  created () {
    if (this.$store.getters.links.features.length === 0 && !this.$store.getters.projectIsEmpty) {
      this.tab = 1
    }
  },

}
</script>
<template>
  <section
    :class="showLeftPanel ? 'left-panel elevation-4' : 'left-panel-close'"
    :style="{'width': showLeftPanel ? '400px' : '0px'}"
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
              <v-tab>{{ $gettext("PT Links") }}</v-tab>
              <v-tab>{{ $gettext("Road Links") }}</v-tab>
            </v-tabs>
            <LinksSidePanel
              v-show="!roadMode"
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
              v-show="roadMode"
              :height="windowHeight"
              :selectedr-goup="selectedrGroup"
              @update-tripList="(e) => $emit('update-tripList',{type: 'rlinks', data: e})"
              @confirmChanges="(e) => $emit('confirmChanges',e)"
              @abortChanges="(e) => $emit('abortChanges',e)"
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
transition:0.3s
}
.left-panel-content {
  display:inline-block;
  width : 100%;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  //resize: horizontal;
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
