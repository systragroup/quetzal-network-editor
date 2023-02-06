<script>

export default {
  name: 'RoadSidePanel',
  components: {
  },
  props: ['selectedTrips', 'height'], // height is here to resize with the windows...
  events: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'deleteButton', 'propertiesButton', 'newLine'],

  data () {
    return {
      showDialog: false,
      tripList: [],
      // for some reason, the v-model does not update when i force it in a watcher or a method.
      // I this vmodelselectedFilter for displaying the correct selected filter in the filter selector.
      selectedFilter: '',
      vmodelSelectedFilter: '',
    }
  },
  computed: {
    filterChoices () { return this.$store.getters.rlineAttributes },
    filteredCat () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.$store.getters.rlinks.features.map(
        item => item.properties[this.selectedFilter])))
      return val
    },

  },

  watch: {
    tripList (val) {
      this.$emit('update-tripList', { category: this.vmodelSelectedFilter, data: val })
    },

    vmodelSelectedFilter (newVal, oldVal) {
      this.selectedFilter = newVal
    },

  },
  mounted () {
    this.tripList = this.selectedTrips
    this.selectedFilter = 'highway'
    this.vmodelSelectedFilter = this.selectedFilter
  },

  methods: {

    propertiesButton (value) {
      // select the TripId and open dialog
      if (typeof value === 'object') {
        this.$emit('propertiesButton', { action: 'Edit Group Info', lingering: false, tripIds: value })
      } else {
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },

    deleteButton (obj) {
      // obj contain trip and message.
      this.$emit('deleteButton', obj)
    },
    showAll () {
      if (this.tripList === this.filteredCat) {
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
              {{ tripList.length > 0 ? 'fa-eye fa' : 'fa-eye-slash fa' }}
            </v-icon>
          </v-btn>
        </template>
        <span>{{ tripList.length > 0 ? $gettext("Hide All"): $gettext("Show All") }}</span>
      </v-tooltip>
      <v-tooltip
        bottom
        open-delay="500"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            icon
            class="ma-2"
            color="white"
            :disabled="true"
            v-bind="attrs"
            v-on="on"
            @click="propertiesButton(tripList)"
          >
            <v-icon class="list-item-icon">
              fas fa-list
            </v-icon>
          </v-btn>
        </template>
        <span>{{ $gettext("Edit Visibles Properties") }}</span>
      </v-tooltip>

      <v-spacer />
      {{ $gettext("Roads") }}
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
            color="white"
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
            @click="$store.commit('exportFiles','all')"
          >
            <v-list-item-title>
              {{ $gettext("Export All") }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="$store.commit('exportFiles','visible')"
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
          label="filter"
          item-color="secondary"
          color="secondary"
        />
      </v-list-item>

      <v-virtual-scroll
        :items="filteredCat"
        :item-height="45"
        :height="height-75"
      >
        <template v-slot="{ item }">
          <v-list-item
            :key="item"
            class="pl-2"
          >
            <v-list-item-action>
              <v-checkbox
                v-model="tripList"
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
                  :disabled="true"
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
                  :disabled="true"
                  v-on="on"
                  @click="deleteButton({trip:item,message:item})"
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
        <v-tooltip
          right
          open-delay="500"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              class="mx-2"
              :color="$store.getters.anchorMode? 'grey':'regular'"
              v-on="on"
              @click="$store.commit('changeAnchorMode')"
            >
              <v-icon small>
                fas fa-bezier-curve
              </v-icon>
            </v-btn>
          </template>
          <span>{{ $gettext("Edit Line geometry") }}</span>
        </v-tooltip>
        <v-spacer />
      </v-list-item>
    </v-card>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="290"
      @keydown.enter="$emit('confirmChanges'); showDialog = !showDialog"
      @keydown.esc="showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Save Changes?") }}
        </v-card-title>
        <v-card-actions>
          <v-btn
            color="regular"
            left
            @click="showDialog = false"
          >
            {{ $gettext("Cancel") }}
          </v-btn>
          <v-spacer />
          <v-btn
            color="regular"
            @click="$emit('abortChanges'); showDialog = !showDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"

            @click="$emit('confirmChanges'); showDialog = !showDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>
@import "src/scss/variables.scss";
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
