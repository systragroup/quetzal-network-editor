<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import mapboxgl from 'mapbox-gl'
export default {
  name: 'StaticLinks',
  components: {
    MglGeojsonLayer,
  },
  props: ['map', 'showedTrips', 'isEditorMode', 'anchorMode'],
  events: ['clickFeature'],

  data () {
    return {
      hoveredStateId: null,
      visibleNodes: {},
      visibleLinks: {},
      disablePopup: false,

    }
  },
  computed: {
    selectedPopupContent () { return this.$store.getters.roadPopupContent },
    rnodes () { return this.$store.getters.visiblerNodes },
    rlinks () { return this.$store.getters.visiblerLinks },
    anchorrNodes () { return this.anchorMode ? this.$store.getters.anchorrNodes : this.$store.getters.rnodesHeader },

  },

  watch: {
    anchorMode (val) {
      console.log('anchor', val)
    },
  },
  created () {
  },

  methods: {
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
      }
      this.$emit('onHover', { selectedId: this.hoveredStateId.id })
    },

    offCursor (event) {
      if (this.hoveredStateId !== null) {
        if (this.popup.isOpen()) this.popup.remove()
        // eslint-disable-next-line max-len
        if (!(['rnodes', 'anchorrNodes'].includes(this.hoveredStateId.layerId) && event.layerId === 'rlinks')) {
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
          }
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
        this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id)[0]
        // disable popup
        this.disablePopup = true

        this.$store.commit('getConnectedLinks', { selectedNode: this.selectedFeature })
        // get position
        this.map.on('mousemove', this.onMove)
      }
    },
    onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (this.map.loaded() && this.dragNode) {
        if (this.hoveredStateId.layerId === 'anchorrNodes') {
          this.$store.commit('moveAnchor', { selectedNode: this.selectedFeature, lngLat: Object.values(event.lngLat) })
        } else {
          this.$store.commit('moverNode', { selectedNode: this.selectedFeature, lngLat: Object.values(event.lngLat) })
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
        data: rlinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 10,
        paint: {
          'line-color': '#B5E0D6',
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.1, 1],
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 2],
          'line-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 6, 0]

        },

      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor, mouseleave: offCursor, click: selectClick }"
    />

    <MglGeojsonLayer
      source-id="rnodes"
      :source="{
        type: 'geojson',
        data: rnodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rnodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 15,
        paint: {
          'circle-color': ['case', ['boolean', isEditorMode, false],'#9E9E9E', '#2C3E4E'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 14, 3],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        },
      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor, mouseleave: offCursor, click: selectClick, mousedown: moveNode, mouseup: stopMovingNode }"
    />

    <MglGeojsonLayer
      source-id="anchorrNodes"
      :source="{
        type: 'geojson',
        data: anchorrNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorrNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: 15,
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
    />
  </section>
</template>
<style lang="scss" scoped>

</style>
