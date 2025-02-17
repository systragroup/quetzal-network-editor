<!-- eslint-disable no-return-assign -->
<script setup>
import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox3'
import short from 'short-uuid'
import { computed, watch, toRefs, ref, onUnmounted } from 'vue'
import { useODStore } from '@src/store/od'
import geojson from '@constants/geojson'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { useForm } from '@src/composables/UseForm'
const { openDialog } = useForm()
const props = defineProps(['map', 'isODMode', 'isEditorMode'])
const header = geojson
const ODStore = useODStore()
const layer = computed(() => { return ODStore.visibleLayer })
const nodes = computed(() => { return ODStore.nodes })

const { isODMode, map } = toRefs(props)
watch(isODMode, (val) => {
  if (val) {
    map.value.on('click', addPoint)
  } else {
    map.value.off('click', addPoint)
    // remove all. as you could change mode as you're moving a node or creating one.
    // this will juste create the OD and stop its edition.
    map.value.off('mousemove', onMove)
    map.value.off('mouseup', stopMovingNode)
    keepHovering.value = false
    dragNode.value = false
    hoveredStateId.value = null
    drawMode.value = false
  }
})
onUnmounted(() => { map.value.off('click', addPoint) })

const hoveredStateId = ref(null)
const keepHovering = ref(false)
const dragNode = ref(false)
const drawMode = ref(false)
const selectedFeature = ref(null)
const contextMenu = ref({
  coordinates: [0, 0],
  showed: false,
  actions: [],
  feature: null,
})

function addPoint (event) {
  if (isODMode.value) {
    if (!drawMode.value) {
      const index = 'OD_' + short.generate()
      ODStore.createNewLink({ lngLat: Object.values(event.lngLat), index })
      dragNode.value = true
      selectedFeature.value = { properties: { linkIndex: index, coordinatedIndex: 1 } }
      // get position
      drawMode.value = true
      map.value.on('mousemove', onMove)
      // map.value.on('mouseup', stopMovingNode)
    } else {
      // here. we dont want the second click to do anything except act like a stop moving node.
      drawMode.value = false
      stopMovingNode(event)
    }
  }
}

function onCursor (event) {
  if (isODMode.value) {
    if (hoveredStateId.value === null) {
      map.value.getCanvas().style.cursor = 'pointer'
      // get a list of all overID. if there is multiple superposed link get all of them!
      const uniqueArray = [...new Set(event.mapboxEvent.features.map(item => item.id))]
      hoveredStateId.value = { layerId: event.layerId, id: uniqueArray }
      map.value.setFeatureState(
        { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
        { hover: true },
      )
    }
  }
}

function offCursor () {
  if (isODMode.value) {
    if (hoveredStateId.value !== null) {
      // eslint-disable-next-line max-len
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
        // this.$emit('offHover', event)
      }
    }
  }
}

function moveNode (event) {
  if (isODMode.value && !drawMode.value && hoveredStateId.value?.layerId === 'ODNodes') {
    if (event.mapboxEvent.originalEvent.button === 0) {
      event.mapboxEvent.preventDefault() // prevent map control
      map.value.getCanvas().style.cursor = 'grab'
      // disable mouseLeave so we stay in hover state.
      keepHovering.value = true
      // get selected node
      const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
      selectedFeature.value = features.filter(item => item.id === hoveredStateId.value.id[0])[0]
      // get position
      if (selectedFeature.value?.properties) {
        map.value.on('mousemove', onMove)
        map.value.on('mouseup', stopMovingNode)
      }
    }
  }
}
function onMove (event) {
  // get position and update node position
  // only if dragmode is activated (we just leave the node hovering state.)
  if (dragNode.value && selectedFeature.value) {
    ODStore.moveNode({
      selectedNode: selectedFeature.value,
      lngLat: Object.values(event.lngLat),
    })
    // rerender the anchor as they are getter and are not directly modified by the moverAnchor mutation.
    // this.renderedAnchorrNodes.features = this.anchorrNodes.features.filter(node =>
    //  booleanContains(this.bbox, node))
  }
}
function stopMovingNode (event) {
  // console.log(event.originalEvent.button)
  if (isODMode.value && event.originalEvent.button === 0) {
    // stop tracking position (moving node.)
    map.value.getCanvas().style.cursor = 'pointer'
    map.value.off('mousemove', onMove)

    // enable popup and hovering off back. disable Dragmode
    keepHovering.value = false
    dragNode.value = false
    // if we drag too quickly, offcursor it will not be call and the node will stay in hovering mode.
    // calling offscursor will break the sticky node drawlink behaviour, so we only make its state back to hover-false
    map.value.getCanvas().style.cursor = ''
    if (hoveredStateId.value) {
      map.value.setFeatureState(
        { source: hoveredStateId.value.layerId, id: hoveredStateId.value.id[0] },
        { hover: false },
      )
    }
    hoveredStateId.value = null
    drawMode.value = false
    map.value.off('mouseup', stopMovingNode)
  }
}
function linkRightClick (event) {
  if (isODMode.value && !drawMode.value) {
    contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
    contextMenu.value.showed = true
    contextMenu.value.feature = hoveredStateId.value.id
    contextMenu.value.actions
          = [
        { name: 'Edit OD Info', text: $gettext('Edit OD Info') },
        { name: 'Delete OD', text: $gettext('Delete OD') },
      ]
  }
}
function actionClick (event) {
  if (event.action === 'Edit OD Info') {
    openDialog({ action: 'Edit OD Info', selectedArr: event.feature, lingering: false, type: 'od' })
  } else {
    ODStore.deleteOD(event.feature)
  }

  contextMenu.value.showed = false
  contextMenu.value.type = null
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
              @click="actionClick({action: action.name,
                                   feature: contextMenu.feature,
                                   coordinates: contextMenu.coordinates})"
            >
              {{ $gettext(action.text) }}
            </v-btn>

          </v-list-item>
        </v-list>
      </span>
    </MglPopup>
  </section>
</template>
<style lang="scss" scoped>

</style>
