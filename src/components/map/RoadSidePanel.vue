<script>
import { toRaw, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'

export default {
  name: 'RoadSidePanel',
  components: {
  },
  props: ['selectedrGoup', 'height'], // height is here to resize with the windows...
  events: ['deleteButton', 'propertiesButton', 'update-tripList'],
  setup () {
    const store = useIndexStore()
    const rlinksStore = userLinksStore()
    const linksStore = useLinksStore()
    const filterChoices = computed(() => { return rlinksStore.rlineAttributes })
    const filteredCat = computed(() => { return rlinksStore.filteredrCategory })
    return {
      store,
      rlinksStore,
      linksStore,
      filterChoices,
      filteredCat,
    }
  },
  data () {
    return {
      tripList: this.selectedrGoup,
      // for some reason, the v-model does not update when i force it in a watcher or a method.
      // I this vmodelselectedFilter for displaying the correct selected filter in the filter selector.
      selectedFilter: '',
      vmodelSelectedFilter: '',
    }
  },

  watch: {
    tripList (newVal, oldVal) {
      let changes = ''
      let method = 'add'
      if (JSON.stringify(newVal) === JSON.stringify(this.filteredCat)) {
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
        this.$emit('update-tripList', { category: this.vmodelSelectedFilter, data: changes, method })
      }
    },
    selectedrGoup (newVal) {
      // check selected group in store. if it changes from another component
      const a = new Set(newVal)
      const b = new Set(this.tripList)
      if (!(a.size === b.size && new Set([...a, ...b]).size === a.size)) {
        this.tripList = toRaw(newVal)
      }
    },

    vmodelSelectedFilter (newVal, oldVal) {
      this.selectedFilter = newVal
      // only reset if we change the filter.
      this.rlinksStore.changeSelectedrFilter(this.selectedFilter)
      // when the component is loaded, oldVal is null and we dont want to overwrite tripList to [].
      if (oldVal) {
        this.tripList = []
      }
    },

  },
  mounted () {
    this.tripList = this.selectedrGoup
    this.selectedFilter = this.rlinksStore.selectedrFilter
    this.vmodelSelectedFilter = this.selectedFilter
    this.rlinksStore.changeSelectedrFilter(this.selectedFilter)

    if (this.linksStore.links.features.length === 0 &&
    !this.store.projectIsEmpty &&
    this.selectedrGoup.length === 0) {
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
      if (this.tripList.length === this.filteredCat.length) {
        this.tripList = []
      } else {
        this.tripList = this.filteredCat
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
            :icon="tripList.length > 0 ? 'fa-eye fa' : 'fa-eye-slash fa'"
            class="ma-2"
            :style="{color: 'white'}"
            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ tripList.length > 0 ? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            :disabled="tripList.length===0? true: false"

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
      :height="height"
      class="mx-auto scrollable"
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
        :height="height-88"
      >
        <template v-slot="{ item }">
          <div
            :key="vmodelSelectedFilter.concat(item)"
            class="container"
          >
            <v-checkbox-btn
              v-model="tripList"
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
    <v-card class="mx-auto">
      <v-list-item>
        <v-tooltip
          location="right"
          open-delay="500"
        >
          <template v-slot:activator="{ props }">
            <v-btn

              class="mx-2"
              :color="rlinksStore.anchorMode? 'grey':'regular'"
              v-bind="props"
              @click="rlinksStore.changeAnchorMode()"
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
              :color="rlinksStore.cyclewayMode? 'green':'regular'"
              v-bind="props"
              @click="rlinksStore.changeCyclewayMode()"
            >
              <v-icon size="small">
                fas fa-biking
              </v-icon>
            </v-btn>
          </template>
          <span> {{ $gettext("Show Cycleway direction instead of road") }}</span>
        </v-tooltip>
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
}
.item{
  flex:1;
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
