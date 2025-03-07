<script setup>
// const SidePanel = defineAsyncComponent(() => import('@comp/map/sidePanel/SidePanel.vue'))
// const Map = defineAsyncComponent(() => import('@comp/map/Map.vue'))
import SidePanel from '@comp/map/sidePanel/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import EditDialog from '@comp/map/EditDialog.vue'
import EditScheduleDialog from '@comp/map/EditScheduleDialog.vue'
import { getGroupForm } from '@comp/utils/utils.js'
import { cloneDeep } from 'lodash'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'

import { ref, onUnmounted } from 'vue'
import { isScheduleTrip } from '../components/utils/utils'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()
const editorForm = ref({})
const mode = ref('pt')
const action = ref(null)

onUnmounted(() => {
  linksStore.setEditorTrip({ tripId: null, changeBounds: false })
  if (store.anchorMode) { store.changeAnchorMode() }
  if (store.cyclewayMode) { store.changeCyclewayMode() }
})

const showDialog = ref(false)
const scheduleDialog = ref(false)

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
const groupTripIds = ref([])
const linkDir = ref([])

function actionClick (event) {
  action.value = event.action
  lingering.value = (Object.keys(event).includes('lingering')) ? event.lingering : lingering.value

  if (action.value === 'Edit Line Info') {
    const lineAttributes = linksStore.lineAttributes
    const features = linksStore.editorLinks.features.length === 0
      ? cloneDeep(linksStore.defaultLink)
      : linksStore.editorLinks.features
    let uneditable = ['index', 'length', 'time', 'a', 'b', 'link_sequence', 'anchors', 'departures', 'arrivals']
    if (isScheduleTrip(features[0])) { uneditable = [...uneditable, 'speed'] }
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit Line Schedule') {
    scheduleDialog.value = true
  } else if (action.value === 'Edit Group Info') {
    groupTripIds.value = new Set(event.tripIds)
    const lineAttributes = linksStore.lineAttributes
    const features = linksStore.links.features.filter(link => groupTripIds.value.has(link.properties.trip_id))
    // eslint-disable-next-line max-len
    let uneditable = ['index', 'length', 'time', 'a', 'b', 'link_sequence', 'trip_id', 'anchors', 'departures', 'arrivals']
    // should check everything. could edit group with and without Schedules... so user  change speed if they want
    // if (isScheduleTrip(features[0])) { uneditable = [...uneditable, ...['speed', ]] }
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit Link Info') {
    // link is clicked on the map
    selectedLink.value = event.selectedFeature.properties
    const lineAttributes = linksStore.lineAttributes
    const features = linksStore.editorLinks.features.filter(
      (link) => link.properties.index === selectedLink.value.index)
    let uneditable = ['a', 'b', 'index', 'length', 'link_sequence', 'trip_id', 'anchors', 'departures', 'arrivals']
    if (isScheduleTrip(features[0])) { uneditable = [...uneditable, ...['speed', 'time']] }
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit rLink Info') {
    selectedLink.value = event.selectedIndex
    editorForm.value = selectedLink.value.map(linkId => rlinksStore.rlinksForm(linkId))
    linkDir.value = rlinksStore.rlinkDirection(selectedLink.value)
    event.selectedIndex.forEach(linkId => {
      if (rlinksStore.onewayIndex.has(linkId)) {
        selectedLink.value.push(linkId)
        editorForm.value.push(rlinksStore.reversedrLinksForm(linkId))
        linkDir.value.push(rlinksStore.rlinkDirection(selectedLink.value, true))
      }
    })
    showDialog.value = true
  } else if (action.value === 'Edit OD Info') {
    selectedLink.value = event.selectedIndex[0]
    editorForm.value = ODStore.linkForm(selectedLink.value)
    showDialog.value = true
  } else if (action.value === 'Edit Road Group Info') {
    const features = rlinksStore.grouprLinks(event.category, event.group)
    selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
    const lineAttributes = rlinksStore.rlineAttributes
    const uneditable = ['index', 'length', 'time', 'a', 'b']
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit selected Info') {
    selectedLink.value = rlinksStore.rlinks.features.filter(link => event.selectedIndex.has(link.properties.index))
    const lineAttributes = rlinksStore.rlineAttributes
    const uneditable = ['index', 'length', 'time', 'a', 'b']
    editorForm.value = getGroupForm(selectedLink.value, lineAttributes, uneditable)
    showDialog.value = true
  } else if (action.value === 'Edit Visible Road Info') {
    const features = rlinksStore.visiblerLinks.features
    selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
    const lineAttributes = rlinksStore.rlineAttributes
    const uneditable = ['index', 'length', 'time', 'a', 'b']
    editorForm.value = getGroupForm(features, lineAttributes, uneditable)
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
  } else if (['Edit Node Info', 'Edit rNode Info'].includes(action.value)) {
    selectedNode.value = event.selectedFeature.properties
    // map selected node doesnt not return properties with nanulln value.
    // we need to get the node in the store with the selected index.
    if (action.value === 'Edit Node Info') {
      editorForm.value = linksStore.editorNodes.features.filter(
        (node) => node.properties.index === selectedNode.value.index)
    } else if (action.value === 'Edit rNode Info') {
      editorForm.value = rlinksStore.visiblerNodes.features.filter(
        (node) => node.properties.index === selectedNode.value.index)
    }
    editorForm.value = editorForm.value[0].properties
    // filter properties to only the one that are editable.
    const uneditable = ['index', 'route_width']
    const filtered = Object.keys(editorForm.value)
      .reduce((obj, key) => {
        obj[key] = {
          value: editorForm.value[key],
          disabled: uneditable.includes(key),
          placeholder: false,
        }
        return obj
      }, {})
    editorForm.value = filtered
    showDialog.value = true
  } else if (action.value === 'Delete OD') {
    selectedIndex.value = event.selectedIndex
    applyAction()
  }
}

