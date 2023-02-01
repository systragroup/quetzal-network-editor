<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer, MglImageLayer } from 'vue-mapbox'
import mapboxgl from 'mapbox-gl'
import booleanContains from '@turf/boolean-contains'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'

export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
    MglImageLayer,
  },
  props: ['map', 'showedTrips', 'isEditorMode', 'anchorMode'],
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
        nodes: 15,
        links: 10,
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

  },
  created () {
    this.renderedrNodes = structuredClone(this.$store.getters.rnodesHeader)
    this.renderedAnchorrNodes = structuredClone(this.$store.getters.rnodesHeader)
    this.renderedrLinks = structuredClone(this.$store.getters.rlinksHeader)
    // TODO: only activate when we are editing roadlinks (when tab is selected.)
    // we could also have 2 component, one static and one editable.
    this.map.on('dragend', () => this.getBounds())
    this.map.on('zoomend', () => this.getBounds())
  },

  methods: {
    getBounds () {
      // should change to a road edition mode too.
      if (!this.isEditorMode) {
      // get map bounds and return only the features inside of it.
      // this way, only the visible links and node are rendered and updating is fast
      // (i.e. moving a node in real time)
      // note only line inside the bbox (buffured) are visible.
        const bounds = this.map.getBounds()
        // create a BBOX with a 500m buffer
        this.bbox = buffer(bboxPolygon([bounds._sw.lng, bounds._sw.lat, bounds._ne.lng, bounds._ne.lat]), 0.5)
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
      } else {
        this.renderedrNodes = this.rnodes
        this.renderedrLinks = this.rlinks
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
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
            { hover: false },
          )
        }
        this.hoveredStateId = { layerId: event.layerId, id: event.mapboxEvent.features[0].id }
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
          { hover: true },
        )

        this.$emit('onHover', { layerId: this.hoveredStateId.layerId, selectedId: this.hoveredStateId.id })
      }
    },

    offCursor (event) {
      // todo: error warning is throw sometime when we move a node over another node or anchor.
      if (this.popup.isOpen()) this.popup.remove()
      // eslint-disable-next-line max-len

      if (!(['rnodes', 'anchorrNodes'].includes(this.hoveredStateId?.layerId) && event.layerId === 'rlinks')) {
        // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
        if (this.keepHovering) {
          this.dragNode = true
          // normal behaviours, hovering is false
        } else {
          this.map.getCanvas().style.cursor = ''
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
            { hover: false },
          )
          this.hoveredStateId = null
          this.$emit('offHover', event)
        }
      }
    },

    selectClick (event) {
      if (this.hoveredStateId !== null) {
        // Get the highlighted feature
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
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
            this.getBounds()
          } else if (this.hoveredStateId.layerId === 'rnodes') {
            const click = {
              selectedFeature: this.selectedFeature,
              action: 'Edit rNode Info',
              lngLat: event.mapboxEvent.lngLat,
            }
            this.$emit('clickFeature', click)
          }
        }
      }
    },

    linkRightClick (event) {
      if (this.hoveredStateId.layerId === 'rlinks') {
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        const click = {
          selectedFeature: this.selectedFeature,
          action: 'Edit rLink Info',
          lngLat: event.mapboxEvent.lngLat,
        }
        this.$emit('clickFeature', click)
      }
    },

    contextMenuNode (event) {
      if (this.hoveredStateId?.layerId === 'rnodes') {
        // const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        console.log(' this is tricky. how to connect links there are 4-8 links connected to a node?')
      } else if (this.hoveredStateId?.layerId === 'anchorrNodes') {
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        this.$store.commit('deleteAnchorrNode', { selectedNode: this.selectedFeature })
        this.getBounds()
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
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
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
          'icon-image':['case', ['boolean', anchorMode, false], 'arrowAnchor','arrow'],
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
                                   click: selectClick,
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
  </section>
</template>
<style lang="scss" scoped>

</style>
