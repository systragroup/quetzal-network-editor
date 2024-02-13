<script>
import { MglGeojsonLayer } from 'vue-mapbox3'

export default {
  name: 'NodesLayer',
  components: {

    MglGeojsonLayer,
  },
  props: ['map', 'nodes', 'active'],
  event: ['move', 'rightClick'],

  data () {
    return {
      hoveredStateId: null,
      keepHovering: false,
      dragNode: false,
    }
  },
  computed: {

  },
  watch: {
  },

  created () {
  },
  methods: {

    onCursor (event) {
      if (this.active) {
        if (this.hoveredStateId === null) {
          this.map.getCanvas().style.cursor = 'pointer'
          // get a list of all overID. if there is multiple superposed link get all of them!
          const uniqueArray = [...new Set(event.mapboxEvent.features.map(item => item.id))]
          this.hoveredStateId = { layerId: event.layerId, id: uniqueArray }
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
            { hover: true },
          )
        }
      }
    },
    offCursor () {
      if (this.active) {
        if (this.hoveredStateId !== null) {
          // eslint-disable-next-line max-len
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
            // this.$emit('offHover', event)
          }
        }
      }
    },
    rightClick () {
      if (!this.dragNode && this.hoveredStateId?.layerId === 'nodes') {
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        const selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]
        const click = {
          selectedFeature,
        }
        if (selectedFeature) {
          this.$emit('rightClick', click)
        }
      }
    },
    moveNode (event) {
      if (this.active && this.hoveredStateId?.layerId === 'nodes') {
        if (event.mapboxEvent.originalEvent.button === 0) {
          event.mapboxEvent.preventDefault() // prevent map control
          this.map.getCanvas().style.cursor = 'grab'
          // disable mouseLeave so we stay in hover state.
          this.keepHovering = true
          // get selected node
          const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
          this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]
          // get position
          if (this.selectedFeature?.properties) {
            this.map.on('mousemove', this.onMove)
            this.map.on('mouseup', this.stopMovingNode)
          }
        }
      }
    },
    onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (this.dragNode && this.selectedFeature) {
        const click = {
          selectedFeature: this.selectedFeature,
          lngLat: Object.values(event.lngLat),
        }
        this.$emit('move', click)
        // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
        // this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node =>
        //  booleanContains(this.bbox, node))
      }
    },
    stopMovingNode (event) {
      if (this.active && event.originalEvent.button === 0) {
        // stop tracking position (moving node.)
        this.map.getCanvas().style.cursor = 'pointer'
        this.map.off('mousemove', this.onMove)

        // enable popup and hovering off back. disable Dragmode
        this.keepHovering = false
        this.dragNode = false
        // if we drag too quickly, offcursor it will not be call and the node will stay in hovering mode.
        // calling offscursor will break the sticky node drawlink behaviour, so we only make its state back to hover-false
        this.map.getCanvas().style.cursor = ''
        if (this.hoveredStateId) {
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
            { hover: false },
          )
        }
        this.hoveredStateId = null
        this.map.off('mouseup', this.stopMovingNode)
      }
    },

  },

}
</script>
<template>
  <MglGeojsonLayer
    source-id="nodes"
    :source="{
      type: 'geojson',
      data: nodes,
      buffer: 0,
      promoteId: 'index',
    }"
    layer-id="nodes"
    :layer="{
      interactive: true,
      type: 'circle',
      paint: {
        'circle-color': '#ffffff',
        'circle-opacity':0.5,
        'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
        'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
        'circle-stroke-color': $vuetify.theme.current.colors.darkgrey,
        'circle-stroke-width': 2,
      },
    }"
    @mouseover="onCursor"
    @mouseleave="offCursor"
    @mousedown="moveNode"
    @contextmenu="rightClick"
  />
</template>
<style lang="scss" scoped>

</style>
