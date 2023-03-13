<script>

export default {
  name: 'SidePanel',
  components: {

  },
  model: {
    prop: 'selectedCategory',
    event: 'update-selectedCategory',
  },
  props: ['selectedCategory', 'selectedFilter', 'filterChoices', 'filteredCat', 'layerChoices', 'selectedLayer'],
  events: ['update-selectedCategory', 'select-layer', 'update-selected-filter'],

  data () {
    return {
      showLeftPanelContent: true,
      height: null,
      editorTrip: false,
      showDialog: false,
      openMenu: false,
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
    selectedCat (val) {
      this.$emit('update-selectedCategory', val)
    },
    selectedFilter (val) {
      // when we change seledted filter from other component (changing layer.)
      if (val !== this.vmodelSelectedFilter) {
        this.vmodelSelectedFilter = val
        this.selectedCat = this.selectedCategory
      }
    },

    vmodelSelectedFilter (newVal, oldVal) {
      if (oldVal) { // when created, we dont want to emit
        this.$emit('update-selectedFilter', newVal)
        this.selectedCat = this.selectedCategory // show all. when we change layer
      }
    },
  },

  created () {
    this.selectedCat = this.selectedCategory
    this.vmodelSelectedFilter = this.selectedFilter
  },

  methods: {
    showAll () {
      if (this.selectedCat.length === this.filteredCat.length) {
        this.selectedCat = []
      } else {
        this.selectedCat = this.filteredCat
      }
    },
    run () {
      this.$store.dispatch('run/startExecution')
    },
  },
}
</script>
<template>
  <section
    :class="showLeftPanel ? 'left-panel elevation-4' : 'left-panel-close'"
    :style="{'width': showLeftPanel ? '300px' : '0px'}"
  >
    <div
      class="left-panel-toggle-btn elevation-4"
      @click="$store.commit('changeLeftPanel')"
    >
      <v-icon
        small
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
            <v-card-title class="white--text secondary">
              <v-tooltip
                bottom
                open-delay="500"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-btn
                    :style="{color: 'white'}"
                    icon
                    class="ma-2"
                    v-bind="attrs"
                    v-on="on"
                    @click="showAll()"
                  >
                    <v-icon class="list-item-icon">
                      {{ selectedCat.length > 0 ? 'fa-eye fa' : 'fa-eye-slash fa' }}
                    </v-icon>
                  </v-btn>
                </template>
                <span>{{ selectedCat.length > 0 ? $gettext("Hide All"): $gettext("Show All") }}</span>
              </v-tooltip>

              <v-spacer />
              <v-menu
                v-model="openMenu"
                close-delay="100"
                offset-y
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ on, attrs }">
                  <span
                    class="title"
                    v-bind="attrs"
                    v-on="on"
                  >{{ selectedLayer }}</span>
                </template>
                <v-list>
                  <v-list-item
                    v-for="(layer,key) in layerChoices"
                    :key="key"
                    link
                  >
                    <v-list-item-title
                      @click="()=>$emit('select-layer',layer)"
                    >
                      {{ layer }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
              <v-spacer />

              <v-btn
                :style="{color: 'white'}"
                icon
                class="ma-2"
                dark
                @click="openMenu=!openMenu"
              >
                <v-icon> {{ openMenu ? 'fas fa-chevron-left' : 'fas fa-chevron-down' }}</v-icon>
              </v-btn>
            </v-card-title>
            <v-card
              max-width="100%"
              min-width="100%"
              :height="windowHeight"
              class="mx-auto scrollable"
            >
              <v-list-item>
                <v-select
                  v-model="vmodelSelectedFilter"
                  :items="filterChoices"
                  prepend-icon="fas fa-filter"
                  label="filter"
                  item-color="secondarydark"
                  color="secondarydark"
                />
              </v-list-item>

              <v-virtual-scroll
                :items="filteredCat"
                :item-height="45"
                :height="windowHeight-80"
              >
                <template v-slot="{ item }">
                  <v-list-item
                    :key="vmodelSelectedFilter.concat(item)"
                    class="pl-2"
                  >
                    <v-list-item-action>
                      <v-checkbox
                        v-model="selectedCat"
                        class="pl-2"
                        :on-icon="'fa-eye fa'"
                        :off-icon="'fa-eye-slash fa'"
                        :color="'primary'"
                        :value="item"
                        size="10"
                        hide-details
                      />
                    </v-list-item-action>

                    <v-list-item-title>
                      {{ item }}
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-virtual-scroll>
            </v-card>
            <!--
          </div>
          <v-btn
            :loading="running"
            :disabled="running"
            @click="run()"
          >
            TEST API
          </v-btn>
        </div>
        -->
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>
<style lang="scss" scoped>
.left-panel {
  height: 100%;
  background-color: var(--v-primarydark-base);
  transition: 0.3s;
  position: absolute;
  display: flex;
  z-index: 20;
}
.title  {
  color:white;
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
