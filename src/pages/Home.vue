<!-- eslint-disable no-multi-str -->
<!-- eslint-disable no-return-assign -->
<script>
import SidePanel from '@comp/map/SidePanel.vue'
import Map from '@comp/map/Map.vue'
import ColorPicker from '@comp/utils/ColorPicker.vue'
import MenuSelector from '@comp/utils/MenuSelector.vue'
import { getGroupForm } from '@comp/utils/utils.js'
import attributesHints from '@constants/hints.js'
import { cloneDeep } from 'lodash'
// only used to force to see translation to vue-gettext
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '../store/od'

import { computed, ref, watch, onUnmounted, onMounted } from 'vue'
const $gettext = s => s

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Home',
  components: {
    // eslint-disable-next-line vue/no-reserved-component-names
    Map,
    SidePanel,
    ColorPicker,
    MenuSelector,
  },
  setup () {
    const store = useIndexStore()
    const linksStore = useLinksStore()
    const rlinksStore = userLinksStore()
    const ODStore = useODStore()
    const editorForm = ref({})
    const mode = ref('pt')
    const action = ref(null)
    const editorTrip = computed(() => linksStore.editorTrip)

    const numLinks = computed(() => { return Array.isArray(editorForm.value) ? editorForm.value.length : 1 })
    const attributesChoices = computed(() => {
      if (['pt', 'road'].includes(mode.value)) {
        return store.attributesChoices[mode.value]
      } else { return {} }
    })

    onMounted(() => {
      window.addEventListener('keydown', (e) => {
        if ((e.key === 'Control') && (!showDialog.value) && (!cloneDialog.value)) {
          store.changeAnchorMode()
        }
      })
    })

    onUnmounted(() => {
      linksStore.setEditorTrip({ tripId: null, changeBounds: false })
      if (store.anchorMode) { store.changeAnchorMode() }
      if (store.cyclewayMode) { store.changeCyclewayMode() }
    })

    const editForm = computed(() => {
      return ['Edit Line Info',
        'Edit Link Info',
        'Edit Node Info',
        'Edit Group Info',
        'Edit rLink Info',
        'Edit Road Group Info',
        'Edit Visible Road Info',
        'Edit OD Group Info',
        'Edit Visible OD Info',
        'Edit rNode Info',
        'Edit OD Info'].includes(action.value)
    })

    const showDialog = ref(false)
    watch(showDialog, (val) => {
      // do not show a notification when dialog is on. sometime its over the confirm button
      if (val) { store.changeNotification({ text: '', autoClose: true }) }
      showHint.value = false
      showDeleteOption.value = false
    })

    const selectedNode = ref(null)
    const selectedLink = ref(null)
    const selectedIndex = ref(null)
    const cloneDialog = ref(false)
    const tripToDelete = ref(null)
    const tripToClone = ref(null)
    const message = ref('')
    const cloneName = ref(null)
    const cloneNodes = ref(false)
    const errorMessage = ref(null)
    const lingering = ref(true)
    const groupTripIds = ref([])
    const showHint = ref(false)
    const showDeleteOption = ref(false)
    const newFieldName = ref(null)
    const linkDir = ref([])

    const rules = ({
      newField: [
        val => !Object.keys(editorForm.value).includes(val) || $gettext('field already exist'),
        val => val !== '' || $gettext('cannot add empty field'),
        val => !val?.endsWith('_r') || $gettext('field cannot end with _r'),
      ],
    })

    const hints = attributesHints

    function orderedForm (index) {
      // order editor Form in alphatical order
      let form = editorForm.value
      // if we have tab. there is a list of form
      if (form.length >= 1) {
        form = form[index]
      }
      // order keys in alphabetical order, and with disabled last
      const keys = Object.keys(form).filter(key => !form[key].disabled).sort()
      keys.push(...Object.keys(form).filter(key => form[key].disabled).sort())
      const ordered = keys.reduce(
        (obj, key) => {
          obj[key] = form[key]
          return obj
        },
        {},
      )
      return ordered
    }

    function actionClick (event) {
      action.value = event.action
      if (action.value === 'Edit Line Info') {
        editorForm.value = cloneDeep(linksStore.editorLineInfo)
        lingering.value = event.lingering
        showDialog.value = true
      } else if (action.value === 'Edit Group Info') {
        groupTripIds.value = new Set(event.tripIds)
        const uneditable = ['index', 'length', 'a', 'b', 'link_sequence', 'trip_id']
        const lineAttributes = linksStore.lineAttributes
        const features = linksStore.links.features.filter(
          link => groupTripIds.value.has(link.properties.trip_id))
        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
        showDialog.value = true
      } else if (action.value === 'Edit Link Info') {
        // link is clicked on the map
        selectedLink.value = event.selectedFeature.properties
        const uneditable = ['a', 'b', 'index', 'link_sequence', 'trip_id']
        const lineAttributes = linksStore.lineAttributes
        const features = linksStore.editorLinks.features.filter(
          (link) => link.properties.index === selectedLink.value.index)

        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
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
        const uneditable = ['index', 'length', 'a', 'b']
        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
        showDialog.value = true
      } else if (action.value === 'Edit Visible Road Info') {
        const features = rlinksStore.visiblerLinks.features
        selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = rlinksStore.rlineAttributes
        const uneditable = ['index', 'length', 'a', 'b']
        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
        showDialog.value = true
      } else if (action.value === 'Edit OD Group Info') {
        const features = ODStore.groupLayer(event.category, event.group)
        selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = ODStore.layerAttributes
        const uneditable = ['index']
        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
        showDialog.value = true
      } else if (action.value === 'Edit Visible OD Info') {
        const features = ODStore.visibleLayer.features
        selectedLink.value = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = ODStore.layerAttributes
        const uneditable = ['index']
        editorForm.value = getGroupForm(features, lineAttributes, uneditable)
        lingering.value = event.lingering
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
      switch (action.value) {
        case 'Edit Link Info':
          linksStore.editLinkInfo({ selectedLinkId: selectedLink.value.index, info: editorForm.value })
          break
        case 'Edit Node Info':
          linksStore.editNodeInfo({ selectedNodeId: selectedNode.value.index, info: editorForm.value })
          break
        case 'Edit Line Info':
          // check if trip_id was changed and if it already exist.
          if ((editorForm.value.trip_id.value !== linksStore.editorTrip) &&
          linksStore.tripId.includes(editorForm.value.trip_id.value)) {
            // reset all. just like abortChanges but without the abort changes notification
            lingering.value = true // if not, applyAction is call after and the notification is overwrite.
            linksStore.setEditorTrip({ tripId: null, changeBounds: false })
            action.value = null
            store.changeNotification({
              text: $gettext('Could not apply modification. Trip_id already exist'),
              autoClose: true,
              color: 'red darken-2',
            })
          }
          linksStore.editLineInfo(editorForm.value)
          if (linksStore.editorNodes.features.length === 0) {
            store.changeNotification(
              { text: $gettext('Click on the map to start drawing'), autoClose: false })
          }
          break
        case 'Edit Group Info':
          linksStore.editGroupInfo({ groupTripIds: groupTripIds.value, info: editorForm.value })
          break
        case 'Edit rLink Info':
          rlinksStore.editrLinkInfo({ selectedLinkId: selectedLink.value, info: editorForm.value })
          break
        case 'Edit Road Group Info':
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
      showDialog.value = true
    }

    function duplicate () {
      if (linksStore.tripId.includes(cloneName.value)) {
        errorMessage.value = 'already exist'
      } else {
        linksStore.cloneTrip({ tripId: tripToClone.value, name: cloneName.value, cloneNodes: cloneNodes.value })
        errorMessage.value = ''
        cloneDialog.value = false
      }
    }

    function cloneButton (selection) {
      tripToClone.value = selection.trip
      message.value = selection.message
      // this.action = 'cloneTrip'
      cloneName.value = selection.trip + ' copy'
      cloneDialog.value = true
    }

    function cancelClone () {
      errorMessage.value = ''
      cloneDialog.value = false
    }
    function addField () {
      let form = {}
      if (Array.isArray(editorForm.value)) {
        form = cloneDeep(editorForm.value[0])
      } else {
        form = cloneDeep(editorForm.value)
      }
      // do not append if its null, empty or already exist.

      if ((Object.keys(form).includes(newFieldName.value)) | (newFieldName.value === '') |
       (!newFieldName.value) | (newFieldName.value?.endsWith('_r'))) {
        // put ' ' so the rule error is diplayed.
        newFieldName.value = ''
      } else {
        // need to rewrite editorForm object to be updated in DOM
        if (Array.isArray(editorForm.value)) {
          const tempArr = cloneDeep(editorForm.value)
          tempArr.forEach(el => {
            // if its a reverse link. only add it to the form if its not an excluded one
            // (ex: route_width, no route_width_r)
            if (Object.keys(el)[0].endsWith('_r')) {
              if (!rlinksStore.rcstAttributes.includes(newFieldName.value)) {
                el[newFieldName.value + '_r'] = { disabled: false, placeholder: false, value: undefined }
              }
            } else { // normal link. add the new field to the list.
              el[newFieldName.value] = { disabled: false, placeholder: false, value: undefined }
            }
          })
          editorForm.value = null
          editorForm.value = tempArr
        } else {
          form[newFieldName.value] = { disabled: false, placeholder: false, value: undefined }
          editorForm.value = {}
          editorForm.value = form
        }

        if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
          linksStore.addPropertie({ name: newFieldName.value, table: 'links' })
        } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(action.value)) {
          rlinksStore.addRoadPropertie({ name: newFieldName.value, table: 'rlinks' })
        } else if (action.value === 'Edit Node Info') {
          linksStore.addPropertie({ name: newFieldName.value, table: 'nodes' })
        } else if (action.value === 'Edit rNode Info') {
          rlinksStore.addRoadPropertie({ name: newFieldName.value, table: 'rnodes' })
        } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(action.value)) {
          ODStore.addPropertie(newFieldName.value)
        }
        newFieldName.value = null // null so there is no rules error.
        store.changeNotification({ text: $gettext('Field added'), autoClose: true, color: 'success' })
      }
    }
    function deleteField (field) {
      let form = cloneDeep(editorForm.value)
      // if roadLinks.
      if (Array.isArray(editorForm.value)) {
        // if we delete a reverse attribute, change it to normal as _r are deleted with normal one
        if (field.endsWith('_r')) {
          field = field.substr(0, field.length - 2)
        }
        form = form.filter(el => delete el[field])
        form = form.filter(el => delete el[field + '_r'])
      // TC links
      } else {
        delete form[field]
      }
      editorForm.value = {}
      editorForm.value = form

      if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
        linksStore.deletePropertie({ name: field, table: 'links' })
      } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(action.value)) {
        rlinksStore.deleteRoadPropertie({ name: field, table: 'rlinks' })
      } else if (action.value === 'Edit Node Info') {
        linksStore.deletePropertie({ name: field, table: 'nodes' })
      } else if (action.value === 'Edit rNode Info') {
        rlinksStore.deleteRoadPropertie({ name: field, table: 'rnodes' })
      } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(action.value)) {
        ODStore.deletePropertie({ name: field })
      }
      store.changeNotification({ text: $gettext('Field deleted'), autoClose: true, color: 'success' })
    }
    function attributeNonDeletable (field) {
      if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info', 'Edit Node Info'].includes(action.value)) {
        return linksStore.defaultAttributesNames.includes(field)
      } else {
        return rlinksStore.rundeletable.includes(field)
      }
    }
    function ToggleDeleteOption () {
      showDeleteOption.value = !showDeleteOption.value

      if (showDeleteOption.value) {
        store.changeNotification({
          text: $gettext('This action will delete properties on every links (and reversed one for two-way roads)'),
          autoClose: false,
          color: 'warning',
        })
      } else {
        store.changeNotification({ text: '', autoClose: true })
      }
    }

    return {
      orderedForm,
      actionClick,
      applyAction,
      cancelAction,
      confirmChanges,
      abortChanges,
      deleteButton,
      duplicate,
      cloneButton,
      cancelClone,
      addField,
      deleteField,
      attributeNonDeletable,
      ToggleDeleteOption,
      selectedNode,
      selectedLink,
      selectedIndex,
      showDialog,
      cloneDialog,
      tripToDelete,
      tripToClone,
      message,
      cloneName,
      cloneNodes,
      errorMessage,
      lingering,
      groupTripIds,
      showHint,
      showDeleteOption,
      newFieldName,
      linkDir,
      rules,
      hints,
      store,
      linksStore,
      rlinksStore,
      ODStore,
      editorTrip,
      editorForm,
      mode,
      action,
      numLinks,
      attributesChoices,
      editForm,
    }
  },
}
</script>
<template>
  <section
    class="map-view"
  >
    <v-dialog
      v-model="showDialog"
      scrollable
      persistent
      :max-width="numLinks>1? '40rem':'20rem'"
    >
      <v-card
        max-height="55rem"
      >
        <v-card-title class="text-h5">
          {{ ['deleteTrip','deleterGroup'].includes(action)? $gettext("Delete") + ' '+ message + '?': $gettext("Edit Properties") }}
        </v-card-title>
        <v-divider />
        <v-card-text v-if="editForm">
          <v-row>
            <v-col
              v-for="(n,idx) in numLinks"
              :key="idx"
            >
              <v-list>
                <v-list-item v-if="numLinks > 1">
                  <v-icon
                    :style="{'align-items':'center',
                             'justify-content': 'center',
                             transform: 'rotate('+linkDir[idx]+'deg)'}"
                  >
                    fas fa-long-arrow-alt-up
                  </v-icon>
                </v-list-item>
                <v-text-field
                  v-for="(value, key) in orderedForm(idx)"
                  :key="key"
                  v-model="value['value']"
                  :label="key"
                  :hint="showHint? hints[key]: ''"
                  :persistent-hint="showHint"
                  :variant="value['disabled']? 'underlined': 'filled'"
                  :type="linksStore.attributeType(key)"
                  :placeholder="value['placeholder']? $gettext('multiple Values'):''"
                  :persistent-placeholder=" value['placeholder']? true:false "
                  :disabled="value['disabled']"
                  @wheel="$event.target.blur()"
                >
                  <template
                    v-if="key==='route_color'"
                    v-slot:append
                  >
                    <color-picker
                      :pcolor="value['value']"
                      @update:pcolor="val=>value['value']=val"
                    />
                  </template>
                  <template
                    v-else-if="Object.keys(attributesChoices).includes(key)"
                    v-slot:append
                  >
                    <MenuSelector
                      :value="value['value']"
                      :items="attributesChoices[key]"
                      @update:value="val=>value['value']=val"
                    />
                  </template>
                  <template
                    v-if="showDeleteOption"
                    v-slot:prepend
                  >
                    <v-btn
                      variant="text"
                      icon="fas fa-trash small"
                      size="x-small"
                      :disabled="attributeNonDeletable(key)"
                      color="error"
                      @click="()=>deleteField(key)"
                    />
                  </template>
                </v-text-field>
              </v-list>
            </v-col>
          </v-row>
          <v-row>
            <v-text-field
              v-model="newFieldName"
              :label=" $gettext('add field')"
              :placeholder="$gettext('new field name')"
              variant="filled"
              :rules="rules.newField"
              @keydown.enter.stop="addField"
              @wheel="$event.target.blur()"
            >
              <template v-slot:append>
                <v-btn
                  color="primary"
                  icon="fas fa-plus"
                  class="text--primary"
                  size="x-small"
                  @click="addField"
                />
              </template>
            </v-text-field>
          </v-row>
        </v-card-text>
        <v-divider />

        <v-card-actions>
          <v-btn
            v-if="editForm"
            icon
            size="x-small"
            @click="()=>showHint = !showHint"
          >
            <v-icon>far fa-question-circle small</v-icon>
          </v-btn>
          <v-btn
            v-if="editForm"
            icon
            size="x-small"
            @click="ToggleDeleteOption"
          >
            <v-icon v-if="showDeleteOption">
              fas fa-minus-circle fa-rotate-90
            </v-icon>
            <v-icon v-else>
              fas fa-minus-circle
            </v-icon>
          </v-btn>
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
      max-width="300"
      @keydown.enter="duplicate()"
      @keydown.esc="cancelClone"
    >
      <v-card>
        <v-card-text>
          <span class="text-h6">
            {{ $gettext('Duplicate and reverse') + ' ' + message + ' ?' }}</span>
        </v-card-text>
        <v-card-text>
          <v-text-field
            v-model="cloneName"
            :label="$gettext('New name')"
          />
          <v-checkbox-btn
            v-model="cloneNodes"
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
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}

</style>
