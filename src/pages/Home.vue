<!-- eslint-disable no-return-assign -->
<script>
import SidePanel from '../components/SidePanel.vue'
import Map from '../components/Map.vue'
import ColorPicker from '../components/utils/ColorPicker.vue'
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
      nodes: {},
      links: {},
      editorTrip: null,
      action: null,
      selectedNode: null,
      selectedLink: null,
      showDialog: false,
      editorForm: {},
      cursorPosition: [],
      tripToDelete: null,
      deleteMessage: '',
      lingering: true,
      groupTripIds: [],
    }
  },
  computed: {
    selectedTrips () { return this.$store.getters.selectedTrips },
  },
  created () {
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes
    this.editorTrip = this.$store.getters.editorTrip
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Control') {
        this.$store.commit('changeAnchorMode')
      }
    })
    // window.addEventListener('keyup', (e) => {
    //  if (e.key === 'Control') {
    //    this.$store.commit('changeAnchorMode')
    //  }
    // })
    this.$store.commit('changeNotification',
      { text: $gettext('double click to edit line, right click to edit line properties'), autoClose: false })
  },

  methods: {

    updateSelectedTrips (val) {
      this.$store.commit('changeSelectedTrips', val)
    },

    actionClick (event) {
      this.action = event.action

      if (this.action === 'Edit Line Info') {
        this.editorForm = structuredClone(this.$store.getters.editorLineInfo)
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Group Info') {
        this.groupTripIds = event.tripIds
        const lineAttributes = this.$store.getters.lineAttributes
        let features = structuredClone(this.$store.getters.links.features)
        features = features.filter(link => this.groupTripIds.includes(link.properties.trip_id))
        const uneditable = []
        const form = {}
        lineAttributes.forEach(key => {
          const val = new Set(features.map(link => link.properties[key]))
          form[key] = {
            value: val.size > 1 ? '' : [...val][0],
            disabled: uneditable.includes(key),
            placeholder: val.size > 1,
          }
        })

        delete form.trip_id

        this.editorForm = form
        this.lingering = event.lingering
        this.showDialog = true
      } else if (this.action === 'Edit Link Info') {
        // link is clicked on the map
        this.selectedLink = event.selectedFeature.properties
        // map selected link doesnt return properties with null value. we need
        // to get the links in the store with the selected index.
        this.editorForm = this.$store.getters.editorLinks.features.filter(
          (link) => link.properties.index === this.selectedLink.index)
        this.editorForm = this.editorForm[0].properties

        // filter properties to only the one that are editable.
        const filteredKeys = this.$store.getters.lineAttributes
        const uneditable = ['a', 'b', 'index', 'link_sequence']
        const filtered = Object.keys(this.editorForm)
          .filter(key => !filteredKeys.includes(key))
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
      } else if (this.action === 'Edit Node Info') {
        this.selectedNode = event.selectedFeature.properties
        // map selected node doesnt not return properties with nanulln value.
        // we need to get the node in the store with the selected index.
        this.editorForm = this.$store.getters.editorNodes.features.filter(
          (node) => node.properties.index === this.selectedNode.index)
        this.editorForm = this.editorForm[0].properties

        // filter properties to only the one that are editable.
        const uneditable = ['index']
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
      } else if (['Cut Line From Node', 'Cut Line At Node', 'Move Stop', 'Delete Stop'].includes(this.action)) {
        this.selectedNode = event.selectedFeature.properties
        this.applyAction()
      } else if (['Add Stop Inline', 'Add Anchor Inline'].includes(this.action)) {
        this.selectedLink = event.selectedFeature.properties
        this.cursorPosition = event.lngLat
        this.applyAction()
      }
    },

    applyAction () {
      // click yes on dialog
      this.showDialog = false
      switch (this.action) {
        case 'Cut Line From Node':
          this.$store.commit('cutLineFromNode', { selectedNode: this.selectedNode })
          break
        case 'Cut Line At Node':
          this.$store.commit('cutLineAtNode', { selectedNode: this.selectedNode })
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
      this.tripToDelete = selection.trip
      this.deleteMessage = selection.message
      this.action = 'deleteTrip'
      this.showDialog = true
    },

  },
}
</script>
<template>
  <section class="map-view">
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="290"
      @keydown.enter="applyAction"
      @keydown.esc="cancelAction"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ action == 'deleteTrip'? $gettext("Delete") + ' '+ deleteMessage + '?': $gettext("Edit Properties") }}
        </v-card-title>

        <v-card-text v-if="['Edit Line Info', 'Edit Link Info', 'Edit Node Info','Edit Group Info'].includes(action)">
          <v-container>
            <v-col cols="12">
              <v-text-field
                v-for="(value, key) in editorForm"
                :key="key"
                v-model="value['value']"
                :label="key"
                :placeholder="value['placeholder']? $gettext('multiple Values'):''"
                :persistent-placeholder=" value['placeholder']? true:false "
                :disabled="value['disabled']"
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
            </v-col>
          </v-container>
        </v-card-text>

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

    <SidePanel
      :selected-trips="selectedTrips"
      @update-tripList="updateSelectedTrips"
      @confirmChanges="confirmChanges"
      @abortChanges="abortChanges"
      @deleteButton="deleteButton"
      @propertiesButton="actionClick"
    />
    <Map
      :selected-trips="selectedTrips"
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
