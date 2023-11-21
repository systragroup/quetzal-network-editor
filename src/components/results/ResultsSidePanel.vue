<script>

export default {
  name: 'SidePanel',
  components: {

  },

  props: ['selectedCategory', 'selectedFilter', 'filterChoices', 'filteredCat', 'layerChoices', 'selectedLayer', 'presetChoices', 'selectedPreset'],
  events: ['update-selectedCategory', 'select-layer', 'update-selected-filter', 'select-preset', 'delete-preset'],

  data () {
    return {
      showLeftPanelContent: true,
      openMenu: false,
      presetsMenu: false,
      selectedCat: [],
      vmodelSelectedFilter: '',
    }
  },

  computed: {
    showLeftPanel () { return this.$store.getters.showLeftPanel },
    windowHeight () { return this.$store.getters.windowHeight - 130 },
    running () { return this.$store.getters['run/running'] },
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

    selectedCategory (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.selectedCat = newVal
      }
    },
    selectedFilter (val) {
      // when we change seledted filter from other component (changing layer.)
      if (val !== this.vmodelSelectedFilter) {
        this.vmodelSelectedFilter = val
        // this.selectedCat = this.selectedCategory
      }
    },

    selectedCat (val) {
      if (val !== this.selectedCategory) {
        this.$emit('update-selectedCategory', val)
      }
    },

    vmodelSelectedFilter (newVal, oldVal) {
      if ((newVal !== this.selectedFilter)) { // when created, we dont want to emit
        this.$emit('update-selectedFilter', newVal)
        this.selectedCat = this.selectedCategory // show all. when we change layer
      }
    },
  },

  created () {
    this.vmodelSelectedFilter = this.selectedFilter
    this.selectedCat = this.selectedCategory
    // this is necessary to show the initial layer on the map.
    this.$emit('update-selectedFilter', this.selectedFilter)
    this.$emit('update-selectedCategory', this.selectedCategory)
  },

  methods: {
    init (payload) {
      this.selectedCat = payload.selectedCategory
    },
    showAll () {
      if (this.selectedCat.length === this.filteredCat.length) {
        this.selectedCat = []
      } else {
        this.selectedCat = this.filteredCat
      }
    },
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
      @click="$store.commit('changeLeftPanel')"
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
              <v-tooltip
                location="bottom"
                open-delay="500"
              >
                <template v-slot:activator="{ props }">
                  <v-icon
                    :style="{color: 'white', 'padding-right':'2rem'}"
                    v-bind="props"
                  >
                    fas fa-sliders-h
                  </v-icon>
                </template>
                <span>{{ $gettext("Presets") }}</span>
              </v-tooltip>

              <v-menu
                v-model="presetsMenu"
                close-delay="100"
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ props }">
                  <span
                    class="custom-title crop"
                    v-bind="props"
                  >{{ selectedPreset || $gettext("Presets") }}</span>
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
              <v-btn
                variant="text"
                :style="{color: 'white'}"
                :icon="presetsMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down'"
                @click="presetsMenu=!presetsMenu"
              />
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
                    :icon=" selectedCat.length > 0 ? 'fa-eye fa' : 'fa-eye-slash fa'"
                    variant="text"
                    v-bind="props"
                    @click="showAll()"
                  />
                </template>
                <span>{{ selectedCat.length > 0 ? $gettext("Hide All"): $gettext("Show All") }}</span>
              </v-tooltip>

              <v-menu
                v-model="openMenu"
                close-delay="100"
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ props }">
                  <span
                    class="custom-title crop"

                    v-bind="props"
                  >{{ selectedLayer }}</span>
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

              <v-btn
                :style="{color: 'white'}"
                variant="text"
                :icon="openMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down'"
                @click="openMenu=!openMenu"
              />
            </div>
            <v-card
              max-width="100%"
              min-width="100%"
              :height="windowHeight"
              class="mx-auto "
            >
              <v-list-item>
                <v-select
                  v-model="vmodelSelectedFilter"
                  :items="filterChoices"
                  prepend-icon="fas fa-filter"
                  :label="$gettext('filter')"
                  item-props.color="secondarydark"
                  color="secondarydark"
                />
              </v-list-item>

              <v-virtual-scroll
                :items="filteredCat"
                :item-height="45"
                :height="windowHeight-80"
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
.custom-title  {
  color:white;
  font-size: x-large;
}
.crop {
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
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
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
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
