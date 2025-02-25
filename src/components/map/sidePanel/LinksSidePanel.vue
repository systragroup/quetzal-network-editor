<script setup lang="ts">

import short from 'short-uuid'
import { ref, computed, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { useGettext } from 'vue3-gettext'
import { useRouting } from '@src/components/utils/routing/routing.js'
import { userLinksStore } from '@src/store/rlinks'
import SidePanelBottom from './SidePanelBottom.vue'
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'
import MenuSelector from '@src/components/utils/MenuSelector.vue'
const rlinksStore = userLinksStore()
const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })
const { toggleRouting, isRouted } = useRouting()
const { $gettext } = useGettext()

const maxSize = 200
const store = useIndexStore()
const linksStore = useLinksStore()
const selectedVariant = computed({
  get: () => linksStore.variant,
  set: (val) => linksStore.variant = val,
})
const variantChoices = computed(() => linksStore.variantChoice)

const editorTrip = computed(() => linksStore.editorTrip)
const tripList = computed(() => linksStore.tripList)

const selectedTrips = computed({
  get: () => linksStore.selectedTrips,
  set: (val) => linksStore.selectedTrips = val,
})

function showAll () {
  if (selectedTrips.value.length === tripList.value.length) {
    selectedTrips.value = []
  } else {
    selectedTrips.value = tripList.value
  }
}

watch(tripList, (newVal, oldVal) => {
  if (newVal.length < oldVal.length) {
    // if a trip is deleted. we remove it, no remapping.
    selectedTrips.value = selectedTrips.value.filter((trip) => newVal.includes(trip))
  } else if (newVal.length > oldVal.length) {
    // if a trip is added, we add it!
    const newTrip = newVal.filter(item => !oldVal.includes(item))[0]
    selectedTrips.value = [...selectedTrips.value, newTrip]
  } else {
    // if a trip name changes.
    // update localSelectedTrip v-model when a trip_id is changed.
    const dict: any = {}
    oldVal.forEach(
      function (key, i) {
        dict[key] = newVal[i]
      })
    selectedTrips.value = selectedTrips.value.map((trip) => dict[trip])
  }
})
// filters (route_type)
const filterChoices = computed(() => { return linksStore.lineAttributes })
const selectedFilter = ref('route_type')
const ShowGroupList = ref<Set<String>>(new Set([]))
watch(selectedFilter, () => { ShowGroupList.value = new Set([]) })

export interface Group {
  key: string
  isOpen: boolean
}

function toggleGroup (e: Group) {
  if (e.isOpen) {
    ShowGroupList.value.add(e.key)
  } else {
  }
}

const searchString = ref('')
const arrayUniqueTripId = computed(() => {
  // drop duplicates links trips. each line is a trip here.
  const arrayUniqueByKey = [...new Map(linksStore.links.features.map(item =>
    [item.properties.trip_id, item.properties])).values()].filter(
    (item) => item.trip_id.toLowerCase().includes(searchString.value.toLowerCase()))
  return arrayUniqueByKey
})
const filteredCat = computed(() => {
  // for a given filter (key) get array of unique value
  // e.g. get ['bus','subway'] for route_type
  const val = Array.from(new Set(arrayUniqueTripId.value.map(
    item => item[selectedFilter.value])))
  return val
})

interface ClassifiedTripList {
  name: string
  tripId: string[]
}

