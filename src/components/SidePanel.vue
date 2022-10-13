<script>

const $gettext = s => s

export default {
  name: 'SidePanel',
  components: {

  },
  model: {
    prop: 'selectedTrips',
    event: 'update-tripList',
  },
  props: ['selectedTrips'],
  events: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'deleteButton', 'propertiesButton', 'newLine'],

  data () {
    return {
      showDialog: false,
      showLeftPanelContent: true,
      tripList: [],
      width: null,
      filterChoices: ['route_id', 'agency_id', 'direction_id',
        'route_long_name', 'route_short_name',
        'route_type', 'route_color'],
      selectedFilter: 'route_type',
    }
  },
  computed: {
    showLeftPanel () { return this.$store.getters.showLeftPanel },
    height () { return (window.innerHeight - 80) - 20 * 3 - 80 },
    editorTrip () { return this.$store.getters.editorTrip },
    tripId () { return this.$store.getters.tripId },
    classifiedTripId () {
      const cat = Array.from(new Set(this.$store.getters.links.features.map(
        item => item.properties[this.selectedFilter])))
      // return this list of object, {cat_name, tripId list}
      const classifiedTripId = []
      cat.forEach(c => {
        // get all tripdId in the categeorie.
        const arr = Array.from(
          new Set(
            this.$store.getters.links.features.filter(
              item => item.properties[this.selectedFilter] === c,
            ).map(
              (item) => item.properties.trip_id),
          ),
        )
        classifiedTripId.push({ name: c, tripId: arr })
      })
      return classifiedTripId
      // Array.from(new Set(this.$store.getters.links.features.map(item => item.properties.trip_id)));
    },
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
    tripList (val) {
      this.$emit('update-tripList', val)
    },
    tripId (newVal, oldVal) {
      if (newVal.length < oldVal.length) {
        // if a trip is deleted. we remove it, no remapping.
        this.tripList = this.tripList.filter((trip) => newVal.includes(trip))
      } else if (newVal.length > oldVal.length) {
        // if a trip is added, we add it!
        const newTrip = newVal.filter(item => !oldVal.includes(item))[0]
        this.tripList.push(newTrip)
      } else {
        // if a trip name changes.
        // update TripList v-model when a trip_id is changed.
        const dict = {}
        oldVal.forEach(
          function (key, i) {
            dict[key] = newVal[i]
          })
        this.tripList = this.tripList.map((trip) => dict[trip])
      }
    },
  },
  created () {
    this.tripList = this.$store.getters.tripId
  },

  methods: {
    getWidth () {
      this.width = this.$refs.leftPanelDiv.clientWidth
    },

    editButton (value) {
      if (this.editorTrip === value) {
        this.showDialog = true
      } else {
        this.$store.commit('setEditorTrip', { tripId: value, changeBounds: true })
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },

    propertiesButton (value) {
      // select the TripId and open dialog
      if (!this.editorTrip) {
        this.$store.commit('setEditorTrip', { tripId: value, changeBounds: false })
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: false })
        // just open dialog
      } else {
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },
    createNewLine () {
      const name = 'trip_' + (+new Date()).toString(36)
      this.$store.commit('setEditorTrip', { tripId: name, changeBounds: false })
      this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
      this.$store.commit('changeNotification',
        { text: $gettext('Click on the map to start drawing'), autoClose: false })
    },

    deleteButton (val) {
      this.$emit('deleteButton', val)
    },
    showAll () {
      if (this.tripList === this.tripId) {
        this.tripList = []
      } else {
        this.tripList = this.tripId
      }
    },
    showGroup (val) {
      // all values are selected : uncheck all
      if (val.every(value => this.tripList.includes(value))) {
        this.tripList = this.tripList.filter(trip => !val.includes(trip))
      // not all are selected, select all.
      } else {
        this.tripList = Array.from(new Set([...this.tripList, ...val]))
      }
    },
  },

}
</script>
<template>
  <section
    ref="leftPanelDiv"
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
                      fa-eye fa
                    </v-icon>
                  </v-btn>
                </template>
                <span>{{ tripList == tripId? $gettext("Hide All"): $gettext("Show All") }}</span>
              </v-tooltip>

              <v-spacer />
              {{ $gettext("Lines") }}
              <v-spacer />
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
                    @click="$store.commit('exportFiles')"
                  >
                    <v-icon>fa-solid fa-download</v-icon>
                  </v-btn>
                </template>
                <span>{{ $gettext("Export Files") }}</span>
              </v-tooltip>
            </v-card-title>
            <v-card
              max-width="100%"
              :height="height"
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
              <template v-for="(value, key) in classifiedTripId">
                <v-list-group
                  :key="key"
                  color="secondary"
                  :value="false"
                  no-action
                >
                  <template v-slot:activator>
                    <v-list-item-action>
                      <v-tooltip
                        bottom
                        open-delay="500"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-btn
                            icon
                            v-bind="attrs"
                            v-on="on"
                            @click.stop="showGroup(value.tripId)"
                          >
                            <v-icon class="list-item-icon">
                              fa-eye fa
                            </v-icon>
                          </v-btn>
                        </template>
                        <span>
                          {{ value.tripId.every(val => tripList.includes(val))
                            ? $gettext("Hide All"):
                              $gettext("Show All") }}
                        </span>
                      </v-tooltip>
                    </v-list-item-action>
                    <v-list-item-content>
                      <v-list-item-title><strong>{{ value.name }}</strong></v-list-item-title>
                    </v-list-item-content>
                  </template>

                  <v-list-item
                    v-for="item in value.tripId"
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
                    <v-list-item-title v-if="item==editorTrip">
                      <strong>{{ item }}</strong>
                    </v-list-item-title>
                    <v-list-item-title v-else>
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
                          :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false"
                          v-on="on"
                          @click="editButton(item)"
                        >
                          <v-icon :color="item == editorTrip? 'regular':'regular' ">
                            fa-regular fa-pen
                          </v-icon>
                        </v-btn>
                      </template>
                      <span>{{ $gettext("Edit Line") }}</span>
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
                          :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false"
                          v-on="on"
                          @click="propertiesButton(item)"
                        >
                          <v-icon :color="item == editorTrip? 'regular':'regular' ">
                            fa-regular fa-table
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
                          :disabled="editorTrip ? true: false"
                          v-on="on"
                          @click="deleteButton(item)"
                        >
                          <v-icon
                            small
                            color="regular"
                          >
                            fa-regular fa-trash
                          </v-icon>
                        </v-btn>
                      </template>
                      <span>{{ $gettext("Delete Line") }}</span>
                    </v-tooltip>
                  </v-list-item>
                </v-list-group>
              </template>
              <v-divider />
            </v-card>
            <v-card class="mx-auto">
              <v-list-item v-if="editorTrip ? true: false">
                <v-spacer />
                <v-btn @click="$emit('abortChanges')">
                  <v-icon
                    small
                    left
                  >
                    fas fa-times-circle
                  </v-icon>
                  {{ $gettext("Abort") }}
                </v-btn>
                <v-btn
                  color="primary"
                  @click="$emit('confirmChanges')"
                >
                  <v-icon
                    small
                    left
                  >
                    fas fa-save
                  </v-icon>
                  {{ $gettext("Confirm") }}
                </v-btn>
              </v-list-item>
              <v-list-item v-show="editorTrip ? false: true">
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
                      @click="createNewLine"
                    >
                      <v-icon>fas fa-plus</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ $gettext("Create new Line") }}</span>
                </v-tooltip>
              </v-list-item>
            </v-card>
          </div>
        </div>
      </div>
    </transition>
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
  display: flex;
  width : 100%;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  //resize: horizontal;
  //overflow: auto;

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
   overflow-y: scroll;
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
