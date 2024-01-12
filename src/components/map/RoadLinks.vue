<script>

import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox3'
import { computed, ref, watch, onMounted, toRefs, onBeforeUnmount } from 'vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import mapboxgl from 'mapbox-gl'
import buffer from '@turf/buffer'
import bboxPolygon from '@turf/bbox-polygon'
import geojson from '@constants/geojson'

const $gettext = s => s
export default {
  name: 'RoadLinks',
  components: {
    MglGeojsonLayer,
    MglImageLayer,
    MglPopup,
  },
  props: ['map', 'isEditorMode', 'isRoadMode'],
  emits: ['clickFeature', 'onHover', 'offHover'],
  setup (props, context) {
    const store = useIndexStore()
    const rlinksStore = userLinksStore()

    const { map, isRoadMode } = toRefs(props)
    onMounted(() => {
      map.value.on('dragend', getBounds)
      map.value.on('zoomend', getBounds)
      if (map.value.getLayer('links')) {
        map.value.moveLayer('rlinks', 'links')
        map.value.moveLayer('staticrLinks', 'links')
      }
    })
    onBeforeUnmount(() => {
      // remove arrow layer first as it depend on rlink layer
      map.value.removeLayer('arrow-rlinks')
    })

    const selectedPopupContent = computed(() => { return store.roadsPopupContent })
    const selectedrGroup = computed(() => { return rlinksStore.selectedrGroup })
    const cyclewayMode = computed(() => { return store.cyclewayMode })
    const visiblerLinks = computed(() => { return rlinksStore.visiblerLinks })
    const renderedrLinks = computed(() => { return rlinksStore.renderedrLinks })
    const renderedrNodes = computed(() => { return rlinksStore.renderedrNodes })
    const anchorMode = computed(() => { return store.anchorMode })
    const header = geojson
    const renderedAnchorrNodes = computed(() => {
      return anchorMode.value ? rlinksStore.anchorrNodes : geojson
    })
    const popup = ref(null)
    const hoveredStateId = ref(null)
    const disablePopup = ref(false)
    const width = { static: 1, rendered: 2 }
    const lastZoom = ref(100)
    const minZoom = ref({
      links: 4,
      rendered: 14,
    })
    const contextMenu = ref({
      coordinates: [0, 0],
      showed: false,
      actions: [],
      feature: null,
    })

    watch(selectedrGroup, (val) => {
      lastZoom.value = 100 // this will force the rerender on visiblerLinks in getbounds()
      getBounds()
    })
    watch(isRoadMode, (val) => {
      if (val) {
        map.value.on('dragend', getBounds)
        map.value.on('zoomend', getBounds)
        getBounds()
      } else {
        map.value.off('dragend', getBounds)
        map.value.off('zoomend', getBounds)
        // remove rendered and refresh visible (not editable but all visible)
        rlinksStore.setRenderedrLinks({ method: 'None' })
        map.value.getSource('staticrLinks').setData(visiblerLinks.value)
      }
    })

    function getBounds (e) {
      // get map bounds and return only the features inside of it.
      // this way, only the visible links and node are rendered and updating is fast
      // (i.e. moving a node in real time)

      // Note there is rendered and visible links. only one at the time is visible.

      // only get the geojson if the zoom level is bigger than the min.
      // if not, getting all anchorpoint would be very intensive!!
      // this way, only a small number of anchor points are computed
      const currentZoom = map.value.getZoom()
      if (currentZoom > minZoom.value.rendered) {
        // create a BBOX with a 200m buffer. get links in or intersecting with bbox
        const bounds = map.value.getBounds()
        const bbox = buffer(bboxPolygon([bounds._sw.lng, bounds._sw.lat, bounds._ne.lng, bounds._ne.lat]), 0.2)
        rlinksStore.getRenderedrLinks({ bbox })
        map.value.getSource('staticrLinks').setData(header)

        // check lastzoom so we only setData when it changed, not at every zoom and move.
      } else if (currentZoom > minZoom.value.links && lastZoom.value > minZoom.value.rendered) {
        // evrey links are rendered (not editable). no nodes
        rlinksStore.setRenderedrLinks({ method: 'None' })
        // set Data for static links as the map in not reactive (to same RAM)
        map.value.getSource('staticrLinks').setData(visiblerLinks.value)
      } else {
        // Nothing is is rendered.
        rlinksStore.setRenderedrLinks({ method: 'None' })
      }
      // save lastZoom value
      lastZoom.value = currentZoom
    }

    const keepHovering = ref(false)
    const dragNode = ref(false)
    const selectedFeature = ref('')

    function onCursor (event) {
      if (isRoadMode.value) {
        if (popup.value?.isOpen()) popup.value.remove() // make sure there is no popup before creating one.
        if (hoveredStateId.value === null || hoveredStateId.value.layerId === 'rlinks') {
          if (!disablePopup.value && selectedPopupContent.value.length > 0) {
            const selectedFeature = event.mapboxEvent.features[0]
            if (selectedFeature.layer.id !== 'rnodes') {
              // eslint-disable-next-line max-len
              let htmlContent = selectedPopupContent.value.map(prop => `${prop}: <b>${selectedFeature.properties[prop]}</b>`)
              htmlContent = htmlContent.join('<br> ')
              popup.value = new mapboxgl.Popup({ closeButton: false })
                .setLngLat([event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat])
                .setHTML(htmlContent)
                .addTo(event.map)
            }
          }
          map.value.getCanvas().style.cursor = 'pointer'
          if (hoveredStateId.value !== null) {
            map.value.setFeatureState(
              { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
              { hover: false },
            )
          }
          // get a list of all overID. if there is multiple superposed link get all of them!
          const uniqueArray = [...new Set(event.mapboxEvent.features.map(item => item.id))]
          hoveredStateId.value = { layerId: event.layerId, id: uniqueArray }
          map.value.setFeatureState(
            { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
            { hover: true },
          )
          context.emit('onHover', { layerId: hoveredStateId.value.layerId, selectedId: hoveredStateId.value.id })
        }
      }
    }

    function offCursor (event) {
      if (isRoadMode.value) {
        if (popup.value?.isOpen()) popup.value.remove()
        if (hoveredStateId.value !== null) {
          // eslint-disable-next-line max-len
          if (!(['rnodes', 'anchorrNodes'].includes(hoveredStateId.value?.layerId) && event?.layerId === 'rlinks')) {
            // when we drag a node, we want to start dragging when we leave the node, but we will stay in hovering mode.
            if (keepHovering.value) {
              dragNode.value = true
              // normal behaviours, hovering is false
            } else {
              map.value.getCanvas().style.cursor = ''
              map.value.setFeatureState(
                { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
                { hover: false },
              )
              hoveredStateId.value = null
              context.emit('offHover', event)
            }
          }
        }
      }
    }

    function selectClick (event) {
      if (isRoadMode.value) {
        if (hoveredStateId.value !== null) {
        // Get the highlighted feature
        // const features = this.map.querySourceFeatures(this.hoveredStateId.layerId)
        // this.selectedFeature = features.filter(item => item.id === this.hoveredStateId.id[0])[0]
          selectedFeature.value = hoveredStateId.value.id
          // Emit a click base on layer type (node or link)

          if (selectedFeature.value !== null) {
            if (hoveredStateId.value.layerId === 'rlinks') {
              const action = anchorMode.value ? 'anchorrNodes' : 'rnodes'
              rlinksStore.addRoadNodeInline({
                selectedIndex: selectedFeature.value,
                lngLat: event.mapboxEvent.lngLat,
                nodes: action,
              })
            }
          }
        }
      }
    }

    function linkRightClick (event) {
      if (isRoadMode.value) {
        if (hoveredStateId.value.layerId === 'rlinks') {
          contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
          contextMenu.value.showed = true
          contextMenu.value.feature = hoveredStateId.value.id
          contextMenu.value.actions =
          [
            $gettext('Edit rLink Info'),
            $gettext('Delete rLink'),
          ]
        }
      }
    }
    function actionClick (event) {
      if (event.action === 'Delete rLink') {
        rlinksStore.deleterLink({ selectedIndex: event.feature })
        // emit this click to remove the drawlink.
        context.emit('clickFeature', { action: 'Delete rLink' })
      } else {
        // edit rlinks info
        context.emit('clickFeature', {
          selectedIndex: event.feature,
          action: event.action,
          lngLat: event.coordinates,
        })
      }
      contextMenu.value.showed = false
      contextMenu.value.type = null
    }

    function contextMenuNode (event) {
      if (isRoadMode.value) {
        const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
        selectedFeature.value = features.filter(item => hoveredStateId.value.id.includes(item.id))

        if (selectedFeature.value.length > 0) {
          if (hoveredStateId.value?.layerId === 'rnodes') {
            context.emit('clickFeature', {
              selectedFeature: selectedFeature.value[0],
              action: 'Edit rNode Info',
              lngLat: event.mapboxEvent.lngLat,
            })
          } else if (hoveredStateId.value?.layerId === 'anchorrNodes') {
            rlinksStore.deleteAnchorrNode({ selectedNode: selectedFeature.value[0].properties })
          }
        }
      }
    }

    function moveNode (event) {
      if (isRoadMode.value) {
        if (event.mapboxEvent.originalEvent.button === 0 &
      ['rnodes', 'anchorrNodes'].includes(hoveredStateId.value.layerId)) {
          event.mapboxEvent.preventDefault() // prevent map control
          map.value.getCanvas().style.cursor = 'grab'
          // disable mouseLeave so we stay in hover state.
          keepHovering.value = true
          // get selected node
          const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
          selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id[0])[0]
          // disable popup
          disablePopup.value = true
          if (hoveredStateId.value.layerId === 'rnodes') {
            rlinksStore.getConnectedLinks({ selectedNode: selectedFeature.value })
          }
          // get position
          map.value.on('mousemove', onMove)
          map.value.on('mouseup', stopMovingNode)
        }
      }
    }
    function onMove (event) {
      // get position and update node position
      // only if dragmode is activated (we just leave the node hovering state.)
      if (dragNode.value && selectedFeature.value) {
        context.emit('clickFeature', { action: 'Move rNode' })
        if (hoveredStateId.value.layerId === 'anchorrNodes') {
          rlinksStore.moverAnchor({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
          // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
        } else {
          rlinksStore.moverNode({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
        }
      }
    }
    function stopMovingNode (event) {
      if (isRoadMode.value) {
        // stop tracking position (moving node.)
        map.value.getCanvas().style.cursor = 'pointer'
        map.value.off('mousemove', onMove)
        // enable popup and hovering off back. disable Dragmode
        keepHovering.value = false
        dragNode.value = false
        disablePopup.value = false
        // if we drag too quickly, offcursor it will not be call and the node will stay in hovering mode.
        // calling off scursor will break the sticky node drawlink behaviour,
        // so we only make its state back to hover-false
        map.value.getCanvas().style.cursor = ''
        map.value.setFeatureState(
          { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
          { hover: false },
        )
        hoveredStateId.value = null
        map.value.off('mouseup', stopMovingNode)
        // this will work with lag as it is the selectedFeature and not the highlighted one.}
      }
    }

    return {
      store,
      rlinksStore,
      anchorMode,
      keepHovering,
      dragNode,
      selectedPopupContent,
      selectedrGroup,
      cyclewayMode,
      renderedrLinks,
      renderedrNodes,
      renderedAnchorrNodes,
      header,
      popup,
      hoveredStateId,
      visiblerLinks,
      disablePopup,
      width,
      minZoom,
      contextMenu,
      getBounds,
      onCursor,
      offCursor,
      selectClick,
      linkRightClick,
      actionClick,
      contextMenuNode,
      moveNode,
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

}
</script>
<template>
  <section>
    <MglGeojsonLayer
      source-id="staticrLinks"
      :reactive="false"
      :source="{
        type: 'geojson',
        data: visiblerLinks ,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="staticrLinks"
      :layer="{
        type: 'line',
        maxzoom: 18, // maxZoom set in getData. else. its glitchy and dispapear before rendered appear
        minzoom: minZoom.links,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.3, 1],
          'line-width': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 2*width.static, width.static],
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
      @mouseenter="onCursor"
      @mouseleave="offCursor"
    />
    <MglGeojsonLayer
      source-id="rlinks"
      :source="{
        type: 'geojson',
        data: renderedrLinks ,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        type: 'line',
        minzoom: minZoom.links,
        paint: {
          'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.3, 1],
          'line-width': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 2*width.rendered, width.rendered],
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
      @mouseenter="onCursor"
      @mouseleave="offCursor"
      @click="selectClick"
      @contextmenu="linkRightClick"
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
        data: renderedrNodes,
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
      @mouseenter="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveNode"
      @contextmenu="contextMenuNode"
    />

    <MglGeojsonLayer
      source-id="anchorrNodes"
      :source="{
        type: 'geojson',
        data: isRoadMode? renderedAnchorrNodes: header,
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
