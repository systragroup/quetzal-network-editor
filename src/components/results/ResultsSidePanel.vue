<script>
import { useIndexStore } from '@src/store/index'
import { computed, ref, watch, toRefs, onMounted } from 'vue'

export default {
  name: 'SidePanel',
  components: {

  },

  props: ['selectedCategory', 'selectedFilter', 'filterChoices', 'filteredCat', 'layerChoices', 'selectedLayer', 'presetChoices', 'selectedPreset'],
  emits: ['update-selectedCategory', 'select-layer', 'select-preset', 'delete-preset', 'update-selectedFilter'],
  setup (props, context) {
    const store = useIndexStore()
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
    const openMenu = ref(false)
    const presetsMenu = ref(false)

    const { selectedCategory, filteredCat } = toRefs(props)
    const selectedCat = ref([])
    watch(selectedCategory, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        selectedCat.value = newVal
      }
    })
    watch(selectedCat, (val) => {
      if (val !== selectedCategory.value) {
        context.emit('update-selectedCategory', val)
      }
    })
    function init (payload) {
      selectedCat.value = payload.selectedCategory
    }
    function showAll () {
      if (selectedCat.value.length === filteredCat.value.length) {
        selectedCat.value = []
      } else {
        selectedCat.value = filteredCat.value
      }
    }

    const { selectedFilter } = toRefs(props)
    const vmodelSelectedFilter = ref('')
    watch(selectedFilter, (val) => {
      // when we change seledted filter from other component (changing layer.)
      if (val !== vmodelSelectedFilter.value) {
        vmodelSelectedFilter.value = val
        // this.selectedCat = this.selectedCategory
      }
    })
    watch(vmodelSelectedFilter, (val) => {
      if ((val !== selectedFilter.value)) { // when created, we dont want to emit
        context.emit('update-selectedFilter', val)
        selectedCat.value = selectedCategory.value // show all. when we change layer
      }
    })

    onMounted(() => {
      vmodelSelectedFilter.value = selectedFilter.value
      selectedCat.value = selectedCategory.value
      // this is necessary to show the initial layer on the map.
      context.emit('update-selectedFilter', selectedFilter.value)
      context.emit('update-selectedCategory', selectedCategory.value)
    })

    return {
      store,
      showLeftPanel,
      showLeftPanelContent,
      openMenu,
      presetsMenu,
      selectedCat,
      vmodelSelectedFilter,
      init,
      showAll,
    }
  },

}
</script>
<template>
  <section
    :class="showLeftPanel ? 'left-panel elevation-4' : 'left-panel-close'"
    :style="{'width': showLeftPanel ? '350px' : '0px'}"
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
    <transition name="fade">
      <div
        v-show="showLeftPanelContent"
        class="left-panel-content"
      >
        <div>
          <div :style="{'margin-top': '20px','margin-bottom': '20px','margin-right':'20px'}">
            <div class="preset">
              <v-icon
                :style="{color: 'white', 'padding-right':'2rem','padding-left':'1rem'}"
              >
                fas fa-sliders-h
              </v-icon>
              <v-menu
                v-model="presetsMenu"
                close-delay="100"
                location="bottom center"

                transition="slide-y-transition"
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="menu-container"
                    v-bind="props"
                  >
                    <div
                      class="title-div"
                    >
                      <span class="custom-title">
                        {{ $gettext("Presets") }}
                      </span>
                      <span class="crop">
                        {{ selectedPreset }}
                      </span>
                    </div>
                    <v-icon
                      variant="text"
                      :style="{color: 'white'}"
                    >
                      {{ presetsMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down' }}
                    </v-icon>
                  </div>
                </template>
                <v-list>
                  <v-list-item
                    v-for="(preset,key) in presetChoices"
                    :key="key"
                    link
                    @click="()=>$emit('select-preset', preset)"
                  >
                    <v-list-item-title>
                      {{ preset.name }}
                    </v-list-item-title>
                    <template v-slot:append>
                      <v-btn
                        variant="text"
                        icon="fas fa-trash"
                        size="small"
                        color="grey"
                        class="ml-10"
                        @click.stop="()=>$emit('delete-preset', preset)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
              <v-tooltip
                location="bottom"
                open-delay="300"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    variant="text"
                    v-bind="props"
                    :disabled="presetChoices.length===0"
                    :style="{color: 'white'}"
                    icon="fas fa-download"
                    @click="store.exportFile('styles.json')"
                  />
                </template>
                <span>{{ $gettext("Dowload presets") }}</span>
              </v-tooltip>
            </div>
            <div class="layer">
              <v-tooltip
                location="bottom"
                open-delay="500"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    :style="{color: 'white', flex:0, 'padding-left':'1.1rem','padding-right':'1.5rem'}"
                    class="eye-button"
                    :icon=" selectedCat.length == filteredCat.length ? 'fa-eye-slash fa' : 'fa-eye fa'"
                    variant="text"
                    v-bind="props"
                    @click="showAll()"
                  />
                </template>
                <span>{{ selectedCat.length == filteredCat.length ? $gettext("Hide All"): $gettext("Show All") }}</span>
              </v-tooltip>

              <v-menu
                v-model="openMenu"
                close-delay="100"
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="title-div"
                    v-bind="props"
                  >
                    <div
                      class="menu-container"
                      v-bind="props"
                    >
                      <div
                        class="title-div"
                      >
                        <span class="custom-title">
                          {{ $gettext("Layer") }}
                        </span>
                        <span class="crop">
                          {{ selectedLayer }}
                        </span>
                      </div>
                      <v-icon
                        variant="text"
                        :style="{color: 'white'}"
                      >
                        {{ openMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down' }}
                      </v-icon>
                    </div>
                  </div>
                </template>
                <v-list>
                  <v-list-item
                    v-for="(layer,key) in layerChoices"
                    :key="key"
                    link
                    @click="()=>$emit('select-layer',layer)"
                  >
                    <v-list-item-title>
                      {{ layer }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
              <v-icon />
            </div>
            <v-card
              max-width="100%"
              min-width="100%"
              :height="'calc(100vh - 250px)'"
              class="mx-auto scrollable"
            >
              <v-list-item>
                <div :style="{'padding-top': '0.5rem'}">
                  <v-select
                    v-model="vmodelSelectedFilter"
                    :items="filterChoices.sort()"
                    prepend-inner-icon="fas fa-filter"
                    :label="$gettext('filter')"
                    variant="outlined"
                    hide-details
                    density="compact"
                    color="secondarydark"
                  />
                </div>
              </v-list-item>

              <v-virtual-scroll
                :items="filteredCat"
                :item-height="45"
                :height="'calc(100vh - 330px)'"
              >
                <template v-slot="{ item }">
                  <div
                    :key="vmodelSelectedFilter.concat(item)"
                    class="container"
                  >
                    <v-list-item-action>
                      <v-checkbox-btn
                        v-model="selectedCat"
                        class="ma-2 pl-2"
                        :true-icon="'fa-eye fa'"
                        :false-icon="'fa-eye-slash fa'"
                        :color="'primary'"
                        :value="item"
                      />
                    </v-list-item-action>

                    <div class="item">
                      {{ item }}
                    </div>
                  </div>
                </template>
              </v-virtual-scroll>
            </v-card>
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
  display: flex;
  z-index: 20;
}
.container{
  display:flex;
  justify-content:flex-end;
  align-items: center;
}
.item{
  flex:1;
}
.menu-container{
  display: flex;
  cursor:pointer;
  gap:0.5rem;
  align-items: center;
}
.title-div {
  color:white;
  max-width: 12rem;
  display:flex;
  justify-content: center;
  flex-direction: column;
}
.custom-title {
  text-align: center;
  font-size: x-large;

}
.crop {
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
  cursor:pointer;
  font-size:0.875rem;
  opacity:var(--v-medium-emphasis-opacity);

}
.preset {
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  border-bottom: solid rgb(var(--v-theme-primarydark));
  background-color: rgb(var(--v-theme-secondary));
  display:flex;
  align-items: center;
  justify-content: space-between;
}
.layer {
  padding: 0.5rem;
  background-color: rgb(var(--v-theme-secondary));
  display:flex;
  align-items: center;
  justify-content: space-between;
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
  overflow: auto;
}
.v-list__tile {
  padding: 0
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
