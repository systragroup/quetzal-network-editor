<script>

import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox'
import { computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import mapboxgl from 'mapbox-gl'
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
  props: ['map', 'isEditorMode', 'isRoadMode'],
  events: ['clickFeature'],
  setup () {
    const store = useIndexStore()
    const rlinksStore = userLinksStore()
    const anchorMode = computed(() => { return store.anchorMode })
    const selectedPopupContent = computed(() => { return store.roadsPopupContent })
    const selectedrGroup = computed(() => { return rlinksStore.selectedrGroup })
    const cyclewayMode = computed(() => { return store.cyclewayMode })
    const rnodes = computed(() => { return rlinksStore.visiblerNodes })
    const rlinks = computed(() => { return rlinksStore.visiblerLinks })
    const renderedrLinks = computed(() => { return rlinksStore.renderedrLinks })
    const renderedrNodes = computed(() => { return rlinksStore.renderedrNodes })
    const renderedAnchorrNodes = computed(() => {
      return anchorMode.value ? rlinksStore.anchorrNodes : rlinksStore.rnodesHeader
    })

    return {
      store,
      rlinksStore,
      anchorMode,
      selectedPopupContent,
      selectedrGroup,
      cyclewayMode,
      rlinks,
      rnodes,
      renderedrLinks,
      renderedrNodes,
      renderedAnchorrNodes,
    }
  },
  data () {
    return {
      hoveredStateId: null,
      visibleNodes: {},
      visibleLinks: {},
      disablePopup: false,
      editorRnodes: {},
      routeWidth: 1,
      bbox: null,
      minZoom: {
        links: 2,
        rendered: 14,
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

    ArrowSizeCondition () {
      // when we want to show the cycleway direction.
      // [cycleway, cycleway_reverse]
      // [yes yes], [yes,shared], [shared,yes], [shared,shared] -> no arrow
      // [yes, no] [shared, no] -> arrow
      // [no, yes] [no, shared] -> arrow inverse
      // [no, no], no arrow ? or default (roads direction)

      // in this implementation. we check the case no arrow ([yes yes], [yes,shared], [shared,yes], [shared,shared] -> no arrow)
      // if true. no arrow.
      // else if [no,no], we let the default onway on road condition decide.
      // else we put arrow on  cycleway.
      // The direction is determined with the another function (ArrowDirCondition)

      const defaultCondition = ['case', ['has', 'oneway'],
        ['case', ['to-boolean', ['to-number', ['get', 'oneway']]], 0.25, 0],
        0.25]

      const getRouteWidth = ['case', ['has', 'route_width'],
        ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
          ['to-number', ['get', 'route_width']], 2], 2]

      if (this.cyclewayMode) {
        // if any null value -> no arrow: 0
        // if cycle in both way (not no and not no) -> no arrow: 0
        // if both no -> no arrow: 0
        // else if not cycle. check default condition (its a normal road)
        // else : 0.15: its cycle in one way

        const exp = ['*',
          ['case', ['all',
            ['to-boolean', ['get', 'cycleway']],
            ['to-boolean', ['get', 'cycleway_reverse']],
          ], ['case',
            ['all',
              ['!=', ['downcase', ['get', 'cycleway']], 'no'],
              ['!=', ['downcase', ['get', 'cycleway_reverse']], 'no'],
            ], 0,
            ['case',
              ['all',
                ['==', ['downcase', ['get', 'cycleway']], 'no'],
                ['==', ['downcase', ['get', 'cycleway_reverse']], 'no'],
              ], defaultCondition, 0.25],
          ], 0], getRouteWidth,
        ]
        return exp
      } else {
        // normal case. using oneway
        return ['*', defaultCondition, getRouteWidth]
      }
    },
    ArrowDirCondition () {
      if (this.cyclewayMode) {
        // when we want to show the cycleway direction.
        // [no, yes] [no, shared] -> arrow inverse
        // if false. we either have no arrow (so it doesnt matter)
        // or an arrow in the right direction.
        const exp = ['case',
          ['all',
            ['==', ['downcase', ['get', 'cycleway']], 'no'],
            ['!=', ['downcase', ['get', 'cycleway_reverse']], 'no'],
          ],
          -90, 90,
        ]
        return exp
      } else {
        // default case
        return 90
      }
    },

  },

  watch: {
    selectedrGroup (val) { this.getBounds() },
    isRoadMode (val) {
      if (val) {
        this.map.on('dragend', this.getBounds)
        this.map.on('zoomend', this.getBounds)
      } else {
        this.map.off('dragend', this.getBounds)
        this.map.off('zoomend', this.getBounds)
      }
    },

  },
  created () {
    console.log(this.$vuetify.theme.current.colors.linksprimary)
    this.map.on('dragend', this.getBounds)
    this.map.on('zoomend', this.getBounds)
  },
  beforeDestroy () {
    // remove arrow layer first as it depend on rlink layer
    this.map.removeLayer('arrow-rlinks')
  },

  methods: {
    getBounds () {
      // get map bounds and return only the features inside of it.
      // this way, only the visible links and node are rendered and updating is fast
      // (i.e. moving a node in real time)
      // note only line inside the bbox (buffured) are visible.
      const bounds = this.map.getBounds()
      // create a BBOX with a 800m buffer
      this.bbox = buffer(bboxPolygon([bounds._sw.lng, bounds._sw.lat, bounds._ne.lng, bounds._ne.lat]), 0.2)
      // only get the geojson if the zoom level is bigger than the min.
      // if not, getting all anchorpoint would be very intensive!!
      // this way, only a small number of anchor points are computed
      if (this.map.getZoom() > this.minZoom.rendered) {
        // get links in or intersecting with bbox
        this.routeWidth = 2
        this.rlinksStore.getRenderedrLinks({ bbox: this.bbox })
      } else if (this.map.getZoom() > this.minZoom.links) {
        // evrey links are rendered (not editable). no nodes
        this.routeWidth = 1
        this.rlinksStore.setRenderedrLinks({ method: 'visible' })
      } else {
        this.routeWidth = 1
        // Nothing is is rendered.
        this.rlinksStore.setRenderedrLinks({ method: 'None' })
      }
    },
    onCursor (event) {
      if (this.isRoadMode) {
        if (this.popup?.isOpen()) this.popup.remove() // make sure there is no popup before creating one.
        if (this.hoveredStateId === null || this.hoveredStateId.layerId === 'rlinks') {
          if (!this.disablePopup && this.selectedPopupContent.length > 0) {
            const selectedFeature = event.mapboxEvent.features[0]
            if (selectedFeature.layer.id !== 'rnodes') {
              // eslint-disable-next-line max-len
              let htmlContent = this.selectedPopupContent.map(prop => `${prop}: <b>${selectedFeature.properties[prop]}</b>`)
              htmlContent = htmlContent.join('<br> ')
              this.popup = new mapboxgl.Popup({ closeButton: false })
                .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
                .setHTML(htmlContent)
                .addTo(event.map)
            }
          }
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
      }
    },

    offCursor (event) {
      if (this.isRoadMode) {
      // todo: error warning is throw sometime when we move a node over another node or anchor.
        if (this.popup?.isOpen()) this.popup.remove()
        if (this.hoveredStateId !== null) {
          // eslint-disable-next-line max-len
          if (!(['rnodes', 'anchorrNodes'].includes(this.hoveredStateId?.layerId) && event?.layerId === 'rlinks')) {
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
      }
    },

    selectClick (event) {
      if (this.isRoadMode) {
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
                selectedIndex: this.selectedFeature,
                action,
                lngLat: event.mapboxEvent.lngLat,
              }
              this.$emit('clickFeature', click)
            }
          }
        }
      }
    },

    linkRightClick (event) {
      if (this.isRoadMode) {
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
      // this.getBounds()
    },

    contextMenuNode (event) {
      if (this.isRoadMode) {
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
            const click = {
              selectedFeature: this.selectedFeature[0],
              action: 'Delete Road Anchor',
              lngLat: null,
            }
            this.$emit('clickFeature', click)
            // this.getBounds()
          }
        }
      }
    },

    moveNode (event) {
      if (this.isRoadMode) {
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
            this.rlinksStore.getConnectedLinks({ selectedNode: this.selectedFeature })
          }
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
          action: null,
          lngLat: Object.values(event.lngLat),
        }
        if (this.hoveredStateId.layerId === 'anchorrNodes') {
          click.action = 'Move rAnchor'
          this.$emit('clickFeature', click)
          // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
        } else {
          click.action = 'Move rNode'
          this.$emit('clickFeature', click)
        }
      }
    },
    stopMovingNode (event) {
      if (this.isRoadMode) {
        // stop tracking position (moving node.)
        this.map.getCanvas().style.cursor = 'pointer'
        this.map.off('mousemove', this.onMove)
        // enable popup and hovering off back. disable Dragmode
        this.keepHovering = false
        this.dragNode = false
        this.disablePopup = false
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
      source-id="rlinks"
      :source="{
        type: 'geojson',
        data: isRoadMode? renderedrLinks : rlinks,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        interactive: true,
        type: 'line',
        minzoom: minZoom.links,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.3, 1],
          'line-width': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 2*routeWidth, routeWidth],
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
        }

      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor,
                                   mouseleave: offCursor,
                                   click: selectClick,
                                   contextmenu: linkRightClick }"
    />
    <MglImageLayer
      source-id="rlinks"
      type="symbol"
      source="rlinks"
      layer-id="arrow-rlinks"
      :layer="{
        type: 'symbol',
        minzoom: minZoom.rendered,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 200,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': ArrowSizeCondition,
          'icon-rotate': ArrowDirCondition,
        },
        paint: {
          'icon-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
        }
      }"
    />

    <MglGeojsonLayer
      source-id="rnodes"
      :source="{
        type: 'geojson',
        data: isRoadMode? renderedrNodes:rnodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rnodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.rendered,
        paint: {
          'circle-color': ['case', ['boolean', isEditorMode, false], $vuetify.theme.current.colors.mediumgrey, $vuetify.theme.current.colors.accent],
          'circle-stroke-color': $vuetify.theme.current.colors.white,
          'circle-stroke-width': 1,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 14, 6],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
        },
      }"
      v-on="isEditorMode ? { } : { mouseenter: onCursor,
                                   mouseleave: offCursor,
                                   mousedown: moveNode,
                                   contextmenu:contextMenuNode }"
    />

    <MglGeojsonLayer
      source-id="anchorrNodes"
      :source="{
        type: 'geojson',
        data: isRoadMode? renderedAnchorrNodes: rlinksStore.rnodesHeader,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorrNodes"
      :layer="{
        interactive: true,
        type: 'circle',
        minzoom: minZoom.rendered,
        paint: {
          'circle-color': '#ffffff',
          'circle-opacity':0.5,
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 10, 8],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
          'circle-stroke-color': $vuetify.theme.current.colors.darkgrey,
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
