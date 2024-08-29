<script>
import { useIndexStore } from '@src/store/index'
import { useODStore } from '@src/store/od'
import { computed } from 'vue'

export default {
  name: 'ODSidePanel',
  components: {
  },
  emits: ['deleteButton', 'propertiesButton'],
  setup () {
    const store = useIndexStore()
    const odStore = useODStore()
    const layer = computed(() => { return odStore.layer })
    const filterChoices = computed(() => { return odStore.layerAttributes })
    const selectedFilter = computed(() => { return odStore.selectedFilter })
    const selectedCat = computed(() => { return odStore.selectedCategory })
    const filteredCat = computed(() => { return odStore.filteredCategory })

    return {
      store,
      odStore,
      layer,
      filterChoices,
      selectedFilter,
      selectedCat,
      filteredCat,
    }
  },
  data () {
    return {
      // for some reason, the v-model does not update when i force it in a watcher or a method.
      // I this vmodelselectedFilter for displaying the correct selected filter in the filter selector.
      vmodelSelectedFilter: 'cycleway',
      vmodelSelectedCat: [],
    }
  },

  watch: {
    vmodelSelectedCat (val) {
      this.odStore.changeSelectedCategory(val)
    },
    vmodelSelectedFilter (val) {
      this.odStore.changeSelectedFilter(val)
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

  },

}
</script>
<template>
  <section>
    <div class="text-white bg-secondary header">
      <v-tooltip
        location="bottom"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            :icon="vmodelSelectedCat.length ===filteredCat.length ? 'fa-eye fa' : 'fa-eye-slash fa' "
            class="ma-2"
            :style="{color: 'white'}"

            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ vmodelSelectedCat.length === filteredCat.length ? $gettext("Hide All"): $gettext("Show All") }}</span>
      </v-tooltip>
      <v-tooltip
        location="bottom"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            icon="fas fa-list"
            class="ma-2"
            :style="{color: 'white'}"
            :disabled="vmodelSelectedCat.length === 0? true: false"

            v-bind="props"
            @click="editVisible()"
          />
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
        open-on-hover
        close-delay="100"
        transition="slide-y-transition"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            icon="fa-solid fa-download"
            class="ma-2"
            :style="{color: 'white'}"

            v-bind="props"
          />
        </template>
        <v-list>
          <v-list-item
            link
            @click="store.exportFiles('all')"
          >
            <v-list-item-title>
              {{ $gettext("Export All") }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="store.exportFiles('visibles')"
          >
            <v-list-item-title>
              {{ $gettext("Export Only Visible") }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <v-card
      max-width="100%"
      min-width="100%"
      :style="{'height':'calc(100vh - 250px)'}"
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
        :height="'calc(100vh - 250px - 88px)'"
      >
        <template v-slot="{ item }">
          <div
            :key="vmodelSelectedFilter.concat(item)"
            class="container"
          >
            <v-checkbox-btn
              v-model="vmodelSelectedCat"
              class="ma-2 pl-2"
              :true-icon="'fa-eye fa'"
              :false-icon="'fa-eye-slash fa'"
              :color="'primary'"
              :value="item"
            />

            <v-tooltip
              location="right"
              open-delay="300"
              content-class="custom-tooltip"
            >
              <template v-slot:activator="{ props }">
                <div
                  class="item ma-2"
                  v-bind="props"
                >
                  {{ item }}
                </div>
              </template>
              <span>{{ item }}</span>
            </v-tooltip>

            <v-tooltip
              location="bottom"
              open-delay="500"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  icon=" fas fa-list"
                  class="ma-1"
                  color="regular"
                  :disabled="false"
                  v-bind="props"
                  @click="propertiesButton(item)"
                />
              </template>
              <span>{{ $gettext("Edit Line Properties") }}</span>
            </v-tooltip>

            <v-tooltip
              location="bottom"
              open-delay="500"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  icon=" fas fa-trash"
                  class="ma-1"
                  size="small"
                  color="regular"

                  :disabled="false"
                  v-bind="props"
                  @click="deleteButton({trip:item,group:selectedFilter,message:item,action:'deleteODGroup'})"
                />
              </template>
              <span>{{ $gettext("Delete Line") }}</span>
            </v-tooltip>
          </div>
        </template>
      </v-virtual-scroll>

      <v-divider />
    </v-card>
    <v-card class="mx-auto">
      <v-list-item>
        <v-spacer />
      </v-list-item>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>

.header{
  display:flex;
  align-items: center;
  font-size: x-large;
}
.container{
  display:flex;
  justify-content:flex-end;
  align-items: center;
}.item{
  flex:3;
  padding-left: 1rem;
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
}
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
  height: calc(100vh - 250px);
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
