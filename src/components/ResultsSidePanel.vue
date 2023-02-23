<script>

export default {
  name: 'SidePanel',
  components: {

  },
  model: {
    prop: 'selectedGroup',
    event: 'update-selectedGroup',
  },
  props: ['selectedGroup', 'filterChoices', 'filteredCat'],
  events: ['update-selectedGroup'],

  data () {
    return {
      showLeftPanelContent: true,
      height: null,
      editorTrip: false,
      showDialog: false,
      selectedCat: [],
      selectedFilter: '',
    }
  },
  computed: {
    showLeftPanel () { return this.$store.getters.showLeftPanel },
    windowHeight () { return this.$store.getters.windowHeight - 130 },

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
      this.$emit('update-selectedGroup', { selectedCategory: val, selectedFilter: this.selectedFilter })
    },
    selectedFilter (newVal, oldVal) {
      if (oldVal) { // when created, we dont want to emit
        this.$emit('update-selectedGroup', { selectedCategory: [], selectedFilter: newVal })
      }
    },
  },

  created () {
    this.selectedCat = this.selectedGroup.selectedCategory
    this.selectedFilter = this.selectedGroup.selectedFilter
    this.selectedCat = this.filteredCat
  },

  methods: {

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
    :style="{'width': showLeftPanel ? '300px' : '0px'}"
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
                    icon
                    class="ma-2"
                    color="white"
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
              {{ $gettext("Roads") }}
              <v-spacer />

              <v-spacer />
            </v-card-title>
            <v-card
              max-width="100%"
              min-width="100%"
              :height="windowHeight"
              class="mx-auto scrollable"
            >
              <v-list-item>
                <v-select
                  v-model="selectedFilter"
                  :items="filterChoices"
                  prepend-icon="fas fa-filter"
                  label="filter"
                  item-color="secondary"
                  color="secondary"
                />
              </v-list-item>

              <v-virtual-scroll
                :items="filteredCat"
                :item-height="45"
                :height="windowHeight-80"
              >
                <template v-slot="{ item }">
                  <v-list-item
                    :key="selectedFilter.concat(item)"
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
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>
<style lang="scss" scoped>
@import "src/scss/variables.scss";
.left-panel {
  height: 100%;
  background-color: $primary-dark;
  transition: 0.3s;
  position: absolute;
  display: flex;
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
  background-color: $primary-dark;
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
