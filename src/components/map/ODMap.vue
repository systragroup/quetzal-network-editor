<!-- eslint-disable no-return-assign -->
<script>
import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox'
import short from 'short-uuid'
import { computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useODStore } from '@src/store/od'
import geojson from '@constants/geojson'

const $gettext = s => s

export default {
  name: 'ODMap',
  components: {
    MglGeojsonLayer,
    MglImageLayer,
    MglPopup,
  },
  props: ['map', 'isODMode', 'isEditorMode'],
  events: [],
  setup () {
    const header = geojson
    const store = useIndexStore()
    const ODStore = useODStore()
    const layer = computed(() => { return ODStore.visibleLayer })
    const nodes = computed(() => { return ODStore.nodes(layer.value) })

    return { store, ODStore, layer, nodes, header }
  },
  data () {
    return {
      hoveredStateId: null,
      keepHovering: false,
      dragNode: false,
      drawMode: false,
      selectedFeature: null,
      contextMenu: {
        coordinates: [0, 0],
        showed: false,
        actions: [],
        feature: null,
      },

    }
  },

  created () {
    this.map.on('click', this.test)
  },

  methods: {
    test (event) {
      if (this.isODMode) {
        if (!this.drawMode) {
          const index = 'OD_' + short.generate()
          this.ODStore.createNewLink({ lngLat: Object.values(event.lngLat), index })
          this.dragNode = true
          this.selectedFeature = { properties: { linkIndex: index, coordinatedIndex: 1 } }
          // get position
          this.drawMode = true
          this.map.on('mousemove', this.onMove)
          this.map.on('mouseup', this.stopMovingNode)
        } else {
          // here. we dont want the second click to do anything except act like a stop moving node.
          this.drawMode = false
        }
      }
    },
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
      if (this.isODMode && !this.drawMode && this.hoveredStateId?.layerId === 'ODNodes') {
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
        this.ODStore.moveNode(click)
        // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
        // this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node =>
        //  booleanContains(this.bbox, node))
      }
    },
    stopMovingNode (event) {
      if (this.isODMode && event.originalEvent.button === 0) {
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
    linkRightClick (event) {
      if (this.isODMode && !this.drawMode) {
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
        this.contextMenu.showed = true
        this.contextMenu.feature = this.hoveredStateId.id
        this.contextMenu.actions =
          [
            $gettext('Edit OD Info'),
            $gettext('Delete OD'),
          ]
      }
    },
    actionClick (event) {
      const click = {
        selectedIndex: event.feature,
        action: event.action,
        lngLat: event.coordinates,
      }
      this.$emit('clickFeature', click)
      this.contextMenu.showed = false
      this.contextMenu.type = null
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
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.3, 1],
          'line-width': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 3, 1],
                         ['case', ['has', 'route_width'],
                          ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                           ['to-number', ['get', 'route_width']],
                           2], 2]],
          'line-blur': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
                        ['case', ['has', 'route_width'],
                         ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
                          ['to-number', ['get', 'route_width']],
                          2], 2]],
        },

        layout: {
          'line-sort-key': ['to-number',['get', 'route_width']],
          'line-cap': 'round',
        }
      }"
      @contextmenu="linkRightClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
    />

    <MglGeojsonLayer
      source-id="ODNodes"
      :source="{
        type: 'geojson',
        data: isODMode? nodes : header,
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
          'circle-stroke-color': $vuetify.theme.current.colors.darkgrey,
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
          'icon-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
        }
      }"
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
          density="compact"
        >
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
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