const classifiedTripId = computed(() => {
  // return this list of object, {cat_name, tripId list}
  // if >500. we do not change and we will rerun this with the old value
  // see watch(selectedFilter)

  if (filteredCat.value.length > maxSize) { return [] }
  const classifiedTripId: ClassifiedTripList[] = []
  const undefinedCat: ClassifiedTripList = { name: $gettext('undefined'), tripId: [] }
  filteredCat.value.forEach(c => {
    const arr = arrayUniqueTripId.value.filter(
      item => item[selectedFilter.value] === c,
    ).map((item) => item.trip_id).sort()

    // regroup all null values into a single list 'undefined'
    if (c === null || c === '' || c === undefined) {
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

function showGroup (val: string[]) {
  // at least one value is selected in the group : uncheck all
  if (val.some(value => selectedTrips.value.includes(value))) {
    selectedTrips.value = selectedTrips.value.filter(trip => !val.includes(trip))
    // none are selected : select All.
  } else {
    selectedTrips.value = Array.from(new Set([...selectedTrips.value, ...val]))
  }
}

function editButton (tripId: string) {
  if (!editorTrip.value) {
    linksStore.setEditorTrip(tripId)
    store.changeNotification({ text: '', autoClose: true })
  }
}

import { useForm } from '@src/composables/UseForm'
const { openDialog } = useForm()

function propertiesButton (value: string[], action: LinksAction) {
  // select the TripId and open dialog
  if (action === 'Edit Group Info') {
    openDialog({ action: 'Edit Group Info', selectedArr: value, lingering: false, type: 'pt' })
  } else if (!editorTrip.value) {
    linksStore.setEditorTrip(value[0])
    openDialog({ action: 'Edit Line Info', selectedArr: value, lingering: false, type: 'pt' })
  } else {
    openDialog({ action: 'Edit Line Info', selectedArr: value, lingering: true, type: 'pt' })
  }
}

function createNewLine () {
  const name = 'trip_' + short.generate()
  linksStore.setEditorTrip(name)
  openDialog({ action: 'Edit Line Info', selectedArr: [name], lingering: true, type: 'pt' })
}

function confirmChanges() {
  linksStore.confirmChanges()
  linksStore.setEditorTrip(null)
  store.changeNotification({ text: $gettext('modification applied'), autoClose: true, color: 'success' })
}

function abortChanges () {
  linksStore.setEditorTrip(null)
  store.changeNotification({ text: $gettext('modification aborted'), autoClose: true })
}

// add dialogs here
const cloneDialog = ref()
const cloneOptions = ref({ name: '', reverse: true, nodes: false, message: '' })
async function cloneButton (tripId: string) {
  cloneOptions.value.message = tripId
  cloneOptions.value.name = tripId + ' copy'
  const resp = await cloneDialog.value.openDialog()
  if (resp) {
    if (linksStore.tripList.includes(cloneOptions.value.name)) {
      store.changeNotification({ text: $gettext('Cannot duplicate: trip_id already exist'),
        autoClose: true, color: 'error' })
    } else {
      linksStore.cloneTrip({
        tripId: tripId,
        name: cloneOptions.value.name,
        cloneNodes: cloneOptions.value.nodes,
        reverse: cloneOptions.value.reverse,
      })
      store.changeNotification({ text: $gettext('Trip Duplicated'),
        autoClose: true, color: 'success' }) }
  }
}

// delete dialog
const deleteDialog = ref()
const deleteMessage = ref('')
async function deleteButton (trips: string[], message: string) {
  // obj contain trip and message.
  deleteMessage.value = message
  const resp = await deleteDialog.value.openDialog()
  if (resp) { linksStore.deleteTrips(trips) }
}

// Highlight

import { useHighlight } from '../../../composables/useHighlight'
import { LinksAction } from '@src/types/typesStore'
const { setHighlightTrip } = useHighlight()
function setHighlight(trip: string | null) {
  if (!editorTrip.value) {
    setHighlightTrip(trip)
  } else {
    setHighlightTrip(null)
  }
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
            :icon="selectedTrips.length === tripList.length ? 'fa-eye fa' : 'fa-eye-slash fa' "
            class="ma-2 "
            :style="{color: 'white'}"

            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ selectedTrips.length === tripList.length? $gettext("Hide All"): $gettext("Show All") }}</span>
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

            :disabled="selectedTrips.length===0? true: false"
            v-bind="props"
            @click="propertiesButton(selectedTrips,'Edit Group Info')"
          />
        </template>
        <span>{{ $gettext("Edit Visibles Properties") }}</span>
      </v-tooltip>

      <v-spacer />
      <span :style="{color: 'white'}">
        {{ $gettext("Lines") }}
      </span>

      <v-spacer />
      <MenuSelector
        v-if="variantChoices.length>1"
        v-model="selectedVariant"
        :items="variantChoices"
        :icon-open="'fas fa-calendar-minus'"
        :icon-close="'fas fa-calendar-minus'"
        :button-style="{color: 'white'}"
      />
      <v-spacer v-else />
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
      :style="editorTrip? {'height':'calc(100vh - 305px)'}: {'height':'calc(100vh - 260px)'}"
      class=" mx-auto scrollable"
    >
      <v-list-item>
        <div
          class="container"
          :style="{'padding-top': '0.5rem'}"
        >
          <v-select
            v-model="selectedFilter"
            :items="filterChoices.sort()"
            :style="{'flex':1.3}"
            prepend-inner-icon="fas fa-filter"
            :label="$gettext('filter')"
            variant="outlined"
            hide-details
            density="compact"
            color="secondarydark"
          />
          <v-text-field
            v-model="searchString"
            :style="{'padding-right': '0.5rem','flex':1}"
            density="compact"
            variant="outlined"
            clear-icon="fas fa-times-circle"
            clearable
            :label="$gettext('search')"
            hide-details
            persistent-clear
            prepend-inner-icon="fas fa-search"
            @click:clear="searchString=''"
          />
        </div>
      </v-list-item>
      <v-list>
        <v-list-item v-if=" filteredCat.length > maxSize">
          <span>{{ $gettext('Cannot filter by this field as it result in %{res} groups. max is %{maxSize} ',
                            { res: String(filteredCat.length), maxSize: String(maxSize)}) }}</span>
        </v-list-item>
        <v-list-item v-if="(filteredCat.length===0) && (searchString!=='')">
          <span>{{ $gettext('Nothing to display.') }}</span>
        </v-list-item>
        <v-list-group
          v-for="(value, key) in classifiedTripId"
          :key="String(value.name) + String(key)"
          color="secondarydark"
        >
          <template v-slot:activator="{ props,isOpen }">
            <v-list-item
              v-bind="props"
              @click="()=>toggleGroup({key: value.name + key,isOpen:!isOpen})"
            >
              <div class="container">
                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props:hover }">
                    <v-btn
                      variant="text"
                      :icon="value.tripId.some(val => selectedTrips.includes(val))
                        ? 'fa-eye fa' :
                          'fa-eye-slash fa' "

                      v-bind="hover"
                      @click.stop="showGroup(value.tripId)"
                    />
                  </template>
                  <span>
                    {{ value.tripId.some(val => selectedTrips.includes(val))
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
                      @click.stop="propertiesButton(value.tripId,'Edit Group Info')"
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
                      @click.stop="deleteButton(value.tripId, value.name)"
                    />
                  </template>
                  <span>{{ $gettext("Delete Group") }}</span>
                </v-tooltip>
              </div>
            </v-list-item>
          </template>
          <v-virtual-scroll
            v-if="ShowGroupList.has(value.name + key)"
            :items="value.tripId"
            :item-height="45"
            :max-height="editorTrip? 'calc(100vh - 250px - 190px)': 'calc(100vh - 250px - 150px)'"
            class="virtual-scroll"
          >
            <template v-slot="{ item }">
              <div
                :key="item"
                class="container cell"
                @mouseenter="setHighlight(item)"
                @mouseleave="setHighlight(null)"
              >
                <v-checkbox
                  v-model="selectedTrips"
                  class="ml-4 mr-2"
                  :true-icon="'fa-eye fa'"
                  :false-icon="'fa-eye-slash fa'"
                  color="primary"
                  density="compact"
                  :value="item"
                  hide-details
                />
                <v-tooltip
                  location="right"
                  open-delay="300"
                >
                  <template v-slot:activator="{ props }">
                    <v-list-item-title
                      v-bind="props"
                      :style="{'font-weight' : item===editorTrip? 'bold':'normal'}"
                      :class="editorTrip?'item': 'item clickable'"
                      @click="editButton(item)"
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
                      icon="fas fa-list"
                      size="small"
                      density="compact"
                      class="ma-1"
                      :disabled="(item != editorTrip) && (editorTrip!=null) ? true: false"
                      v-bind="props"
                      @click="propertiesButton([item],'Edit Line Info')"
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
                      size="small"
                      density="compact"
                      class="ma-1"
                      :disabled="editorTrip ? true: false"
                      v-bind="props"
                      @click="cloneButton(item)"
                    />
                  </template>
                  <span>{{ $gettext("Duplicate and reverse") }}</span>
                </v-tooltip>

                <v-tooltip
                  location="bottom"
                  open-delay="500"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      variant="text"
                      size="small"
                      density="compact"
                      class="ml-1 mr-3"
                      icon="fas fa-trash"
                      :disabled="editorTrip ? true: false"
                      v-bind="props"
                      @click="deleteButton([item], item)"
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
    <SidePanelBottom
      :is-edition="typeof editorTrip === 'string'"
      @edit="createNewLine"
      @confirm-changes="confirmChanges"
      @abort-changes="abortChanges"
    >
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            class="mx-1"
            :color="store.anchorMode? 'grey':'regular'"
            v-bind="props"
            size="small"
            icon="fas fa-anchor"
            @click="store.changeAnchorMode()"
          />
        </template>
        <span> {{ $gettext("Edit Line geometry") }} </span>
      </v-tooltip>
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            class="mx-1"
            size="small"
            :color="store.stickyMode? 'green':'regular'"
            v-bind="props"
            icon="fa-solid fa-magnet"
            @click="store.changeStickyMode()"
          />
        </template>
        <span> {{ $gettext("stick nodes on existing nodes") }}</span>
      </v-tooltip>
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            size="small"
            v-bind="props"
            :disabled="rlinksIsEmpty"
            :color="store.routingMode? 'green':'regular'"
            icon="fas fa-route"
            @click="store.changeRoutingMode()"
          />
        </template>
        <span> {{ $gettext("Follow roads") }}</span>
      </v-tooltip>

      <v-btn
        v-if="store.routingMode"
        class="ml-2"
        append-icon="fas fa-road"
        @click="toggleRouting"
      >
        {{ !isRouted? 'all': 'none' }}
      </v-btn>
    </SidePanelBottom>
    <PromiseDialog
      ref="deleteDialog"
      :title=" $gettext('Delete %{sc}?', { sc: deleteMessage }) "
      :confirm-button="$gettext('Delete')"
      confirm-color="primary"
    />
    <PromiseDialog
      ref="cloneDialog"
      :title=" $gettext('Duplicate %{sc}?', { sc: cloneOptions.message }) "
      :confirm-button="$gettext('duplicate')"
      confirm-color="primary"
    >
      <v-text-field
        v-model="cloneOptions.name"
        :label="$gettext('New name')"
      />
      <v-checkbox-btn
        v-model="cloneOptions.reverse"
        :label="$gettext('reverse')"
      />
      <v-checkbox-btn
        v-model="cloneOptions.nodes"
        :label="$gettext('duplicate nodes')"
      />
    </PromiseDialog>
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
  margin-right: auto;
  padding-left: 0.5rem;
  white-space: nowrap;     /* Prevents text from wrapping to the next line */
  overflow: hidden;        /* Hides any overflowed content */
  text-overflow: ellipsis; /* Displays an ellipsis (...) when text overflows */
}
.clickable{
  cursor: pointer;
}
.cell:hover{
  background-color:  rgb(var(--v-theme-hover));
  transition: background-color 0.3s ease; /* Smooth transition */
}
.clickable:hover {
  font-weight:bold;
  text-shadow: 0 0 1px rgb(var(--v-theme-black));
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
.virtual-scroll{
  margin-right: 3px;
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
