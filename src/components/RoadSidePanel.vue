<script>

const $gettext = s => s
const short = require('short-uuid')

export default {
  name: 'LinksSidePanel',
  components: {
  },
  model: {
    prop: 'selectedTrips',
    event: 'update-tripList',
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
      roadMode: false,
    }
  },
  computed: {
    filterChoices () { return this.$store.getters.rlineAttributes },
    editorTrip () { return this.$store.getters.editorTrip },

    tripId () { return this.$store.getters.tripId },
    arrayUniqueTripId () {
      // drop duplicates links trips. each line is a trip here.
      const arrayUniqueByKey = [...new Map(this.$store.getters.links.features.map(item =>
        [item.properties.trip_id, item.properties])).values()]
      return arrayUniqueByKey
    },
    filteredCat () {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(this.arrayUniqueTripId.map(
        item => item[this.selectedFilter])))
      return val
    },

    classifiedTripId () {
      // return this list of object, {cat_name, tripId list}
      const classifiedTripId = []
      const undefinedCat = { name: $gettext('undefined'), tripId: [] }
      this.filteredCat.forEach(c => {
        const arr = this.arrayUniqueTripId.filter(
          item => item[this.selectedFilter] === c,
        ).map((item) => item.trip_id)

        // regroup all null values into a single list 'undefined'
        if (c === null | c === '' | c === undefined) {
          undefinedCat.tripId.push(...arr)
        } else {
          classifiedTripId.push({ name: c, tripId: arr })
        }
      })
      // if there was undefined Categories, append it at the end.
      if (undefinedCat.tripId.length > 0) {
        classifiedTripId.push(undefinedCat)
      }
      return classifiedTripId
    },
  },

  watch: {
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
    vmodelSelectedFilter (newVal, oldVal) {
      this.selectedFilter = newVal
      // prevent group larger than 500.
      if (this.filteredCat.length > 500) {
        // if it is larger, return to oldValue
        this.selectedFilter = oldVal
        // display error message
        this.$store.commit('changeNotification',
          {
            text: $gettext('Cannot filter by this field. There is more than 500 groups'),
            autoClose: true,
            color: 'red darken-2',
          })
        // return the value in the v-select as the old Value
        // eslint-disable-next-line no-return-assign
        this.$nextTick(() => this.vmodelSelectedFilter = oldVal)
      }
    },

  },
  created () {
    this.tripList = this.selectedTrips
    this.selectedFilter = 'route_type'
    this.vmodelSelectedFilter = this.selectedFilter
  },

  methods: {

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
      if (typeof value === 'object') {
        this.$emit('propertiesButton', { action: 'Edit Group Info', lingering: false, tripIds: value })
      } else if (!this.editorTrip) {
        this.$store.commit('setEditorTrip', { tripId: value, changeBounds: false })
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: false })
        // just open dialog
      } else {
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },
    createNewLine () {
      const name = 'trip_' + short.generate()
      this.$store.commit('setEditorTrip', { tripId: name, changeBounds: false })
      this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
      this.$store.commit('changeNotification',
        { text: $gettext('Click on the map to start drawing'), autoClose: false })
    },

    deleteButton (obj) {
      // obj contain trip and message.
      this.$emit('deleteButton', obj)
    },
    showAll () {
      if (this.tripList === this.tripId) {
        this.tripList = []
      } else {
        this.tripList = this.tripId
      }
    },
    showGroup (val) {
      // at least one value is selected in the group : uncheck all
      if (val.some(value => this.tripList.includes(value))) {
        this.tripList = this.tripList.filter(trip => !val.includes(trip))
      // none are selected : select All.
      } else {
        this.tripList = Array.from(new Set([...this.tripList, ...val]))
      }
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
              fa-eye fa
            </v-icon>
          </v-btn>
        </template>
        <span>{{ tripList == tripId? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            @click="$store.commit('exportFiles')"
          >
            <v-list-item-title>
              {{ $gettext("Export All") }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item
            link
            @click="$store.commit('exportFiles',tripList)"
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
      <v-list-group
        v-for="(value, key) in classifiedTripId"
        :key="String(value.name) + String(key)"
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
                    {{ value.tripId.some(val => tripList.includes(val))
                      ? 'fa-eye fa' :
                        'fa-eye-slash fa' }}
                  </v-icon>
                </v-btn>
              </template>
              <span>
                {{ value.tripId.some(val => tripList.includes(val))
                  ? $gettext("Hide All"):
                    $gettext("Show All") }}
              </span>
            </v-tooltip>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>
              <strong>
                {{ value.name=='undefined'? $gettext(value.name): value.name }}
              </strong>
            </v-list-item-title>
          </v-list-item-content>
          <v-tooltip
            bottom
            open-delay="500"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                class="ma-1"
                v-bind="attrs"
                :disabled="editorTrip!=null? true: false"
                v-on="on"
                @click.stop="propertiesButton(value.tripId)"
              >
                <v-icon color="regular">
                  fas fa-list
                </v-icon>
              </v-btn>
            </template>
            <span>{{ $gettext("Edit Group Properties") }}</span>
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
                @click.stop="deleteButton({trip:value.tripId, message:value.name})"
              >
                <v-icon
                  small
                  color="regular"
                >
                  fas fa-trash
                </v-icon>
              </v-btn>
            </template>
            <span>{{ $gettext("Delete Group") }}</span>
          </v-tooltip>
        </template>

        <v-virtual-scroll
          :items="value.tripId"
          :item-height="45"
          :height="Math.min(height-220, 45*value.tripId.length+3)"
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
                    @click="propertiesButton(item)"
                  >
                    <v-icon :color="item == editorTrip? 'regular':'regular' ">
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
                    :disabled="editorTrip ? true: false"
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
      </v-list-group>

      <v-divider />
    </v-card>
    <v-card class="mx-auto">
      <v-list-item v-if="editorTrip ? true: false">
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

        <v-btn
          @click="$emit('abortChanges')"
        >
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
