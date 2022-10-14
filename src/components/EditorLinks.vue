<script>
import { MglPopup, MglImageLayer, MglGeojsonLayer } from 'vue-mapbox'

export default {
  name: 'EditorLinks',
  components: {
    MglPopup,
    MglImageLayer,
    MglGeojsonLayer,
  },
  props: ['map', 'drawMode'],
  events: ['clickFeature', 'onHover', 'offHover'],
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
  watch: {

    drawMode (val) {
      // set layer visible if drawMode is true
      // check if layer exist. will bug if it is check befere rendering the layer
      if (this.map.getStyle().layers.filter(layer => layer.id === 'drawLink').length > 0) {
        if (val) {
          this.map.setLayoutProperty('drawLink', 'visibility', 'visible')
        } else {
          this.map.setLayoutProperty('drawLink', 'visibility', 'none')
        }
      }
    },

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
            const click = {
              selectedFeature: this.selectedFeature,
              action: 'Add Stop Inline',
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
        if (!this.disablePopup) {
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
        if (!(this.hoveredStateId.layerId === 'editorNodes' && event.layerId === 'editorLinks')) {
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
      if (this.popupEditor.showed && this.hoveredStateId.layerId === 'editorNodes') {
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng,
          event.mapboxEvent.lngLat.lat,
        ]
        this.contextMenu.showed = true

        this.contextMenu.type = 'node'
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.contextMenu.feature = features.filter(item => item.id === this.hoveredStateId.id)[0]

        const selectedNode = this.contextMenu.feature.properties.index

        if (selectedNode === this.$store.getters.firstNodeId) {
          this.contextMenu.actions = ['Edit Node Info',
            'Delete Stop']
        } else if (selectedNode === this.$store.getters.lastNodeId) {
          this.contextMenu.actions = ['Edit Node Info',
            'Delete Stop']
        } else {
          this.contextMenu.actions = ['Edit Node Info',
            'Cut Line From Node',
            'Cut Line At Node',
            'Delete Stop']
        }
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
      if (event.mapboxEvent.originalEvent.button === 0) {
        event.mapboxEvent.preventDefault() // prevent map control
        this.map.getCanvas().style.cursor = 'grab'
        // disable mouseLeave so we stay in hover state.
        this.keepHovering = true
        // get selected node
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        const nodeId = this.selectedFeature.properties.index
        // store default position in history
        const geom = this.$store.getters.editorNodes.features.filter(
          node => node.properties.index === nodeId)[0].geometry.coordinates
        this.$store.commit('addToHistory', { moveNode: { selectedFeature: this.selectedFeature, lngLat: geom } })

        // disable popup
        this.disablePopup = true
        this.popupEditor.showed = false
        // get position
        this.initialPostition = event.mapboxEvent.lngLat
        this.map.on('mousemove', this.onMove)
      }
    },
    onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (this.map.loaded() && this.dragNode) {
        this.$store.commit('moveNode', { selectedNode: this.selectedFeature, lngLat: Object.values(event.lngLat) })
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
      // emit a clickNode with the selected node.
      // this will work with lag as it is the selectedFeature and not the highlighted one.
      if (this.selectedFeature) {
        const click = {
          selectedFeature: this.selectedFeature,
          action: 'Move Node',
          lngLat: event.lngLat,
        }
        this.$emit('clickFeature', click)
      }
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
        data: $store.getters.editorLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorLinks"
      :layer="{
        type: 'line',
        minzoom: 9,
        paint: {
          'line-color': '#7EBAAC',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0]
        }
      }"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @contextmenu="linkRightClick"
    />

    <MglImageLayer
      source-id="editorLinks"
      type="symbol"
      source="editorLinks"
      layer-id="arrow-layer"
      :layer="{
        type: 'symbol',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 30,
          'icon-ignore-placement': true,
          'icon-image': 'arrow',
          'icon-size': 0.5,
          'icon-rotate': 90
        }
      }"
    />

    <MglGeojsonLayer
      v-if="drawMode"
      source-id="drawLink"
      :source="{
        type: 'geojson',
        data: $store.getters.newLink,
        buffer: 0,
        generateId: true,
      }"
      layer-id="drawLink"
      :layer="{
        type: 'line',
        minzoom: 9,
        paint: {
          'line-color': '#7EBAAC',
          'line-width': 3,
          'line-dasharray': [0, 2, 4]
        }
      }"
    />

    <MglGeojsonLayer
      source-id="editorNodes"
      :source="{
        type: 'geojson',
        data: $store.getters.editorNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="editorNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 9,
        paint: {
          'circle-color': '#2C3E4E',
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 16, 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        }
      }"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
      @mouseup="stopMovingNode"
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
          dense
          flat
        >
          <v-list-item-group>
            <v-list-item
              v-for="action in contextMenu.actions"
              :key="action.id"
            >
              <v-list-item-content>
                <v-btn
                  outlined
                  small
                  @click="actionClick({action: action,
                                       feature: contextMenu.feature,
                                       coordinates: contextMenu.coordinates})"
                >
                  {{ $gettext(action) }}
                </v-btn>
              </v-list-item-content>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
