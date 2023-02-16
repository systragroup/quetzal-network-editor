<!-- eslint-disable no-return-assign -->
<script>
import SidePanel from '../components/SidePanel.vue'
import Map from '../components/Map.vue'
import ColorPicker from '../components/utils/ColorPicker.vue'
import { getGroupForm } from '../components/utils/utils.js'

// only used to force to see translation to vue-gettext
const $gettext = s => s

export default {
  name: 'Home',
  components: {
    Map,
    SidePanel,
    ColorPicker,
  },
  data () {
    return {
      editorTrip: null,
      action: null,
      selectedNode: null,
      selectedLink: null,
      selectedIndex: null,
      showDialog: false,
      editorForm: {},
      cursorPosition: [],
      tripToDelete: null,
      tripToClone: null,
      deleteMessage: '',
      cloneName: null,
      cloneMessage: '',
      errorMessage: null,
      lingering: true,
      groupTripIds: [],
      selectedTab: 0,
      isRoadMode: false,
    }
  },
  computed: {
    selectedTrips () { return this.$store.getters.selectedTrips },
    selectedrGroup () { return this.$store.getters.selectedrGroup },
    orderedForm () {
      // order editor Form in alphatical order
      let form = this.editorForm
      // if we have tab. there is a list of form
      if (form.length >= 1) {
        form = form[this.selectedTab]
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
  },
  watch: {

  },
  created () {
    this.editorTrip = this.$store.getters.editorTrip
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Control') {
        this.$store.commit('changeAnchorMode')
      }
    })
  },

  methods: {

    updateSelectedTrips (event) {
      if (event.type === 'links') {
        this.$store.commit('changeSelectedTrips', event.data)
      } else if (event.type === 'rlinks') {
        this.$store.commit('changeVisibleRoads', event.data)
      }
    },

    actionClick (event) {
      this.action = event.action
      if (this.action === 'Edit Line Info') {
        this.editorForm = structuredClone(this.$store.getters.editorLineInfo)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Group Info') {
        this.groupTripIds = event.tripIds
        const uneditable = ['index', 'length', 'a', 'b', 'link_sequence', 'trip_id']
        const lineAttributes = this.$store.getters.lineAttributes
        const features = structuredClone(this.$store.getters.links.features.filter(
          link => this.groupTripIds.includes(link.properties.trip_id)))

        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Link Info') {
        // link is clicked on the map
        this.selectedLink = event.selectedFeature.properties
        const uneditable = ['a', 'b', 'index', 'link_sequence', 'trip_id']
        const lineAttributes = this.$store.getters.lineAttributes
        const features = this.$store.getters.editorLinks.features.filter(
          (link) => link.properties.index === this.selectedLink.index)

        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit rLink Info') {
        this.selectedLink = event.selectedIndex
        this.selectedTab = 0

        this.editorForm = this.selectedLink.map(linkId => this.$store.getters.rlinksForm(linkId))
        this.showDialog = true
      } else if (this.action === 'Edit Road Group Info') {
        const features = this.$store.getters.grouprLinks(event.category, event.group)
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.$store.getters.rlineAttributes
        const uneditable = ['index', 'length', 'a', 'b']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Visible Road Info') {
        const features = this.$store.getters.visiblerLinks.features
        this.selectedLinks = features // this is an observer. modification will be applied to it in next commit.
        const lineAttributes = this.$store.getters.rlineAttributes
        const uneditable = ['index', 'length', 'a', 'b']
        this.editorForm = getGroupForm(features, lineAttributes, uneditable)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (['Edit Node Info', 'Edit rNode Info'].includes(this.action)) {
        this.selectedNode = event.selectedFeature.properties
        // map selected node doesnt not return properties with nanulln value.
        // we need to get the node in the store with the selected index.
        if (this.action === 'Edit Node Info') {
          this.editorForm = this.$store.getters.editorNodes.features.filter(
            (node) => node.properties.index === this.selectedNode.index)
        } else if (this.action === 'Edit rNode Info') {
          this.editorForm = this.$store.getters.visiblerNodes.features.filter(
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
      } else if (['Cut Before Node', 'Cut After Node',
        'Move Stop', 'Delete Stop', 'Delete Anchor', 'Delete Road Anchor'].includes(this.action)) {
        this.selectedNode = event.selectedFeature.properties
        this.applyAction()
      } else if (['Add Stop Inline', 'Add Anchor Inline'].includes(this.action)) {
        this.selectedLink = event.selectedFeature.properties
        this.cursorPosition = event.lngLat
        this.applyAction()
      } else if (['Add Road Node Inline', 'Add Road Anchor Inline', 'Delete rLink'].includes(this.action)) {
        this.selectedIndex = event.selectedIndex
        this.cursorPosition = event.lngLat
        this.applyAction()
      } else if (['Move Node', 'Move Anchor', 'Move rNode', 'Move rAnchor'].includes(this.action)) {
        this.selectedNode = event.selectedFeature
        this.cursorPosition = event.lngLat
        this.applyAction()
      }
    },

    applyAction () {
      // click yes on dialog
      this.showDialog = false
      switch (this.action) {
        case 'Cut Before Node':
          this.$store.commit('cutLineAtNode', { selectedNode: this.selectedNode })
          break
        case 'Cut After Node':
          this.$store.commit('cutLineFromNode', { selectedNode: this.selectedNode })
          break
        case 'Delete Stop':
          this.$store.commit('deleteNode', { selectedNode: this.selectedNode })
          break
        case 'Edit Link Info':
          this.$store.commit('editLinkInfo', { selectedLinkId: this.selectedLink.index, info: this.editorForm })
          break
        case 'Edit Node Info':
          this.$store.commit('editNodeInfo', { selectedNodeId: this.selectedNode.index, info: this.editorForm })
          break
        case 'Edit Line Info':
          // check if trip_id was changed and if it already exist.
          if ((this.editorForm.trip_id.value !== this.$store.getters.editorTrip) &&
          this.$store.getters.tripId.includes(this.editorForm.trip_id.value)) {
            // reset all. just like abortChanges but without the abort changes notification
            this.lingering = true // if not, applyAction is call after and the notification is overwrite.
            this.editorTrip = null
            this.$store.commit('setEditorTrip', { tripId: null, changeBounds: false })
            this.action = null
            this.$store.commit('changeNotification', {
              text: $gettext('Could not apply modification. Trip_id already exist'),
              autoClose: true,
              color: 'red darken-2',
            })
          }
          this.$store.commit('editLineInfo', this.editorForm)
          break
        case 'Edit Group Info':
          this.$store.commit('editGroupInfo', { groupTripIds: this.groupTripIds, info: this.editorForm })
          break
        case 'deleteTrip':
          this.$store.commit('deleteTrip', this.tripToDelete)
          break
        case 'Add Stop Inline':
          this.$store.commit('addNodeInline', {
            selectedLink: this.selectedLink,
            lngLat: this.cursorPosition,
            nodes: 'editorNodes',
          })
          break
        case 'Add Anchor Inline':
          this.$store.commit('addNodeInline', {
            selectedLink: this.selectedLink,
            lngLat: this.cursorPosition,
            nodes: 'anchorNodes',
          })
          break
        case 'Delete Anchor':
          this.$store.commit('deleteAnchorNode', { selectedNode: this.selectedNode })
          break
        case 'Edit rLink Info':
          this.$store.commit('editrLinkInfo', { selectedLinkId: this.selectedLink, info: this.editorForm })
          break
        case 'Edit Road Group Info':
          this.$store.commit('editrGroupInfo', { selectedLinks: this.selectedLinks, info: this.editorForm })
          this.$refs.mapref.$refs.roadref.getBounds()
          break
        case 'Edit Visible Road Info':
          this.$store.commit('editrVisiblesInfo', { info: this.editorForm })
          this.$refs.mapref.$refs.roadref.getBounds()
          break
        case 'Edit rNode Info':
          this.$store.commit('editrNodeInfo', { selectedNodeId: this.selectedNode.index, info: this.editorForm })
          break
        case 'Add Road Node Inline':
          this.$store.commit('addRoadNodeInline', {
            selectedIndex: this.selectedIndex,
            lngLat: this.cursorPosition,
            nodes: 'rnodes',
          })
          break
        case 'Add Road Anchor Inline':
          this.$store.commit('addRoadNodeInline', {
            selectedIndex: this.selectedIndex,
            lngLat: this.cursorPosition,
            nodes: 'anchorrNodes',
          })
          break
        case 'Move Node':
          this.$store.commit('moveNode', { selectedNode: this.selectedNode, lngLat: this.cursorPosition })
          break
        case 'Move Anchor':
          this.$store.commit('moveAnchor', { selectedNode: this.selectedNode, lngLat: this.cursorPosition })
          break
        case 'Move rNode':
          this.$store.commit('moverNode', { selectedNode: this.selectedNode, lngLat: this.cursorPosition })
          break
        case 'Move rAnchor':
          this.$store.commit('moverAnchor', { selectedNode: this.selectedNode, lngLat: this.cursorPosition })
          break
        case 'Delete Road Anchor':
          this.$store.commit('deleteAnchorrNode', { selectedNode: this.selectedNode })
          break
        case 'Delete rLink':
          this.$store.commit('deleterLink', { selectedIndex: this.selectedIndex })
          break
        case 'deleterGroup':
          this.$store.commit('deleterGroup', this.tripToDelete)
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
      this.$store.commit('confirmChanges')
      // put editTrip and action to null.
      this.editorTrip = null
      this.$store.commit('setEditorTrip', { tripId: null, changeBounds: false })
      this.action = null
      // notification
      this.$store.commit('changeNotification',
        { text: $gettext('modification applied'), autoClose: true, color: 'success' })
    },
    abortChanges () {
      // unselect a trip for edition. nothing to commit on link here.
      // put editTrip and action to null.
      this.editorTrip = null
      this.$store.commit('setEditorTrip', { tripId: null, changeBounds: false })
      this.action = null
      // notification
      this.$store.commit('changeNotification', { text: $gettext('modification aborted'), autoClose: true })
    },
    deleteButton (selection) {
      // could be a trip, or a roadLinks group
      this.tripToDelete = selection.trip
      this.deleteMessage = selection.message
      this.action = selection.action
      this.showDialog = true
    },

    duplicate (selection) {
      const propsList = []
      const variables = this.$store.getters.tripId
      variables.forEach(link => propsList.push(link))
      if (propsList.includes(this.cloneName)) {
        this.errorMessage = 'already exist'
      } else {
        this.$store.commit('cloneTrip',  { tripId: this.tripToClone, name: this.cloneName })
        this.input = ''
        this.errorMessage = ''
        this.dialog = false
      }
    },

    cloneButton (selection) {
      this.tripToClone = selection.trip
      this.cloneMessage = selection.message
      //this.action = 'cloneTrip'
      this.cloneName = selection.trip + ' copy'
      this.dialog = true
    },

    cancel () {
      this.errorMessage = ''
      this.dialog = false
    },


  },
}
</script>
<template>
  <section class="map-view">
    <v-dialog
      v-model="showDialog"
      scrollable
      persistent
      max-width="300"
      @keydown.enter="applyAction"
      @keydown.esc="cancelAction"
    >
      <v-card
        max-height="60rem"
      >
        <v-tabs
          v-if=" (editorForm.length > 1) "
          v-model="selectedTab"
          grow
        >
          <v-tab
            v-for="link in selectedLink"
            :key="link"
          >
            {{ link }}
          </v-tab>
        </v-tabs>
        <v-card-title class="text-h5">
          {{ ['deleteTrip','deleterGroup'].includes(action)? $gettext("Delete") + ' '+ deleteMessage + '?': $gettext("Edit Properties") }}
        </v-card-title>
        <v-divider />
        <v-card-text
          v-if="['Edit Line Info',
                 'Edit Link Info',
                 'Edit Node Info',
                 'Edit Group Info',
                 'Edit rLink Info',
                 'Edit Road Group Info',
                 'Edit Visible Road Info',
                 'Edit rNode Info'].includes(action)"
        >
          <v-list>
            <v-text-field
              v-for="(value, key) in orderedForm"
              :key="key"
              v-model="value['value']"
              :label="key"
              :filled="!value['disabled']"
              :type="$store.getters.attributeType(key)"
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
                  v-model="value['value']"
                />
              </template>
            </v-text-field>
          </v-list>
        </v-card-text>
        <v-card-text v-if="['cloneTrip'].includes(action)">
          <v-text-field
              v-model="cloneName"
              :label= "$gettext('New name')"
            >
          </v-text-field>
        </v-card-text>
        <v-divider />

        <v-card-actions>
          <v-spacer />

          <v-btn
            color="grey"
            text
            @click="cancelAction"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="applyAction"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog 
      v-model="dialog" 
      max-width="300"
      @keydown.enter="duplicate({trip:item})"
      @keydown.esc="cancel">
      <v-card>
        <v-card-title>
          <span class="text-h5">Duplicate</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
              v-model="cloneName"
              :label= "$gettext('New name')"
            >
          </v-text-field>
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            text
            @click="cancel"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="duplicate({index:item})"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <SidePanel
      :selected-trips="selectedTrips"
      :selectedr-group="selectedrGroup"
      @update-tripList="updateSelectedTrips"
      @confirmChanges="confirmChanges"
      @abortChanges="abortChanges"
      @deleteButton="deleteButton"
      @cloneButton="cloneButton"
      @propertiesButton="actionClick"
      @isRoadMode="(e) => isRoadMode = e"
    />
    <Map
      ref="mapref"
      :selected-trips="selectedTrips"
      :is-road-mode="isRoadMode"
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
