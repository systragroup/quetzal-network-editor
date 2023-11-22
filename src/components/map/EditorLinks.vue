<script>
import { MglPopup, MglImageLayer, MglGeojsonLayer } from 'vue-mapbox'
import { useIndexStore } from '@src/store/index'

import { useLinksStore } from '@src/store/links'

import { computed } from 'vue'
const $gettext = s => s

export default {
  name: 'EditorLinks',
  components: {
    MglPopup,
    MglImageLayer,
    MglGeojsonLayer,
  },
  props: ['map'],
  events: ['clickFeature', 'onHover', 'offHover'],
  setup () {
    const store = useIndexStore()

    const linksStore = useLinksStore()
    const anchorMode = computed(() => { return store.anchorMode })
    const anchorNodes = computed(() => { return anchorMode.value ? linksStore.anchorNodes : linksStore.nodesHeader })

    return { store, linksStore, anchorMode, anchorNodes }
  },
  data () {
    return {
      selectedFeature: null,
      hoveredStateId: null,
      disablePopup: false,
      keepHovering: false,
      dragNode: false,
      popupEditor: {
        coordinates: [0, 0],
        showed: false,
        content: null,
      },
      contextMenu: {
        coordinates: [0, 0],
        showed: false,
        actions: [],
        feature: null,
        type: null, // link of node
      },
    }
  },

  methods: {
    selectClick (event) {
      if (this.hoveredStateId !== null) {
        // Get the highlighted feature
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        // Emit a click base on layer type (node or link)

        if (this.selectedFeature !== null) {
          if (this.hoveredStateId.layerId === 'editorLinks') {
            const action = this.anchorMode ? 'Add Anchor Inline' : 'Add Stop Inline'
            const click = {
              selectedFeature: this.selectedFeature,
              action,
              lngLat: event.mapboxEvent.lngLat,
            }
            this.$emit('clickFeature', click)
          }
        }
      }
    },
    onCursor (event) {
      if (this.hoveredStateId === null || this.hoveredStateId.layerId === 'editorLinks') {
        this.map.getCanvas().style.cursor = 'pointer'
        if (this.hoveredStateId !== null) {
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
            { hover: false },
          )
        }
        this.hoveredStateId = { layerId: event.layerId, id: event.mapboxEvent.features[0].id }
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
          { hover: true },
        )
        if (!this.disablePopup & !this.anchorMode) {
          this.popupEditor.coordinates = [event.mapboxEvent.lngLat.lng,
            event.mapboxEvent.lngLat.lat,
          ]
          this.popupEditor.content = this.hoveredStateId.id
          this.popupEditor.showed = true
        }
      }
      this.$emit('onHover', { selectedId: this.hoveredStateId.id })
    },
    offCursor (event) {
      if (this.hoveredStateId !== null) {
        // eslint-disable-next-line max-len
        if (!(['editorNodes', 'anchorNodes'].includes(this.hoveredStateId.layerId) && event?.layerId === 'editorLinks')) {
          // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
          if (this.keepHovering) {
            this.dragNode = true
            this.contextMenu.showed = false
            // normal behaviours, hovering is false
          } else {
            this.map.getCanvas().style.cursor = ''
            this.popupEditor.showed = false
            this.map.setFeatureState(
              { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
              { hover: false },
            )
            this.hoveredStateId = null
            this.$emit('offHover', event)
          }
        }
      }
    },
    contextMenuNode (event) {
      if (this.popupEditor.showed && this.hoveredStateId?.layerId === 'editorNodes') {
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng,
          event.mapboxEvent.lngLat.lat,
        ]
        this.contextMenu.showed = true

        this.contextMenu.type = 'node'
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.contextMenu.feature = features.filter(item => item.id === this.hoveredStateId.id)[0]

        const selectedNode = this.contextMenu.feature.properties.index

        if (selectedNode === this.linksStore.firstNodeId) {
          this.contextMenu.actions =
          [
            $gettext('Edit Node Info'),
            $gettext('Delete Stop'),
          ]
        } else if (selectedNode === this.linksStore.lastNodeId) {
          this.contextMenu.actions =
          [
            $gettext('Edit Node Info'),
            $gettext('Delete Stop'),
          ]
        } else {
          this.contextMenu.actions =
           [
             $gettext('Edit Node Info'),
             $gettext('Cut Before Node'),
             $gettext('Cut After Node'),
             $gettext('Delete Stop'),
           ]
        }
      } else if (this.hoveredStateId?.layerId === 'anchorNodes') {
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)
        const click = {
          selectedFeature: this.selectedFeature[0],
          action: 'Delete Anchor',
          lngLat: null,
        }
        this.$emit('clickFeature', click)
      }
    },

    linkRightClick (event) {
      if (this.hoveredStateId.layerId === 'editorLinks') {
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        const click = {
          selectedFeature: this.selectedFeature,
          action: 'Edit Link Info',
          lngLat: event.mapboxEvent.lngLat,
          lingering: true,
        }
        this.$emit('clickFeature', click)
      }
    },

    actionClick (event) {
      const click = {
        selectedFeature: event.feature,
        action: event.action,
        lngLat: event.coordinates,
      }
      this.$emit('clickFeature', click)

      this.contextMenu.showed = false
      this.contextMenu.type = null
    },

    moveNode (event) {
      if (event.mapboxEvent.originalEvent.button === 0 &
      ['editorNodes', 'anchorNodes'].includes(this.hoveredStateId.layerId)) {
        event.mapboxEvent.preventDefault() // prevent map control
        this.map.getCanvas().style.cursor = 'grab'
        // disable mouseLeave so we stay in hover state.
        this.keepHovering = true
        // get selected node
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]

        // disable popup
        this.disablePopup = true
        this.popupEditor.showed = false
        // get position
        this.map.on('mousemove', this.onMove)
        this.map.on('mouseup', this.stopMovingNode)
      }
    },
    onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (this.map.loaded() && this.dragNode && this.selectedFeature) {
        const click = {
          selectedFeature: this.selectedFeature,
          action: null,
          lngLat: Object.values(event.lngLat),
        }
        if (this.hoveredStateId.layerId === 'anchorNodes') {
          click.action = 'Move Anchor'
          this.$emit('clickFeature', click)
        } else {
          click.action = 'Move Node'
          this.$emit('clickFeature', click)
        }
      }
    },

    stopMovingNode (event) {
      // stop tracking position (moving node.)
      this.map.getCanvas().style.cursor = 'pointer'
      this.map.off('mousemove', this.onMove)
      // enable popup and hovering off back. disable Dragmode
      this.keepHovering = false
      this.dragNode = false
      this.disablePopup = false
      // call offCursor event, if we drag too quickly, it will not be call and the node will stay in hovering mode.
      this.offCursor()
      this.map.off('mouseup', this.stopMovingNode)
      // emit a clickNode with the selected node.
      // this will work with lag as it is the selectedFeature and not the highlighted one.
    },
  },

}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="editorLinks"
      :source="{
        type: 'geojson',
        data: linksStore.editorLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorLinks"
      :layer="{
        type: 'line',
        minzoom: 2,
        paint: {
          'line-color': ['case', ['boolean', anchorMode, false],$vuetify.theme.current.colors.linkssecondary, $vuetify.theme.current.colors.linksprimary],
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0]
        }
      }"
      v-on="anchorMode ? {} : {contextmenu: linkRightClick}"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
    />

    <MglImageLayer
      source-id="editorLinks"
      type="symbol"
      source="editorLinks"
      layer-id="arrow-layer"
      :layer="{
        type: 'symbol',
        minzoom: 5,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 30,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': 0.5,
          'icon-rotate': 90
        },
        paint: {
          'icon-color': ['case', ['boolean', anchorMode, false], $vuetify.theme.current.colors.linkssecondary, $vuetify.theme.current.colors.linksprimary],
        }
      }"
    />

    <MglGeojsonLayer
      source-id="editorNodes"
      :source="{
        type: 'geojson',
        data: linksStore.editorNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': $vuetify.theme.current.colors.accent,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 16, 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        }
      }"
      v-on="anchorMode ? {} : {click: selectClick, contextmenu: contextMenuNode}"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
    />

    <MglGeojsonLayer
      source-id="anchorNodes"
      :source="{
        type: 'geojson',
        data: anchorNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 2,
        paint: {
          'circle-color': '#ffffff',
          'circle-opacity':0.5,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
          'circle-stroke-color': '#2C3E4E',
          'circle-stroke-width': 2,
        },
      }"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
      @contextmenu="contextMenuNode"
    />

    <MglPopup
      :close-button="false"
      :showed="popupEditor.showed"
      :coordinates="popupEditor.coordinates"
      @close="popupEditor.showed=false"
    >
      <span>
        <h3>{{ popupEditor.content }}</h3>
        <hr>
        {{ hoveredStateId?.layerId == 'editorLinks'?
          $gettext("Left click to add a stop"):
          $gettext("Hold left click to drag") }}
        <hr>
        {{ hoveredStateId?.layerId == 'editorLinks'?
          $gettext("Right click to edit properties"):
          $gettext("Right click for context menu") }}
      </span>
    </MglPopup>

    <MglPopup
      :close-button="false"
      :showed="contextMenu.showed"
      :coordinates="contextMenu.coordinates"
      @close="contextMenu.showed=false"
    >
      <span
        @mouseleave="contextMenu.showed=false"
      >
        <v-list
          density="compact"
        >
          <v-list-item>
            <v-list-item
              v-for="action in contextMenu.actions"
              :key="action.id"
            >

              <v-btn
                variant="outlined"
                size="small"
                @click="actionClick({action: action,
                                     feature: contextMenu.feature,
                                     coordinates: contextMenu.coordinates})"
              >
                {{ $gettext(action) }}
              </v-btn>

            </v-list-item>
          </v-list-item>
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
