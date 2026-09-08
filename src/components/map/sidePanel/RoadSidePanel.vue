<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import SidePanelBottom from './SidePanelBottom.vue'
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'

import { useForm } from '@src/composables/UseForm'
import { getDifference, numericSort } from '@src/utils/utils'
import SidePanelFilter from './SidePanelFilter.vue'
const { openDialog } = useForm()

const store = useIndexStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()

const cyclewayMode = computed<boolean>({
  get: () => rlinksStore.cyclewayMode,
  set: (val: boolean) => rlinksStore.cyclewayMode = val,
})
const showTurnRestrictions = computed<boolean>({
  get: () => rlinksStore.showTurnRestrictions,
  set: (val: boolean) => rlinksStore.showTurnRestrictions = val,
})

const selectedrGoup = computed({
  get: () => rlinksStore.filteredSelected,
  set: (set) => rlinksStore.filteredSelected = set,
})

const selectedrFilter = computed({
  get: () => rlinksStore.selectedrFilter,
  set: (val) => rlinksStore.selectedrFilter = val,
})

watch(selectedrFilter, (v) => {
  rlinksStore.changeSelectedrFilter(v)
  searchString.value = '' // reset search when changing the filtering
})

// lists for filter and virtual-scroll
const attributesList = computed(() => { return rlinksStore.rlineAttributes })
const filteredChoices = computed(() => { return rlinksStore.filteredChoices })
watch(filteredChoices, (newVal, oldVal) => {
  // when add or delete. add the new group to the visible rlinks (or remove)
  const added = getDifference(newVal, oldVal)
  const removed = getDifference(oldVal, newVal)
  if (added.length > 0) {
    added.forEach(el => selectedrGoup.value.add(el))
  } else if (removed.length > 0) {
    removed.forEach(el => selectedrGoup.value.delete(el))
  }
})

const searchString = ref('')

const filteredList = computed(() => {
  return [...filteredChoices.value]
    .filter(el => el.toLowerCase().includes(searchString.value.toLowerCase()))
    .sort(numericSort)
})

onMounted(() => {
  if (linksStore.linksIsEmpty
    && !store.projectIsEmpty
    && selectedrGoup.value.size === 0) {
    showAll()
  }
})

onUnmounted(() => {
  if (cyclewayMode.value) cyclewayMode.value = false
})

function propertiesButton (group: string) {
  const features = rlinksStore.getFilteredrLinks(group)
  const indexList = features.map(link => link.properties.index)
  openDialog({ action: 'Edit Road Group Info', selectedArr: indexList, lingering: true, type: 'road' })
}

function editVisible () {
  const group = rlinksStore.filteredSelected
  const features = rlinksStore.getFilteredrLinks(group)
  const indexList = features.map(link => link.properties.index)
  openDialog({ action: 'Edit Road Group Info', selectedArr: indexList, lingering: true, type: 'road' })
}

function showAll () {
  if (selectedrGoup.value.size === filteredChoices.value.size) {
    // hideAll
    selectedrGoup.value = new Set([])
  } else {
    // showAll
    selectedrGoup.value = filteredChoices.value
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

const selectedrGoupSet = computed({
  get: () => [...selectedrGoup.value],
  set: (arr) => selectedrGoup.value = new Set(arr),
})

function formatName(item: string) {
  if (item === '') {
    return 'null'
  }
  if (item === ' ') {
    return '" "'
  }
  else {
    return item
  }
}

// Highlight
import { useFlyTo } from '@src/composables/useFlyTo.ts'
const { setFlyToId } = useFlyTo()

</script>
<template>
  <div class="side-panel">
    <div class="text-white bg-secondary header">
      <v-tooltip
        location="bottom"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            :icon="selectedrGoup.size === filteredChoices.size? 'fa-eye fa' : 'fa-eye-slash fa'"
            class="ma-2"
            :style="{color: 'white'}"
            v-bind="props"
            @click="showAll()"
          />
        </template>
        <span>{{ selectedrGoup.size ===filteredChoices.size ? $gettext("Hide All"): $gettext("Show All") }}</span>
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
            :disabled="selectedrGoup.size===0? true: false"

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
        <SidePanelFilter
          v-model:search-string="searchString"
          v-model:selected-filter="selectedrFilter"
          :filter-choices="attributesList"
        />
      </v-list-item>

      <v-virtual-scroll
        :items="filteredList"
        :item-height="45"
        :max-height="roadEditionMode? 'calc(100vh - 250px - 110px)': 'calc(100vh - 250px - 70px)'"
      >
        <template v-slot="{ item }">
          <div
            :key="selectedrFilter.concat(item)"
            class="container hover"
          >
            <v-checkbox-btn
              v-model="selectedrGoupSet"
              class="ma-2 pl-2"
              :true-icon="'fa-eye fa'"
              :false-icon="'fa-eye-slash fa'"
              :color="'primary'"
              :value="item"
            />
            <div class="ma-2 item">
              {{ formatName(item) }}
            </div>
            <v-tooltip
              location="bottom"
              open-delay="500"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  icon="fas fa-magnifying-glass"

                  :disabled="false"
                  v-bind="props"
                  @click="setFlyToId(item)"
                />
              </template>
              <span>{{ $gettext("Fly to") }}</span>
            </v-tooltip>

            <v-tooltip
              location="bottom"
              open-delay="500"
            >
              <template v-slot:activator="{ props }">
                <v-btn
                  variant="text"
                  icon="fas fa-list"

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
                  size="small"
                  :disabled="false"
                  v-bind="props"
                  @click="deleteButton(item, item)"
                />
              </template>
              <span>{{ $gettext("Delete All") }}</span>
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
            class="mx-1"
            :color="store.anchorMode? 'primary':'regular'"
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
            :color="showTurnRestrictions? 'green':'regular'"
            icon="fas fa-diamond-turn-right"
            size="small"
            v-bind="props"
            @click="showTurnRestrictions = !showTurnRestrictions"
          />
        </template>
        <span> {{ $gettext("Show nodes with turn restrictions") }}</span>
      </v-tooltip>
      <v-tooltip
        location="right"
        open-delay="500"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            class="mx-1"
            :disabled="!rlinksStore.hasCycleway"
            :color="cyclewayMode? 'green':'regular'"
            icon="fas fa-biking"
            size="small"
            v-bind="props"
            @click="cyclewayMode = !cyclewayMode"
          />
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
  </div>
</template>
<style lang="scss" scoped>

.side-panel{
  width:100%;
  flex-direction: column;
}
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
.hover:hover{
  background-color:  rgb(var(--v-theme-hover));
  transition: background-color 0.3s ease; /* Smooth transition */
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
.scrollable {
   overflow-y:scroll;
}

</style>
