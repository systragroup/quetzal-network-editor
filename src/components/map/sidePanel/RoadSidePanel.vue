<script setup lang="ts">
import { toRaw, ref, onMounted, computed, watch } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { cloneDeep } from 'lodash'
import SidePanelBottom from './SidePanelBottom.vue'
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'

import { useForm } from '@src/composables/UseForm'
import { ShowMethod } from '@src/types/typesStore'
const { openDialog } = useForm()

const store = useIndexStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()
const selectedrGoup = computed(() => { return rlinksStore.selectedrGroup })
const localSelectedTrip = ref(cloneDeep(selectedrGoup.value))

watch(localSelectedTrip, (newVal, oldVal) => {
  let changes: string | string[] = ''
  let method: ShowMethod = 'add'
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
  if (typeof changes !== 'string') {
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

const selectedFilter = ref(cloneDeep(rlinksStore.selectedrFilter))
const vmodelSelectedFilter = ref(selectedFilter.value)
const filterChoices = computed(() => { return rlinksStore.rlineAttributes })
const filteredCat = computed(() => { return rlinksStore.filteredrCategory })
// this.rlinksStore.changeSelectedrFilter(this.selectedFilter)
watch(vmodelSelectedFilter, (newVal, oldVal) => {
  selectedFilter.value = newVal
  // only reset if we change the filter.
  rlinksStore.changeSelectedrFilter(selectedFilter.value)
  // when the component is loaded, oldVal is null and we dont want to overwrite localSelectedTrip to [].
  if (oldVal) {
    localSelectedTrip.value = []
  }
})

onMounted(() => {
  if (linksStore.links.features.length === 0
    && !store.projectIsEmpty
    && selectedrGoup.value.length === 0) {
    showAll()
  }
})

function propertiesButton (group: string) {
  // select the TripId and open dialog
  const features = rlinksStore.grouprLinks(vmodelSelectedFilter.value, group)
  const indexList = features.map(link => link.properties.index)
  openDialog({ action: 'Edit Road Group Info', selectedArr: indexList, lingering: true, type: 'road' })
}

function editVisible () {
  const indexList = rlinksStore.visiblerLinks.features.map(link => link.properties.index)
  openDialog({ action: 'Edit Road Group Info', selectedArr: indexList, lingering: true, type: 'road' })
}

function showAll () {
  if (localSelectedTrip.value.length === filteredCat.value.length) {
    localSelectedTrip.value = []
  } else {
    localSelectedTrip.value = filteredCat.value
  }
}

const roadEditionMode = computed(() => rlinksStore.editionMode)
function edit() {
  rlinksStore.startEditing()
}
function confirmChanges() {
  rlinksStore.saveEdition()
}
function abortChanges() {
  rlinksStore.cancelEdition()
}

// delete dialog
const deleteDialog = ref()
const deleteMessage = ref('')
async function deleteButton (group: string, message: string) {
  // obj contain trip and message.
  deleteMessage.value = message
  const resp = await deleteDialog.value.openDialog()
  if (resp) { rlinksStore.deleterGroup(group)
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
            :icon="localSelectedTrip.length === filteredCat.length? 'fa-eye fa' : 'fa-eye-slash fa'"
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
      :style="roadEditionMode? {'height':'calc(100vh - 300px)'}: {'height':'calc(100vh - 260px)'}"
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
        :max-height="roadEditionMode? 'calc(100vh - 250px - 110px)': 'calc(100vh - 250px - 70px)'"
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
                  @click="deleteButton(item, item)"
                />
              </template>
              <span>{{ $gettext("Delete Line") }}</span>
            </v-tooltip>
          </div>
        </template>
      </v-virtual-scroll>

      <v-divider />
    </v-card>
    <SidePanelBottom
      :title="$gettext('Edit')"
      :prepend-icon="''"
      :is-edition="roadEditionMode"
      @edit="edit"
      @confirm-changes="confirmChanges"
      @abort-changes="abortChanges"
    >
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
        <span> {{ $gettext("Edit Line geometry") }} </span>
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
    </SidePanelBottom>
    <PromiseDialog
      ref="deleteDialog"
      :title=" $gettext('Delete %{sc}?', { sc: deleteMessage }) "
      :confirm-button="$gettext('Delete')"
      confirm-color="primary"
    />
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
