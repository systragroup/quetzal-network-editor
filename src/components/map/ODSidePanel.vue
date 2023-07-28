<script>

export default {
  name: 'RoadSidePanel',
  components: {
  },
  props: ['height'], // height is here to resize with the windows...
  events: ['deleteButton', 'propertiesButton', 'newLine'],

  data () {
    return {
      // for some reason, the v-model does not update when i force it in a watcher or a method.
      // I this vmodelselectedFilter for displaying the correct selected filter in the filter selector.
      vmodelSelectedFilter: '',
      vmodelSelectedCat: [],
    }
  },
  computed: {
    layer () { return this.$store.getters['od/layer'] },
    filterChoices () { return this.$store.getters['od/layerAttributes'] },
    selectedFilter () { return this.$store.getters['od/selectedFilter'] },
    selectedCat () { return this.$store.getters['od/selectedCategory'] },
    filteredCat () { return this.$store.getters['od/filteredCategory'] },
  },

  watch: {
    vmodelSelectedCat (val) {
      this.$store.commit('od/changeSelectedCategory', val)
    },
    vmodelSelectedFilter (val) {
      this.$store.commit('od/changeSelectedFilter', val)
      this.vmodelSelectedCat = [] // reset.
    },

  },
  mounted () {
    this.vmodelSelectedCat = this.selectedCat
    this.vmodelSelectedFilter = this.selectedFilter
  },

  methods: {

    propertiesButton (value) {
      // select the TripId and open dialog
      this.$emit('propertiesButton', {
        action: 'Edit OD Group Info',
        lingering: false,
        category: this.vmodelSelectedFilter,
        group: value,
      })
    },
    editVisible () {
      this.$emit('propertiesButton', {
        action: 'Edit Visible OD Info',
        lingering: false,
      })
    },

    deleteButton (obj) {
      // obj contain trip and message.
      this.$emit('deleteButton', obj)
    },
    showAll () {
      if (this.vmodelSelectedCat.length === this.filteredCat.length) {
        this.vmodelSelectedCat = []
      } else {
        this.vmodelSelectedCat = this.filteredCat
      }
    },
    showGroup (val) {
      this.tripList = Array.from(new Set([...this.tripList, ...val]))
    },

    createNewOD () { console.log('todo') },

  },

}
</script>
<template>
  <section>
    <v-card-title class="white--text secondary">
      <v-tooltip
        bottom
        open-delay="500"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            class="ma-2"
            :style="{color: 'white'}"
            v-bind="attrs"
            v-on="on"
            @click="showAll()"
          >
            <v-icon class="list-item-icon">
              {{ vmodelSelectedCat.length > 0 ? 'fa-eye fa' : 'fa-eye-slash fa' }}
            </v-icon>
          </v-btn>
        </template>
        <span>{{ vmodelSelectedCat.length > 0 ? $gettext("Hide All"): $gettext("Show All") }}</span>
      </v-tooltip>
      <v-tooltip
        bottom
        open-delay="500"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            class="ma-2"
            :style="{color: 'white'}"
            :disabled="vmodelSelectedCat.length === 0? true: false"
            v-bind="attrs"
            v-on="on"
            @click="editVisible()"
          >
            <v-icon class="list-item-icon">
              fas fa-list
            </v-icon>
          </v-btn>
        </template>
        <span>{{ $gettext("Edit Visibles Properties") }}</span>
      </v-tooltip>

      <v-spacer />
      <span :style="{color: 'white'}">
        {{ $gettext("OD") }}
      </span>

      <v-spacer />

      <v-spacer />
      <v-menu
        offset-y
        open-on-hover
        close-delay="100"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ on: on,attrs:attrs }">
          <v-btn
            icon
            class="ma-2"
            :style="{color: 'white'}"
            dark
            v-bind="attrs"
            v-on="on"
          >
            <v-icon>fa-solid fa-download</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            link
            @click="$store.dispatch('exportFiles','all')"
          >
            <v-list-item-title>
              {{ $gettext("Export All") }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="$store.dispatch('exportFiles','visible')"
          >
            <v-list-item-title>
              {{ $gettext("Export Only Visible") }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>
    <v-card
      max-width="100%"
      min-width="100%"
      :height="height"
      class="mx-auto scrollable"
    >
      <v-list-item>
        <v-select
          v-model="vmodelSelectedFilter"
          :items="filterChoices"
          prepend-icon="fas fa-filter"
          :label="$gettext('filter')"
          item-color="secondarydark"
          color="secondarydark"
        />
      </v-list-item>

      <v-virtual-scroll
        :items="filteredCat"
        :item-height="45"
        :height="height-71"
      >
        <template v-slot="{ item }">
          <v-list-item
            :key="vmodelSelectedFilter.concat(item)"
            class="pl-2"
          >
            <v-list-item-action>
              <v-checkbox
                v-model="vmodelSelectedCat"
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

            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  class="ma-1"
                  v-bind="attrs"
                  :disabled="false"
                  v-on="on"
                  @click="propertiesButton(item)"
                >
                  <v-icon :color="'regular' ">
                    fas fa-list
                  </v-icon>
                </v-btn>
              </template>
              <span>{{ $gettext("Edit Line Properties") }}</span>
            </v-tooltip>

            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  class="ma-1"
                  v-bind="attrs"
                  :disabled="false"
                  v-on="on"
                  @click="deleteButton({trip:item,group:selectedFilter,message:item,action:'deleteODGroup'})"
                >
                  <v-icon
                    small
                    color="regular"
                  >
                    fas fa-trash
                  </v-icon>
                </v-btn>
              </template>
              <span>{{ $gettext("Delete Line") }}</span>
            </v-tooltip>
          </v-list-item>
        </template>
      </v-virtual-scroll>

      <v-divider />
    </v-card>
    <v-card class="mx-auto">
      <v-list-item>
        <v-spacer />

        <v-tooltip
          bottom
          open-delay="500"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              color="primary"
              class="text--primary"
              fab
              small
              v-on="on"
              @click="createNewOD"
            >
              <v-icon>fas fa-plus</v-icon>
            </v-btn>
          </template>
          <span>{{ $gettext("Create new OD") }}</span>
        </v-tooltip>
      </v-list-item>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>
.left-panel {
  height: 100%;
  background-color: $primary-dark;
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
