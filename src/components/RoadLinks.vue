<!-- eslint-disable max-len -->
<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox'
import mapboxgl from 'mapbox-gl'
import booleanContains from '@turf/boolean-contains'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
const $gettext = s => s
export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
    MglImageLayer,
    MglPopup,
  },
  props: ['map', 'isEditorMode', 'anchorMode', 'isRoadMode'],
  events: ['clickFeature'],

  data () {
    return {
      hoveredStateId: null,
      visibleNodes: {},
      visibleLinks: {},
      disablePopup: false,
      editorRnodes: {},
      renderedrLinks: {},
      renderedrNodes: {},
      renderedAnchorrNodes: {},
      bbox: null,
      minZoom: {
        nodes: 14,
        links: 10,
      },
      contextMenu: {
        coordinates: [0, 0],
        showed: false,
        actions: [],
        feature: null,
      },

    }
  },
  computed: {
    selectedPopupContent () { return this.$store.getters.roadPopupContent },
    rnodes () { return this.$store.getters.visiblerNodes },
    rlinks () { return this.$store.getters.visiblerLinks },
    anchorrNodes () {
      return this.anchorMode ? this.$store.getters.anchorrNodes(this.renderedrLinks) : this.$store.getters.rnodesHeader
    },

  },

  watch: {
    anchorMode () { this.getBounds() },
    isRoadMode (val) {

    },
    isEditorMode (val) {

    },

  },
  created () {
    this.renderedrNodes = structuredClone(this.$store.getters.rnodesHeader)
    this.renderedAnchorrNodes = structuredClone(this.$store.getters.rnodesHeader)
    this.renderedrLinks = structuredClone(this.$store.getters.rlinksHeader)
    this.map.on('dragend', () => this.getBounds())
    this.map.on('zoomend', () => this.getBounds())
  },

  methods: {
    getBounds () {
      // get map bounds and return only the features inside of it.
      // this way, only the visible links and node are rendered and updating is fast
      // (i.e. moving a node in real time)
      // note only line inside the bbox (buffured) are visible.
      const bounds = this.map.getBounds()
      // create a BBOX with a 800m buffer
      this.bbox = buffer(bboxPolygon([bounds._sw.lng, bounds._sw.lat, bounds._ne.lng, bounds._ne.lat]), 0.8)
      // only get the geojson if the zoom level is bigger than the min.
      // if not, getting all anchorpoint would be very intensive!!
      // this way, only a small number of anchor points are computed
      if (this.map.getZoom() > this.minZoom.links) {
        this.renderedrLinks.features = this.rlinks.features.filter(link => booleanContains(this.bbox, link))
      } else {
        this.renderedrLinks.features = []
      }
      if (this.map.getZoom() > this.minZoom.nodes) {
        this.renderedrNodes.features = this.rnodes.features.filter(node => booleanContains(this.bbox, node))
        this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node => booleanContains(this.bbox, node))
      } else {
        this.renderedrNodes.features = []
        this.renderedAnchorrNodes.features = []
      }
    },
    onCursor (event) {
      if (this.popup?.isOpen()) this.popup.remove() // make sure there is no popup before creating one.
      if (!this.disablePopup) {
        this.popup = new mapboxgl.Popup({ closeButton: false })
          .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
          .setHTML(event.mapboxEvent.features[0].properties[this.selectedPopupContent])
          .addTo(event.map)
      }
      if (this.hoveredStateId === null || this.hoveredStateId.layerId === 'rlinks') {
        this.map.getCanvas().style.cursor = 'pointer'
        if (this.hoveredStateId !== null) {
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
            { hover: false },
          )
        }
        // get a list of all overID. if there is multiple superposed link get all of them!
        const uniqueArray = [...new Set(event.mapboxEvent.features.map(item => item.id))]
        this.hoveredStateId = { layerId: event.layerId, id: uniqueArray }
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
          { hover: true },
        )

        this.$emit('onHover', { layerId: this.hoveredStateId.layerId, selectedId: this.hoveredStateId.id })
      }
    },

    offCursor (event) {
      // todo: error warning is throw sometime when we move a node over another node or anchor.
      if (this.popup.isOpen()) this.popup.remove()
      if (this.hoveredStateId !== null) {
      // eslint-disable-next-line max-len
        if (!(['rnodes', 'anchorrNodes'].includes(this.hoveredStateId?.layerId) && event.layerId === 'rlinks')) {
        // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
          if (this.keepHovering) {
            this.dragNode = true
          // normal behaviours, hovering is false
          } else {
            this.map.getCanvas().style.cursor = ''
            this.map.setFeatureState(
              { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
              { hover: false },
            )
            this.hoveredStateId = null
            this.$emit('offHover', event)
          }
        }
      }
    },

    selectClick (event) {
      if (this.hoveredStateId !== null) {
        // Get the highlighted feature
        // const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        // this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]
        this.selectedFeature = this.hoveredStateId.id
        // Emit a click base on layer type (node or link)

        if (this.selectedFeature !== null) {
          if (this.hoveredStateId.layerId === 'rlinks') {
            const action = this.anchorMode ? 'Add Road Anchor Inline' : 'Add Road Node Inline'
            const click = {
              selectedFeature: this.selectedFeature,
              action: action,
              lngLat: event.mapboxEvent.lngLat,
            }
            this.$emit('clickFeature', click)
            // this.getBounds()
          }
        }
      }
    },

    linkRightClick (event) {
      if (this.hoveredStateId.layerId === 'rlinks') {
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
        this.contextMenu.showed = true
        this.contextMenu.feature = this.hoveredStateId.id
        this.contextMenu.actions =
          [
            $gettext('Edit rLink Info'),
            $gettext('Delete rLink'),
          ]
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

    contextMenuNode (event) {
      const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
      this.selectedFeature = features.filter(item => this.hoveredStateId.id.includes(item.id))

      if (this.selectedFeature.length > 0) {
        if (this.hoveredStateId?.layerId === 'rnodes') {
          const click = {
            selectedFeature: this.selectedFeature[0],
            action: 'Edit rNode Info',
            lngLat: event.mapboxEvent.lngLat,
          }
          this.$emit('clickFeature', click)
        } else if (this.hoveredStateId?.layerId === 'anchorrNodes') {
          this.$store.commit('deleteAnchorrNode', { selectedNode: this.selectedFeature[0] })
          this.getBounds()
        }
      }
    },

    moveNode (event) {
      if (event.mapboxEvent.originalEvent.button === 0 &
      ['rnodes', 'anchorrNodes'].includes(this.hoveredStateId.layerId)) {
        event.mapboxEvent.preventDefault() // prevent map control
        this.map.getCanvas().style.cursor = 'grab'
        // disable mouseLeave so we stay in hover state.
        this.keepHovering = true
        // get selected node
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]
        // disable popup
        this.disablePopup = true
        if (this.hoveredStateId.layerId === 'rnodes') {
          this.$store.commit('getConnectedLinks', { selectedNode: this.selectedFeature })
        }
        // get position
        this.map.on('mousemove', this.onMove)
      }
    },
    onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (this.map.loaded() && this.dragNode) {
        const click = {
          selectedFeature: this.selectedFeature,
          action: null,
          lngLat: Object.values(event.lngLat),
        }
        if (this.hoveredStateId.layerId === 'anchorrNodes') {
          click.action = 'Move rAnchor'
          this.$emit('clickFeature', click)
          // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
          this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node =>
            booleanContains(this.bbox, node))
        } else {
          click.action = 'Move rNode'
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
      // emit a clickNode with the selected node.
      // this will work with lag as it is the selectedFeature and not the highlighted one.
    },

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="rlinks"
      :source="{
        type: 'geojson',
        data: renderedrLinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: minZoom.links,
        paint: {
          'line-color': '#B5E0D6',
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.5, 1],
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 2],
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0]

        },

      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor, mouseleave: offCursor, click: selectClick, contextmenu: linkRightClick }"
    />
    <MglImageLayer
      source-id="rlinks"
      type="symbol"
      source="rlinks"
      layer-id="arrow-rlinks"
      :layer="{
        type: 'symbol',
        minzoom: minZoom.nodes,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 100,
          'icon-ignore-placement': true,
          'icon-image':'rArrow',
          'icon-size': 0.5,
          'icon-rotate': 90
        }
      }"
    />

    <MglGeojsonLayer
      source-id="rnodes"
      :source="{
        type: 'geojson',
        data: renderedrNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rnodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.nodes,
        paint: {
          'circle-color': ['case', ['boolean', isEditorMode, false],'#9E9E9E', '#2C3E4E'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 14, 3],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        },
      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor,
                                   mouseleave: offCursor,
                                   mousedown: moveNode,
                                   mouseup: stopMovingNode,
                                   contextmenu:contextMenuNode }"
    />

    <MglGeojsonLayer
      source-id="anchorrNodes"
      :source="{
        type: 'geojson',
        data: renderedAnchorrNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorrNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.nodes,
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
      @mouseup="stopMovingNode"
      @contextmenu="contextMenuNode"
    />
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
