<script>
</script>

<script setup>

import short from 'short-uuid'
import { ref, computed, watch, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
const emit = defineEmits(['selectEditorTrip', 'confirmChanges', 'abortChanges', 'cloneButton', 'deleteButton', 'propertiesButton', 'newLine'])
const maxSize = 200
const store = useIndexStore()
const linksStore = useLinksStore()
const editorTrip = computed(() => { return linksStore.editorTrip })

const selectedTrips = computed(() => { return linksStore.selectedTrips })
const localSelectedTrip = ref([])
onMounted(() => {
  localSelectedTrip.value = cloneDeep(selectedTrips.value)
})

watch(localSelectedTrip, (val) => {
  linksStore.changeSelectedTrips(val)
})

function showAll () {
  if (localSelectedTrip.value.length === tripId.value.length) {
    localSelectedTrip.value = []
  } else {
    localSelectedTrip.value = tripId.value
  }
}

const tripId = computed(() => { return linksStore.tripId })
watch(tripId, (newVal, oldVal) => {
  if (newVal.length < oldVal.length) {
    // if a trip is deleted. we remove it, no remapping.
    localSelectedTrip.value = localSelectedTrip.value.filter((trip) => newVal.includes(trip))
  } else if (newVal.length > oldVal.length) {
    // if a trip is added, we add it!
    const newTrip = newVal.filter(item => !oldVal.includes(item))[0]
    localSelectedTrip.value = [...localSelectedTrip.value, newTrip]
  } else {
    // if a trip name changes.
    // update localSelectedTrip v-model when a trip_id is changed.
    const dict = {}
    oldVal.forEach(
      function (key, i) {
        dict[key] = newVal[i]
      })
    localSelectedTrip.value = localSelectedTrip.value.map((trip) => dict[trip])
  }
})
// filters (route_type)
const filterChoices = computed(() => { return linksStore.lineAttributes })
const selectedFilter = ref('route_type')
const ShowGroupList = ref(new Set([]))
watch(selectedFilter, () => { ShowGroupList.value = new Set([]) })

function toggleGroup (e) {
  if (e.isOpen) {
    ShowGroupList.value.add(e.key)
  } else {
    // dont remove them. its not a bottleeck to have unused one.
    // it can be tricky with the animation and bouble click...
    // nextTick(() => { ShowGroupList.value.delete(e.key) })
  }
}

const searchString = ref('')
const arrayUniqueTripId = computed(() => {
  // drop duplicates links trips. each line is a trip here.
  const arrayUniqueByKey = [...new Map(linksStore.links.features.map(item =>
    [item.properties.trip_id, item.properties])).values()].filter(
    (item) => item.trip_id.toLowerCase().startsWith(searchString.value.toLowerCase()))
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
  // if >500. we do not change and we will rerun this with the old value
  // see watch(selectedFilter)

  if (filteredCat.value.length > maxSize) { return [] }
  const classifiedTripId = []
  const undefinedCat = { name: $gettext('undefined'), tripId: [] }
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

function showGroup (val) {
  // at least one value is selected in the group : uncheck all
  if (val.some(value => localSelectedTrip.value.includes(value))) {
    localSelectedTrip.value = localSelectedTrip.value.filter(trip => !val.includes(trip))
    // none are selected : select All.
  } else {
    localSelectedTrip.value = Array.from(new Set([...localSelectedTrip.value, ...val]))
  }
}

// ui, dialog, button
const showDialog = ref(false)
function editButton (value) {
  if (editorTrip.value === value) {
    showDialog.value = true
  } else {
    linksStore.setEditorTrip({ tripId: value, changeBounds: true })
    store.changeNotification({ text: '', autoClose: true })
  }
}

function propertiesButton (value) {
  // select the TripId and open dialog
  if (typeof value === 'object') {
    emit('propertiesButton', { action: 'Edit Group Info', lingering: false, tripIds: value })
  } else if (!editorTrip.value) {
    linksStore.setEditorTrip({ tripId: value, changeBounds: false })
    emit('propertiesButton', { action: 'Edit Line Info', lingering: false })
    // just open dialog
  } else {
    emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
    store.changeNotification({ text: '', autoClose: true })
  }
}

function createNewLine () {
  const name = 'trip_' + short.generate()
  linksStore.setEditorTrip({ tripId: name, changeBounds: false })
  emit('propertiesButton', { action: 'Edit Line Info', lingering: true })
}

function cloneButton (obj) {
  emit('cloneButton', obj)
}

function deleteButton (obj) {
  // obj contain trip and message.
  emit('deleteButton', obj)
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
            :icon="localSelectedTrip.length === tripId.length ? 'fa-eye-slash fa' : 'fa-eye fa' "
            class="ma-2 "
            :style="{color: 'white'}"

            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ localSelectedTrip.length === tripId.length? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            @click="propertiesButton(localSelectedTrip)"
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
      :style="{'height':'calc(100vh - 250px)'}"
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
        <v-list-item v-if=" filteredCat.length>maxSize">
          <span>{{ $gettext('Cannot filter by this field as it result in %{res} groups. max is %{maxSize} ',
                            { res: filteredCat.length ,maxSize:maxSize}) }}</span>
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
                      :icon="value.tripId.some(val => localSelectedTrip.includes(val))
                        ? 'fa-eye fa' :
                          'fa-eye-slash fa' "

                      v-bind="hover"
                      @click.stop="showGroup(value.tripId)"
                    />
                  </template>
                  <span>
                    {{ value.tripId.some(val => localSelectedTrip.includes(val))
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
            v-if="ShowGroupList.has(value.name + key)"
            :items="value.tripId"
            :item-height="45"
            :max-height="'calc(100vh - 250px - 220px)'"
            class="virtual-scroll"
          >
            <template v-slot="{ item }">
              <div
                :key="item"
                class="container"
              >
                <v-checkbox-btn
                  v-model="localSelectedTrip"
                  class="pl-2"
                  :true-icon="'fa-eye fa'"
                  :false-icon="'fa-eye-slash fa'"
                  :color="'primary'"
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
                      :disabled="(item != editorTrip) && (editorTrip!=null) ? true: false"
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
                      :disabled="(item != editorTrip) && (editorTrip!=null) ? true: false"
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
                      :disabled="editorTrip ? true: false"
                      v-bind="props"
                      @click="cloneButton({trip:item,message:item})"
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
    <v-card class="mx-auto py-2">
      <div v-if="editorTrip">
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
          class="mx-2"

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
      </div>
      <div
        v-else
        :style="{'justify-content':'flex-end'}"
      >
        <v-tooltip
          location="bottom"
          open-delay="500"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              color="primary"
              size="small"
              class="mx-2"
              icon="fas fa-plus"
              v-bind="props"
              @click="createNewLine"
            />
          </template>
          <span>{{ $gettext("Create new Line") }}</span>
        </v-tooltip>
      </div>
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
