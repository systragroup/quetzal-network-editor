<script setup>
// const SidePanel = defineAsyncComponent(() => import('@comp/map/sidePanel/SidePanel.vue'))
// const Map = defineAsyncComponent(() => import('@comp/map/Map.vue'))
import SidePanel from '@comp/map/sidePanel/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import EditDialog from '@comp/map/EditDialog.vue'
import LinksEditDialog from '@src/components/map/Dialog/LinksEditDialog.vue'
import { getGroupForm } from '@comp/utils/utils.js'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'

import { ref, onUnmounted } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

import { useForm } from '@src/composables/UseForm'
import RoadsEditDialog from '@src/components/map/Dialog/RoadsEditDialog.vue'
const { dialogType } = useForm()

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const editorForm = ref({})
const mode = ref('pt')
const action = ref(null)

onUnmounted(() => {
  linksStore.setEditorTrip(null)
  if (store.anchorMode) { store.changeAnchorMode() }
  if (store.cyclewayMode) { store.changeCyclewayMode() }
})

const showDialog = ref(false)

const selectedNode = ref(null)
const selectedLink = ref(null)
const selectedIndex = ref(null)
const cloneDialog = ref(false)
const deleteDialog = ref(false)
const tripToDelete = ref(null)
const message = ref('')
const cloneObj = ref({ trip: null, name: null, reverse: true, nodes: false })
const errorMessage = ref(null)
const lingering = ref(true)
const linkDir = ref([])

function actionClick (event) {
  action.value = event.action
  lingering.value = (Object.keys(event).includes('lingering')) ? event.lingering : lingering.value
  if (action.value === 'Edit OD Info') {
    selectedLink.value = event.selectedIndex[0]
    editorForm.value = ODStore.linkForm(selectedLink.value)
    showDialog.value = true
  } else if (action.value === 'Edit OD Group Info') {
    const features = ODStore.groupLayer(event.category, event.group)
    selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
    const lineAttributes = ODStore.layerAttributes
    const uneditable = ['index']
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit Visible OD Info') {
    const features = ODStore.visibleLayer.features
    selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
    const lineAttributes = ODStore.layerAttributes
    const uneditable = ['index']
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Delete OD') {
    selectedIndex.value = event.selectedIndex
    applyAction()
  }
}

function applyAction () {
  // click yes on dialog
  showDialog.value = false
  deleteDialog.value = false
  switch (action.value) {
    case 'Edit OD Group Info':
      ODStore.editGroupInfo({ selectedLinks: selectedLink.value, info: editorForm.value })
      break
    case 'Edit Visible OD Info':
      ODStore.editGroupInfo({
        selectedLinks: ODStore.visibleLayer.features,
        info: editorForm.value,
      })
      break
    case 'Edit OD Info':
      ODStore.editLinkInfo({ selectedLinkId: selectedLink.value, info: editorForm.value })
      break
    case 'deleteTrip':
      linksStore.deleteTrip(tripToDelete.value)
      break
    case 'deleterGroup':
      rlinksStore.deleterGroup(tripToDelete.value)
      break
    case 'Delete OD':
      ODStore.deleteOD({ selectedIndex: selectedIndex.value })
      break
    case 'deleteODGroup':
      ODStore.deleteGroup(tripToDelete.value)
      break
  }
  if (!lingering.value) {
    confirmChanges()
    lingering.value = true
  }
}
function cancelAction () {
  showDialog.value = false
  deleteDialog.value = false
  if (!lingering.value) {
    abortChanges()
    lingering.value = true
  }
}
function confirmChanges () {
  // confirm changes on sidePanel, this overwrite Links in store.
  linksStore.confirmChanges()
  // put editTrip and action to null.
  linksStore.setEditorTrip(null)
  action.value = null
  // notification
  store.changeNotification(
    { text: $gettext('modification applied'), autoClose: true, color: 'success' })
}
function abortChanges () {
  // unselect a trip for edition. nothing to commit on link here.
  // put editTrip and action to null.
  linksStore.setEditorTrip(null)
  action.value = null
  // notification
  store.changeNotification({ text: $gettext('modification aborted'), autoClose: true })
}
function deleteButton (selection) {
  // could be a trip, or a roadLinks group
  tripToDelete.value = selection.trip
  message.value = selection.message
  action.value = selection.action
  deleteDialog.value = true
}

function duplicate () {
  if (linksStore.tripId.includes(cloneObj.value.name)) {
    errorMessage.value = 'already exist'
  } else {
    linksStore.cloneTrip({
      tripId: cloneObj.value.trip,
      name: cloneObj.value.name,
      cloneNodes: cloneObj.value.nodes,
      reverse: cloneObj.value.reverse,
    })
    errorMessage.value = ''
    cloneDialog.value = false
  }
}

function cloneButton (selection) {
  cloneObj.value.trip = selection.trip
  message.value = selection.message
  // this.action = 'cloneTrip'
  cloneObj.value.name = selection.trip + ' copy'
  cloneDialog.value = true
}

function cancelClone () {
  errorMessage.value = ''
  cloneDialog.value = false
}

</script>
<template>
  <section
    class="map-view"
  >
    <LinksEditDialog v-if="dialogType === 'pt'" />
    <RoadsEditDialog v-else-if="dialogType === 'road'" />

    <EditDialog
      v-model:show-dialog="showDialog"
      v-model:editor-form="editorForm"
      :mode="mode"
      :action="action"
      :link-dir="linkDir"
      @apply-action="applyAction"
      @cancel-action="cancelAction"
    />

    <v-dialog
      v-model="deleteDialog"
      scrollable
      persistent
      max-width="20rem"
    >
      <v-card max-height="55rem">
        <v-card-title class="text-h5">
          {{ $gettext("Delete") + ' '+ message + '?' }}
        </v-card-title>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelAction"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="success"
            variant="text"
            @click="applyAction"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="cloneDialog"
      max-width="20rem"
      persistent
    >
      <v-card>
        <v-card-text>
          <span class="text-h6">
            {{ $gettext('Duplicate') + ' ' + message + ' ?' }}</span>
        </v-card-text>
        <v-card-text>
          <v-text-field
            v-model="cloneObj.name"
            :label="$gettext('New name')"
          />
          <v-checkbox-btn
            v-model="cloneObj.reverse"
            :label="$gettext('reverse')"
          />
          <v-checkbox-btn
            v-model="cloneObj.nodes"
            :label="$gettext('duplicate nodes')"
          />
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelClone"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green-darken-1"
            variant="text"
            @click="duplicate()"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SidePanel
      @confirm-changes="confirmChanges"
      @abort-changes="abortChanges"
      @delete-button="deleteButton"
      @clone-button="cloneButton"
      @properties-button="actionClick"
      @schedule-button="actionClick"
      @change-mode="(e) => mode = e"
    />
    <Map
      :mode="mode"
      @click-feature="actionClick"
    />
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: 100%;
  width: 100%;
  display: flex;
}

</style>
