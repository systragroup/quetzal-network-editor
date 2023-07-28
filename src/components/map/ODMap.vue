<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer, MglImageLayer } from 'vue-mapbox'

export default {
  name: 'ODMap',
  components: {
    MglGeojsonLayer,
    MglImageLayer,
  },
  props: ['map'],
  events: [],

  data () {
    return {
      isODMode: true,
      hoveredStateId: null,
      keepHovering: false,
      dragNode: false,
      selectedFeature: null,
    }
  },
  computed: {
    layer () { return this.$store.getters['od/visibleLayer'] },
    nodes () {
      return this.$store.getters['od/nodes'](this.layer)
    },

  },

  watch: {
  },

  created () {
  },

  methods: {
    onCursor (event) {
      if (this.isODMode) {
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

    offCursor (event) {
      if (this.isODMode) {
      // todo: error warning is throw sometime when we move a node over another node or anchor.
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

    moveNode (event) {
      if (this.isODMode) {
        if (event.mapboxEvent.originalEvent.button === 0) {
          event.mapboxEvent.preventDefault() // prevent map control
          this.map.getCanvas().style.cursor = 'grab'
          // disable mouseLeave so we stay in hover state.
          this.keepHovering = true
          // get selected node
          const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
          this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]

          // get position
          this.map.on('mousemove', this.onMove)
          this.map.on('mouseup', this.stopMovingNode)
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
        this.$store.commit('od/moveNode', click)
        // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
        // this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node =>
        //  booleanContains(this.bbox, node))
      }
    },
    stopMovingNode (event) {
      if (this.isODMode) {
        // stop tracking position (moving node.)
        this.map.getCanvas().style.cursor = 'pointer'
        this.map.off('mousemove', this.onMove)
        // enable popup and hovering off back. disable Dragmode
        this.keepHovering = false
        this.dragNode = false
        // if we drag too quickly, offcursor it will not be call and the node will stay in hovering mode.
        // calling offscursor will break the sticky node drawlink behaviour, so we only make its state back to hover-false
        this.map.getCanvas().style.cursor = ''
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id[0] },
          { hover: false },
        )
        this.hoveredStateId = null
        this.map.off('mouseup', this.stopMovingNode)

      // emit a clickNode with the selected node.
      // this will work with lag as it is the selectedFeature and not the highlighted one.}
      }
    },

  },
}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="od"
      :source="{
        type: 'geojson',
        data: layer,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="od"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: 1,
        maxzoom: 18,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.currentTheme.linksprimary],
          'line-width': ['case', ['has', 'route_width'],
                         ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                          ['to-number', ['get', 'route_width']],
                          3], 3],
        },

        layout: {
          'line-sort-key': ['to-number',['get', 'route_width']],
          'line-cap': 'round',
        }
      }"
    />

    <MglGeojsonLayer
      source-id="ODNodes"
      :source="{
        type: 'geojson',
        data: nodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="ODNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        paint: {
          'circle-color': '#ffffff',
          'circle-opacity':0.5,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 5],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
          'circle-stroke-color': $vuetify.theme.currentTheme.darkgrey,
          'circle-stroke-width': 2,
        },
      }"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
    />
    <MglImageLayer
      source-id="od"
      type="symbol"
      source="od"
      layer-id="arrow-od"
      :layer="{
        type: 'symbol',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 200,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': ['*',0.2,['case', ['has', 'route_width'],
                                 ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                                  ['to-number', ['get', 'route_width']], 2], 2]],
          'icon-rotate': 90,
        },
        paint: {
          'icon-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.currentTheme.linksprimary],
        }
      }"
    />
  </section>
</template>
<style lang="scss" scoped>

</style>
