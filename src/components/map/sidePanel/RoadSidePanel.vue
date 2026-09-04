<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import SidePanelBottom from './SidePanelBottom.vue'
import PromiseDialog from '@src/components/utils/PromiseDialog.vue'

import { useForm } from '@src/composables/UseForm'
import { getDifference } from '@src/utils/utils'
const { openDialog } = useForm()

const store = useIndexStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()

const cyclewayMode = computed<boolean>({
  get: () => rlinksStore.cyclewayMode,
  set: (val: boolean) => rlinksStore.cyclewayMode = val,
})

const selectedrGoup = computed({
  get: () => rlinksStore.filteredSelected,
  set: (set) => rlinksStore.filteredSelected = set,
})

const selectedrFilter = computed({
  get: () => rlinksStore.selectedrFilter,
  set: (val) => rlinksStore.selectedrFilter = val,
})

watch(selectedrFilter, (v) => rlinksStore.changeSelectedrFilter(v))

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

onMounted(() => {
  if (linksStore.linksIsEmpty
    && !store.projectIsEmpty
    && selectedrGoup.value.size === 0) {
    showAll()
  }
})

onUnmounted(() => {
  console.log('tyolo')
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

const selectedrGoupProxy = computed({
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
        <div :style="{'padding-top': '0.5rem'}">
          <v-select
            v-model="selectedrFilter"
            :items="attributesList.sort()"
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
        :items="[...filteredChoices]"
        :item-height="45"
        :max-height="roadEditionMode? 'calc(100vh - 250px - 110px)': 'calc(100vh - 250px - 70px)'"
      >
        <template v-slot="{ item }">
          <div
            :key="selectedrFilter.concat(item)"
            class="container"
          >
            <v-checkbox-btn
              v-model="selectedrGoupProxy"
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
            :color="cyclewayMode? 'green':'regular'"
            v-bind="props"
            @click="cyclewayMode = !cyclewayMode"
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