function applyAction () {
  // click yes on dialog
  showDialog.value = false
  scheduleDialog.value = false
  deleteDialog.value = false
  switch (action.value) {
    case 'Edit Link Info':
      linksStore.editLinkInfo({ selectedLinkId: selectedLink.value.index, info: editorForm.value })
      break
    case 'Edit Node Info':
      linksStore.editNodeInfo({ selectedNodeId: selectedNode.value.index, info: editorForm.value })
      break
      // case 'Edit Line Info': was move directly to the editDialog for toggle
    case 'Edit Group Info':
      linksStore.editGroupInfo({ groupTripIds: groupTripIds.value, info: editorForm.value })
      break
    case 'Edit rLink Info':
      rlinksStore.editrLinkInfo({ selectedLinkId: selectedLink.value, info: editorForm.value })
      break
    case 'Edit Road Group Info':
      rlinksStore.editrGroupInfo({ selectedLinks: selectedLink.value, info: editorForm.value })
      break
    case 'Edit selected Info':
      rlinksStore.editrGroupInfo({ selectedLinks: selectedLink.value, info: editorForm.value })
      break
    case 'Edit Visible Road Info':
      rlinksStore.editrGroupInfo({
        selectedLinks: rlinksStore.visiblerLinks.features,
        info: editorForm.value,
      })
      break
    case 'Edit OD Group Info':
      ODStore.editGroupInfo({ selectedLinks: selectedLink.value, info: editorForm.value })
      break
    case 'Edit Visible OD Info':
      ODStore.editGroupInfo({
        selectedLinks: ODStore.visibleLayer.features,
        info: editorForm.value,
      })
      break
    case 'Edit rNode Info':
      rlinksStore.editrNodeInfo({ selectedNodeId: selectedNode.value.index, info: editorForm.value })
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
  scheduleDialog.value = false
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
  linksStore.setEditorTrip({ tripId: null, changeBounds: false })
  action.value = null
  // notification
  store.changeNotification(
    { text: $gettext('modification applied'), autoClose: true, color: 'success' })
}
function abortChanges () {
  // unselect a trip for edition. nothing to commit on link here.
  // put editTrip and action to null.
  linksStore.setEditorTrip({ tripId: null, changeBounds: false })
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

function toggleSchedule(event) {
  showDialog.value = false
  scheduleDialog.value = false
  actionClick(event)
}

</script>
<template>
  <section
    class="map-view"
  >
    <EditDialog
      v-model:show-dialog="showDialog"
      v-model:editor-form="editorForm"
      :mode="mode"
      :action="action"
      :link-dir="linkDir"
      @toggle="toggleSchedule( { action: 'Edit Line Schedule'})"
      @applyAction="applyAction"
      @cancelAction="cancelAction"
    />
    <EditScheduleDialog
      v-model="scheduleDialog"
      @toggle="toggleSchedule( { action: 'Edit Line Info' })"
      @cancelAction="cancelAction"
      @applyAction="applyAction"
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
      @confirmChanges="confirmChanges"
      @abortChanges="abortChanges"
      @deleteButton="deleteButton"
      @cloneButton="cloneButton"
      @propertiesButton="actionClick"
      @scheduleButton="actionClick"
      @change-mode="(e) => mode = e"
    />
    <Map
      :mode="mode"
      @clickFeature="actionClick"
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
