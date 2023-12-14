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

import { computed, ref, onUnmounted } from 'vue'

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

    const numLinks = computed(() => { return Array.isArray(editorForm.value) ? editorForm.value.length : 1 })
    const attributesChoices = computed(() => {
      if (['pt', 'road'].includes(mode.value)) {
        return store.attributesChoices[mode.value]
      } else { return {} }
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

    return {
      store,
      linksStore,
      rlinksStore,
      ODStore,
      editorForm,
      mode,
      action,
      numLinks,
      attributesChoices,
      editForm,
    }
  },
  data () {
    return {
      editorTrip: null,
      selectedNode: null,
      selectedLink: null,
      selectedIndex: null,
      showDialog: false,
      cloneDialog: false,
      cursorPosition: [],
      tripToDelete: null,
      tripToClone: null,
      message: '',
      cloneName: null,
      cloneNodes: false,
      errorMessage: null,
      lingering: true,
      groupTripIds: [],
      showHint: false,
      showDeleteOption: false,
      newFieldName: null,
      linkDir: [],
      rules: {
        newField: [
          val => !Object.keys(this.editorForm).includes(val) || this.$gettext('field already exist'),
          val => val !== '' || this.$gettext('cannot add empty field'),
          val => !val?.endsWith('_r') || this.$gettext('field cannot end with _r'),
        ],
      },

      hints: attributesHints,

    }
  },
  watch: {
    showDialog (val) {
      // do not show a notification when dialog is on. sometim its over the confirm button
      if (val) { this.store.changeNotification({ text: '', autoClose: true }) }
      this.showHint = false
      this.showDeleteOption = false
    },

  },
  created () {
    this.editorTrip = this.linksStore.editorTrip
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Control') && (!this.showDialog) && (!this.cloneDialog)) {
        this.store.changeAnchorMode()
      }
    })
  },

  methods: {
    orderedForm (index) {
      // order editor Form in alphatical order
      let form = this.editorForm
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
    },

    actionClick (event) {
      this.action = event.action
      if (this.action === 'Edit Line Info') {
        this.editorForm = cloneDeep(this.linksStore.editorLineInfo)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Group Info') {
        this.groupTripIds = new Set(event.tripIds)
        const uneditable = ['index', 'length', 'a', 'b', 'link_sequence', 'trip_id']
        const lineAttributes = this.linksStore.lineAttributes
        const features = this.linksStore.links.features.filter(
          link => this.groupTripIds.has(link.properties.trip_id))
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Link Info') {
        // link is clicked on the map
        this.selectedLink = event.selectedFeature.properties
        const uneditable = ['a', 'b', 'index', 'link_sequence', 'trip_id']
        const lineAttributes = this.linksStore.lineAttributes
        const features = this.linksStore.editorLinks.features.filter(
          (link) => link.properties.index === this.selectedLink.index)

        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit rLink Info') {
        this.selectedLink = event.selectedIndex
        this.editorForm = this.selectedLink.map(linkId => this.rlinksStore.rlinksForm(linkId))
        this.linkDir = this.rlinksStore.rlinkDirection(this.selectedLink)
        event.selectedIndex.forEach(linkId => {
          if (this.rlinksStore.onewayIndex.has(linkId)) {
            this.selectedLink.push(linkId)
            this.editorForm.push(this.rlinksStore.reversedrLinksForm(linkId))
            this.linkDir.push(this.rlinksStore.rlinkDirection(this.selectedLink, true))
          }
        })
        this.showDialog = true
      } else if (this.action === 'Edit OD Info') {
        this.selectedLink = event.selectedIndex[0]
        this.editorForm = this.ODStore.linkForm(this.selectedLink)
        this.showDialog = true
      } else if (this.action === 'Edit Road Group Info') {
        const features = this.rlinksStore.grouprLinks(event.category, event.group)
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.rlinksStore.rlineAttributes
        const uneditable = ['index', 'length', 'a', 'b']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Visible Road Info') {
        const features = this.rlinksStore.visiblerLinks.features
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.rlinksStore.rlineAttributes
        const uneditable = ['index', 'length', 'a', 'b']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit OD Group Info') {
        const features = this.ODStore.groupLayer(event.category, event.group)
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.ODStore.layerAttributes
        const uneditable = ['index']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Visible OD Info') {
        const features = this.ODStore.visibleLayer.features
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.ODStore.layerAttributes
        const uneditable = ['index']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (['Edit Node Info', 'Edit rNode Info'].includes(this.action)) {
        this.selectedNode = event.selectedFeature.properties
        // map selected node doesnt not return properties with nanulln value.
        // we need to get the node in the store with the selected index.
        if (this.action === 'Edit Node Info') {
          this.editorForm = this.linksStore.editorNodes.features.filter(
            (node) => node.properties.index === this.selectedNode.index)
        } else if (this.action === 'Edit rNode Info') {
          this.editorForm = this.rlinksStore.visiblerNodes.features.filter(
            (node) => node.properties.index === this.selectedNode.index)
        }
        this.editorForm = this.editorForm[0].properties
        // filter properties to only the one that are editable.
        const uneditable = ['index', 'route_width']
        const filtered = Object.keys(this.editorForm)
          .reduce((obj, key) => {
            obj[key] = {
              value: this.editorForm[key],
              disabled: uneditable.includes(key),
              placeholder: false,
            }
            return obj
          }, {})
        this.editorForm = filtered
        this.showDialog = true
      } else if (this.action === 'Delete OD') {
        this.selectedIndex = event.selectedIndex
        this.cursorPosition = event.lngLat
        this.applyAction()
      }
    },

    applyAction () {
      // click yes on dialog
      this.showDialog = false
      switch (this.action) {
        case 'Edit Link Info':
          this.linksStore.editLinkInfo({ selectedLinkId: this.selectedLink.index, info: this.editorForm })
          break
        case 'Edit Node Info':
          this.linksStore.editNodeInfo({ selectedNodeId: this.selectedNode.index, info: this.editorForm })
          break
        case 'Edit Line Info':
          // check if trip_id was changed and if it already exist.
          if ((this.editorForm.trip_id.value !== this.linksStore.editorTrip) &&
          this.linksStore.tripId.includes(this.editorForm.trip_id.value)) {
            // reset all. just like abortChanges but without the abort changes notification
            this.lingering = true // if not, applyAction is call after and the notification is overwrite.
            this.editorTrip = null
            this.linksStore.setEditorTrip({ tripId: null, changeBounds: false })
            this.action = null
            this.store.changeNotification({
              text: this.$gettext('Could not apply modification. Trip_id already exist'),
              autoClose: true,
              color: 'red darken-2',
            })
          }
          this.linksStore.editLineInfo(this.editorForm)
          if (this.linksStore.editorNodes.features.length === 0) {
            this.store.changeNotification(
              { text: this.$gettext('Click on the map to start drawing'), autoClose: false })
          }
          break
        case 'Edit Group Info':
          this.linksStore.editGroupInfo({ groupTripIds: this.groupTripIds, info: this.editorForm })
          break
        case 'Edit rLink Info':
          this.rlinksStore.editrLinkInfo({ selectedLinkId: this.selectedLink, info: this.editorForm })
          break
        case 'Edit Road Group Info':
          this.rlinksStore.editrGroupInfo({ selectedLinks: this.selectedLinks, info: this.editorForm })
          break
        case 'Edit Visible Road Info':
          this.rlinksStore.editrGroupInfo({
            selectedLinks: this.rlinksStore.visiblerLinks.features,
            info: this.editorForm,
          })
          break
        case 'Edit OD Group Info':
          this.ODStore.editGroupInfo({ selectedLinks: this.selectedLinks, info: this.editorForm })
          break
        case 'Edit Visible OD Info':
          this.ODStore.editGroupInfo({
            selectedLinks: this.ODStore.visibleLayer.features,
            info: this.editorForm,
          })
          break
        case 'Edit rNode Info':
          this.rlinksStore.editrNodeInfo({ selectedNodeId: this.selectedNode.index, info: this.editorForm })
          break
        case 'Edit OD Info':
          this.ODStore.editLinkInfo({ selectedLinkId: this.selectedLink, info: this.editorForm })
          break
        case 'deleteTrip':
          this.linksStore.deleteTrip(this.tripToDelete)
          break
        case 'deleterGroup':
          this.rlinksStore.deleterGroup(this.tripToDelete)
          break
        case 'Delete OD':
          this.ODStore.deleteOD({ selectedIndex: this.selectedIndex })
          break
        case 'deleteODGroup':
          this.ODStore.deleteGroup(this.tripToDelete)
          break
      }
      if (!this.lingering) {
        this.confirmChanges()
        this.lingering = true
      }
    },
    cancelAction () {
      this.showDialog = false
      if (!this.lingering) {
        this.abortChanges()
        this.lingering = true
      }
    },
    confirmChanges () {
      // confirm changes on sidePanel, this overwrite Links in store.
      this.linksStore.confirmChanges()
      // put editTrip and action to null.
      this.editorTrip = null
      this.linksStore.setEditorTrip({ tripId: null, changeBounds: false })
      this.action = null
      // notification
      this.store.changeNotification(
        { text: this.$gettext('modification applied'), autoClose: true, color: 'success' })
    },
    abortChanges () {
      // unselect a trip for edition. nothing to commit on link here.
      // put editTrip and action to null.
      this.editorTrip = null
      this.linksStore.setEditorTrip({ tripId: null, changeBounds: false })
      this.action = null
      // notification
      this.store.changeNotification({ text: this.$gettext('modification aborted'), autoClose: true })
    },
    deleteButton (selection) {
      // could be a trip, or a roadLinks group
      this.tripToDelete = selection.trip
      this.message = selection.message
      this.action = selection.action
      this.showDialog = true
    },

    duplicate () {
      if (this.linksStore.tripId.includes(this.cloneName)) {
        this.errorMessage = 'already exist'
      } else {
        this.linksStore.cloneTrip({ tripId: this.tripToClone, name: this.cloneName, cloneNodes: this.cloneNodes })
        this.errorMessage = ''
        this.cloneDialog = false
      }
    },

    cloneButton (selection) {
      this.tripToClone = selection.trip
      this.message = selection.message
      // this.action = 'cloneTrip'
      this.cloneName = selection.trip + ' copy'
      this.cloneDialog = true
    },

    cancelClone () {
      this.errorMessage = ''
      this.cloneDialog = false
    },
    addField () {
      let form = {}
      if (Array.isArray(this.editorForm)) {
        form = cloneDeep(this.editorForm[0])
      } else {
        form = cloneDeep(this.editorForm)
      }
      // do not append if its null, empty or already exist.

      if ((Object.keys(form).includes(this.newFieldName)) | (this.newFieldName === '') |
       (!this.newFieldName) | (this.newFieldName?.endsWith('_r'))) {
        // put ' ' so the rule error is diplayed.
        this.newFieldName = ''
      } else {
        // need to rewrite editorForm object to be updated in DOM
        if (Array.isArray(this.editorForm)) {
          const tempArr = cloneDeep(this.editorForm)
          tempArr.forEach(el => {
            // if its a reverse link. only add it to the form if its not an excluded one
            // (ex: route_width, no route_width_r)
            if (Object.keys(el)[0].endsWith('_r')) {
              if (!this.rlinksStore.rcstAttributes.includes(this.newFieldName)) {
                el[this.newFieldName + '_r'] = { disabled: false, placeholder: false, value: undefined }
              }
            } else { // normal link. add the new field to the list.
              el[this.newFieldName] = { disabled: false, placeholder: false, value: undefined }
            }
          })
          this.editorForm = null
          this.editorForm = tempArr
        } else {
          form[this.newFieldName] = { disabled: false, placeholder: false, value: undefined }
          this.editorForm = {}
          this.editorForm = form
        }

        if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(this.action)) {
          this.linksStore.addPropertie({ name: this.newFieldName, table: 'links' })
        } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(this.action)) {
          this.rlinksStore.addRoadPropertie({ name: this.newFieldName, table: 'rlinks' })
        } else if (this.action === 'Edit Node Info') {
          this.linksStore.addPropertie({ name: this.newFieldName, table: 'nodes' })
        } else if (this.action === 'Edit rNode Info') {
          this.rlinksStore.addRoadPropertie({ name: this.newFieldName, table: 'rnodes' })
        } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(this.action)) {
          this.ODStore.addPropertie(this.newFieldName)
        }
        this.newFieldName = null // null so there is no rules error.
        this.store.changeNotification({ text: this.$gettext('Field added'), autoClose: true, color: 'success' })
      }
    },
    deleteField (field) {
      let form = cloneDeep(this.editorForm)
      // if roadLinks.
      if (Array.isArray(this.editorForm)) {
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
      this.editorForm = {}
      this.editorForm = form

      if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(this.action)) {
        this.linksStore.deletePropertie({ name: field, table: 'links' })
      } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(this.action)) {
        this.rlinksStore.deleteRoadPropertie({ name: field, table: 'rlinks' })
      } else if (this.action === 'Edit Node Info') {
        this.linksStore.deletePropertie({ name: field, table: 'nodes' })
      } else if (this.action === 'Edit rNode Info') {
        this.rlinksStore.deleteRoadPropertie({ name: field, table: 'rnodes' })
      } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(this.action)) {
        this.ODStore.deletePropertie({ name: field })
      }
      this.store.changeNotification({ text: this.$gettext('Field deleted'), autoClose: true, color: 'success' })
    },
    attributeNonDeletable (field) {
      if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info', 'Edit Node Info'].includes(this.action)) {
        return this.linksStore.defaultAttributesNames.includes(field)
      } else {
        return this.rlinksStore.rundeletable.includes(field)
      }
    },
    ToggleDeleteOption () {
      this.showDeleteOption = !this.showDeleteOption

      if (this.showDeleteOption) {
        this.store.changeNotification({
          text: this.$gettext('This action will delete properties on every links (and reversed one for two-way roads)'),
          autoClose: false,
          color: 'warning',
        })
      } else {
        this.store.changeNotification({ text: '', autoClose: true })
      }
    },

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
      @keydown.enter="applyAction"
      @keydown.esc="cancelAction"
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
