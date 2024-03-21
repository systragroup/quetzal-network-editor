<script>
import { toRaw, ref, onMounted, computed, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'

export default {
  name: 'RoadSidePanel',
  components: {
  },
  emits: ['deleteButton', 'propertiesButton', 'update-tripList'],
  setup () {
    const store = useIndexStore()
    const rlinksStore = userLinksStore()
    const linksStore = useLinksStore()
    const selectedrGoup = computed(() => { return rlinksStore.selectedrGroup })
    const localSelectedTrip = ref([])

    onMounted(() => { localSelectedTrip.value = cloneDeep(selectedrGoup.value) })
    watch(localSelectedTrip, (newVal, oldVal) => {
      let changes = ''
      let method = 'add'
      if (JSON.stringify(newVal) === JSON.stringify(filteredCat.value)) {
        changes = newVal
        method = 'showAll'
      } else if (newVal.length === 0) {
        changes = []
        method = 'hideAll'
      } else if (newVal.length < oldVal.length) {
        // if a tripis unchecked. we remove it
        changes = oldVal.filter(item => !newVal.includes(item))
        method = 'remove'
      } else if (newVal.length > oldVal.length) {
        // if a trip is added, we add it!
        changes = newVal.filter(item => !oldVal.includes(item))
        method = 'add'
      }
      if (changes !== '') {
        rlinksStore.changeVisibleRoads({ category: vmodelSelectedFilter.value, data: changes, method })
      }
    })
    watch(selectedrGoup, (newVal) => {
      // check selected group in store. if it changes from another component
      const a = new Set(newVal)
      const b = new Set(localSelectedTrip.value)
      if (!(a.size === b.size && new Set([...a, ...b]).size === a.size)) {
        localSelectedTrip.value = toRaw(newVal)
      }
    })
    const selectedFilter = ref('')
    const vmodelSelectedFilter = ref('')
    const filterChoices = computed(() => { return rlinksStore.rlineAttributes })
    const filteredCat = computed(() => { return rlinksStore.filteredrCategory })
    return {
      store,
      rlinksStore,
      selectedrGoup,
      localSelectedTrip,
      selectedFilter,
      vmodelSelectedFilter,
      linksStore,
      filterChoices,
      filteredCat,
    }
  },

  watch: {

    vmodelSelectedFilter (newVal, oldVal) {
      this.selectedFilter = newVal
      // only reset if we change the filter.
      this.rlinksStore.changeSelectedrFilter(this.selectedFilter)
      // when the component is loaded, oldVal is null and we dont want to overwrite localSelectedTrip to [].
      if (oldVal) {
        this.localSelectedTrip = []
      }
    },

  },
  mounted () {
    this.selectedFilter = this.rlinksStore.selectedrFilter
    this.vmodelSelectedFilter = this.selectedFilter
    this.rlinksStore.changeSelectedrFilter(this.selectedFilter)

    if (this.linksStore.links.features.length === 0
      && !this.store.projectIsEmpty
      && this.selectedrGoup.length === 0) {
      this.showAll()
    }
  },

  methods: {

    propertiesButton (value) {
      // select the TripId and open dialog
      this.$emit('propertiesButton', {
        action: 'Edit Road Group Info',
        lingering: false,
        category: this.vmodelSelectedFilter,
        group: value,
      })
    },
    editVisible () {
      this.$emit('propertiesButton', {
        action: 'Edit Visible Road Info',
        lingering: false,
      })
    },

    deleteButton (obj) {
      // obj contain trip and message.
      this.$emit('deleteButton', obj)
    },
    showAll () {
      if (this.localSelectedTrip.length === this.filteredCat.length) {
        this.localSelectedTrip = []
      } else {
        this.localSelectedTrip = this.filteredCat
      }
    },
    showGroup (val) {
      this.localSelectedTrip = Array.from(new Set([...this.localSelectedTrip, ...val]))
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
            :icon="localSelectedTrip.length === filteredCat.length? 'fa-eye-slash fa' : 'fa-eye fa'"
            class="ma-2"
            :style="{color: 'white'}"
            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ localSelectedTrip.length ===filteredCat.length ? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            :disabled="localSelectedTrip.length===0? true: false"

            v-bind="props"
            @click="editVisible()"
          />
        </template>
        <span>{{ $gettext("Edit Visibles Properties") }}</span>
      </v-tooltip>

      <v-spacer />
      <span :style="{color: 'white'}">
        {{ $gettext("Roads") }}
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
            @click="store.exportFiles('visible')"
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
              v-model="localSelectedTrip"
              class="ma-2 pl-2"
              :true-icon="'fa-eye fa'"
              :false-icon="'fa-eye-slash fa'"
              :color="'primary'"
              :value="item"
            />
            <div class="ma-2 item">
              {{ item }}
            </div>

            <v-tooltip
              location="bottom"
              open-delay="500"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  icon="fas fa-list"
                  class="ma-1"

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
                  icon="fas fa-trash"
                  class="ma-1"
                  size="small"
                  :disabled="false"
                  v-bind="props"
                  @click="deleteButton({trip:item,group:selectedFilter,message:item,action:'deleterGroup'})"
                />
              </template>
              <span>{{ $gettext("Delete Line") }}</span>
            </v-tooltip>
          </div>
        </template>
      </v-virtual-scroll>

      <v-divider />
    </v-card>
    <v-card class="mx-auto py-2">
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn

            class="mx-2"
            :color="store.anchorMode? 'grey':'regular'"
            v-bind="props"
            @click="store.changeAnchorMode()"
          >
            <v-icon size="small">
              fas fa-anchor
            </v-icon>
          </v-btn>
        </template>
        <span> {{ $gettext("Edit Line geometry") }} <b>(CTRL)</b></span>
      </v-tooltip>
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            class="mx-2"
            :disabled="!rlinksStore.hasCycleway"
            :color="store.cyclewayMode? 'green':'regular'"
            v-bind="props"
            @click="store.changeCyclewayMode()"
          >
            <v-icon size="small">
              fas fa-biking
            </v-icon>
          </v-btn>
        </template>
        <span> {{ $gettext("Show Cycleway direction instead of road") }}</span>
      </v-tooltip>
      <v-spacer />
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
}
.item{
  flex:1;
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
}
.v-selection-control{
  flex:0 !important;
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
