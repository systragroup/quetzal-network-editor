<script>

import short from 'short-uuid'
import { ref, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
const $gettext = s => s
export default {
  name: 'LinksSidePanel',
  components: {
  },

  props: ['selectedTrips', 'height'], // height is here to resize with the windows...
  events: ['selectEditorTrip', 'confirmChanges', 'abortChanges', 'cloneButton', 'deleteButton', 'propertiesButton', 'newLine'],
  setup () {
    const store = useIndexStore()
    const linksStore = useLinksStore()
    const selectedFilter = ref('')
    const filterChoices = computed(() => { return linksStore.lineAttributes })
    const editorTrip = computed(() => { return linksStore.editorTrip })
    const tripId = computed(() => { return linksStore.tripId })
    const arrayUniqueTripId = computed(() => { // drop duplicates links trips. each line is a trip here.
      const arrayUniqueByKey = [...new Map(linksStore.links.features.map(item =>
        [item.properties.trip_id, item.properties])).values()]
      return arrayUniqueByKey
    })
    const filteredCat = computed(() => {
      // for a given filter (key) get array of unique value
      // e.g. get ['bus','subway'] for route_type
      const val = Array.from(new Set(arrayUniqueTripId.value.map(
        item => item[selectedFilter.value])))
      return val
    })

    const classifiedTripId = computed(() => {
      // return this list of object, {cat_name, tripId list}
      const classifiedTripId = []
      const undefinedCat = { name: $gettext('undefined'), tripId: [] }
      filteredCat.value.forEach(c => {
        const arr = arrayUniqueTripId.value.filter(
          item => item[selectedFilter.value] === c,
        ).map((item) => item.trip_id).sort()

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
    })
    // const  = computed(() => {  })

    return {
      store,
      linksStore,
      selectedFilter,
      filterChoices,
      editorTrip,
      tripId,
      arrayUniqueTripId,
      filteredCat,
      classifiedTripId,
    }
  },
  data () {
    return {
      showDialog: false,
      open: [],
      tripList: [],
      // for some reason, the v-model does not update when i force it in a watcher or a method.
      // I this vmodelselectedFilter for displaying the correct selected filter in the filter selector.
      // selectedFilter: '',
      vmodelSelectedFilter: '',
    }
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
        this.store.changeNotification({
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
        this.store.setEditorTrip({ tripId: value, changeBounds: true })
        this.store.changeNotification({ text: '', autoClose: true })
      }
    },

    propertiesButton (value) {
      // select the TripId and open dialog
      if (typeof value === 'object') {
        this.$emit('propertiesButton', { action: 'Edit Group Info', lingering: false, tripIds: value })
      } else if (!this.editorTrip) {
        this.store.setEditorTrip({ tripId: value, changeBounds: false })
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: false })
        // just open dialog
      } else {
        this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
        this.store.changeNotification({ text: '', autoClose: true })
      }
    },
    createNewLine () {
      const name = 'trip_' + short.generate()
      this.linksStore.setEditorTrip({ tripId: name, changeBounds: false })
      this.$emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
    },

    cloneButton (obj) {
      this.$emit('cloneButton', obj)
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
    <div class="text-white bg-secondary header">
      <v-tooltip
        location="bottom"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            :icon="tripList == tripId ? 'fa-eye fa' : 'fa-eye-slash fa' "
            class="ma-2 "
            :style="{color: 'white'}"

            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ tripList == tripId? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            @click="propertiesButton(tripList)"
          />
        </template>
        <span>{{ $gettext("Edit Visibles Properties") }}</span>
      </v-tooltip>

      <v-spacer />
      <span :style="{color: 'white'}">
        {{ $gettext("Lines") }}
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
            icon="fas fa-download"
            class="ma-2"
            :style="{color: 'white'}"

            v-bind="props"
          />
        </template>
        <v-list>
          <v-list-item
            link
            @click="store.exportFiles()"
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
      <v-list v-model:opened="open">
        <v-list-group
          v-for="(value, key) in classifiedTripId"
          :key="String(value.name) + String(key)"

          color="secondarydark"
          :value="String(value.name) + String(key)"
        >
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
            >
              <div class="container">
                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props:hover }">
                    <v-btn
                      variant="text"
                      :icon="value.tripId.some(val => tripList.includes(val))
                        ? 'fa-eye fa' :
                          'fa-eye-slash fa' "

                      v-bind="hover"
                      @click.stop="showGroup(value.tripId)"
                    />
                  </template>
                  <span>
                    {{ value.tripId.some(val => tripList.includes(val))
                      ? $gettext("Hide All"):
                        $gettext("Show All") }}
                  </span>
                </v-tooltip>

                <div class="item">
                  <strong>
                    {{ value.name=='undefined'? $gettext(value.name): value.name }}
                  </strong>
                </div>

                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props:hover }">
                    <v-btn
                      variant="text"
                      icon="fas fa-list"
                      class="ma-1"

                      :disabled="editorTrip!=null? true: false"
                      v-bind="hover"
                      @click.stop="propertiesButton(value.tripId)"
                    />
                  </template>
                  <span>{{ $gettext("Edit Group Properties") }}</span>
                </v-tooltip>
                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props:hover }">
                    <v-btn
                      variant="text"
                      icon="fas fa-trash"
                      class="ma-1"

                      :disabled="editorTrip ? true: false"
                      v-bind="hover"
                      @click.stop="deleteButton({trip:value.tripId, message:value.name,action:'deleteTrip'})"
                    />
                  </template>
                  <span>{{ $gettext("Delete Group") }}</span>
                </v-tooltip>
              </div>
            </v-list-item>
          </template>

          <v-virtual-scroll
            :items="value.tripId"
            :item-height="45"
            :height="Math.min(height-220, 45*value.tripId.length+3)"
          >
            <template v-slot="{ item }">
              <div
                :key="item"
                class="container"
              >
                <v-checkbox-btn
                  v-model="tripList"
                  class="pl-2"
                  :true-icon="'fa-eye fa'"
                  :false-icon="'fa-eye-slash fa'"
                  :color="'primary'"
                  :value="item"
                  size="10"
                  hide-details
                />
                <v-tooltip
                  location="right"
                  open-delay="300"
                  content-class="custom-tooltip"
                >
                  <template v-slot:activator="{ props }">
                    <v-list-item-title
                      v-if="item==editorTrip"
                      v-on="on"
                    >
                      <strong>{{ item }}</strong>
                    </v-list-item-title>
                    <v-list-item-title
                      v-else
                      v-bind="props"
                    >
                      {{ item }}
                    </v-list-item-title>
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
                      icon="fas fa-pen"
                      class="ma-1"
                      size="small"
                      :color="'regular'"
                      :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false"
                      v-bind="props"
                      @click="editButton(item)"
                    />
                  </template>
                  <span>{{ $gettext("Edit Line") }}</span>
                </v-tooltip>

                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      variant="text"
                      icon="fas fa-list"
                      size="small"
                      class="ma-1"
                      color="regular"
                      :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false"
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
                      icon="fas fa-clone"
                      class="ma-1"
                      size="small"
                      color="regular"
                      :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false"
                      v-bind="props"
                      @click="cloneButton({trip:item,message:item})"
                    />
                  </template>
                  <span>{{ $gettext("Duplicate") }}</span>
                </v-tooltip>

                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      variant="text"
                      size="small"
                      icon="fas fa-trash"
                      class="ma-1"

                      :disabled="editorTrip ? true: false"
                      v-bind="props"
                      @click="deleteButton({trip:item,message:item,action:'deleteTrip'})"
                    />
                  </template>
                  <span>{{ $gettext("Delete Line") }}</span>
                </v-tooltip>
              </div>
            </template>
          </v-virtual-scroll>
        </v-list-group>
      </v-list>

      <v-divider />
    </v-card>
    <v-card class="mx-auto">
      <v-list-item v-if="editorTrip ? true: false">
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

        <v-btn
          @click="$emit('abortChanges')"
        >
          <v-icon
            size="small"
            start
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
            size="small"
            start
          >
            fas fa-save
          </v-icon>
          {{ $gettext("Confirm") }}
        </v-btn>
      </v-list-item>
      <v-list-item v-show="editorTrip ? false: true">
        <v-spacer />

        <v-tooltip
          location="bottom"
          open-delay="500"
        >
          <template v-slot:activator="{ props }">
            <v-btn

              color="primary"
              class="text--primary"
              size="small"
              v-bind="props"
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
            location="left"
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
.custom-tooltip {
    opacity: 1!important;
    background: var(--v-tooltip-bg, rgba(97, 97, 97, 1)) !important;
}

</style>
