<script setup>

import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox3'
import { computed, ref, watch, onMounted, toRefs, onBeforeUnmount, watchEffect } from 'vue'
import MapClickSelector from '../utils/MapClickSelector.vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import mapboxgl from 'mapbox-gl'
import Point from 'turf-point'
import short from 'short-uuid'

import geojson from '@constants/geojson'
import { useGettext } from 'vue3-gettext'
import { cloneDeep } from 'lodash'
const { $gettext } = useGettext()

const props = defineProps(['map', 'isEditorMode', 'isRoadMode'])
const emits = defineEmits(['clickFeature', 'onHover', 'offHover', 'select'])
// defineExpose({ init })
const store = useIndexStore()
const rlinksStore = userLinksStore()

const { map, isRoadMode } = toRefs(props)
onMounted(() => {
  if (map.value.getLayer('links')) {
    map.value.moveLayer('rlinks', 'links')
    map.value.moveLayer('anchorrNodes', 'links')
    map.value.moveLayer('rnodes', 'links')
  }
  init()
})
onBeforeUnmount(() => {
  // remove arrow layer first as it depend on rlink layer
  map.value.removeLayer('arrow-rlinks')
})

async function initLinks() {
  const links = visiblerLinks.value
  links.features.forEach((link) => link.id = link.properties.index)
  map.value.getSource('rlinks').setData(links)
}
async function initNodes() {
  const nodes = visiblerNodes.value
  nodes.features.forEach((node) => node.id = node.properties.index)
  map.value.getSource('rnodes').setData(nodes)
}
function init() {
  initLinks()
  initNodes()
}
const selectedPopupContent = computed(() => { return store.roadsPopupContent })
const visiblerLinks = computed(() => { return rlinksStore.visiblerLinks })
const visiblerNodes = computed(() => { return rlinksStore.visiblerNodes })
function queryAnchor() {
  // query links in window and generate Anchor nodes.
  const query = map.value.queryRenderedFeatures({ layers: ['rlinks'] })
  const rlinksSet = new Set(query.map(el => el.id))
  const renderedFeatures = visiblerLinks.value.features.filter(link => rlinksSet.has(link.properties.index))
  const nodes = cloneDeep(geojson)
  renderedFeatures.filter(link => link.geometry.coordinates.length > 2).forEach(
    feature => {
      const linkIndex = feature.properties.index
      feature.geometry.coordinates.slice(1, -1).forEach(
        (point, idx) => nodes.features.push(Point(
          point,
          { index: short.generate(), linkIndex, coordinatedIndex: idx + 1 },
        ),
        ),

      )
    },
  )
  return nodes
}

const anchorMode = computed(() => { return store.anchorMode })

watchEffect(() => {
  // query nodes every time VisibleLinks, zoom and anchorMode changes.
  if (isRoadMode.value && anchorMode.value && currentZoom.value >= minZoom.value.anchor) {
    const anchors = queryAnchor()
    map.value.getSource('anchorrNodes').setData(anchors)
  } else {
    map.value.getSource('anchorrNodes').setData(geojson)
  }
}, { flush: 'post' }) // so its done after the source is created

const popup = ref(null)
const hoveredStateId = ref(null)
const disablePopup = ref(false)
const currentZoom = ref(10)
// width go to x3 when zoomed. go progressively (sigmoid function.)
const width = computed(() => {
  const x = currentZoom.value - minZoom.value.nodes
  const res = 2 / (1 + Math.exp(-x + 3)) + 1
  return res
})

const minZoom = ref({
  anchor: 14,
  nodes: 12,
})

async function getZoom() { currentZoom.value = map.value.getZoom() }

async function getBounds() {
  // query anchors if we move on the map
  if (anchorMode.value && currentZoom.value >= minZoom.value.anchor) {
    const anchors = queryAnchor()
    map.value.getSource('anchorrNodes').setData(anchors)
  }
}

watch(isRoadMode, (val) => {
  if (val) {
    map.value.on('dragend', getBounds)
    map.value.on('zoomend', getZoom)
    minZoom.value.nodes = 12
  } else {
    store.setAnchorMode(false)
    map.value.off('dragend', getBounds)
    map.value.off('zoomend', getZoom)
    minZoom.value.nodes = 24
  }
}, { immediate: true })

const keepHovering = ref(false)
const dragNode = ref(false)
const selectedFeature = ref('')

function onCursor (event) {
  if (isRoadMode.value) {
    if (popup.value?.isOpen()) popup.value.remove() // make sure there is no popup before creating one.
    if (hoveredStateId.value === null || hoveredStateId.value.layerId === 'rlinks') {
      if (!disablePopup.value && selectedPopupContent.value.length > 0) {
        const selectedFeature = event.mapboxEvent.features[0]
        if (selectedFeature.layer.id === 'rlinks') {
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
      if (!selected.value) {
        emits('onHover', { layerId: hoveredStateId.value.layerId, selectedId: hoveredStateId.value.id }) }
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
          emits('offHover', event)
        }
      }
    }
  }
}

function selectClick (event) {
  if (isRoadMode.value) {
    if (hoveredStateId.value !== null) {
      // Get the highlighted feature
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

function updateData(source, array) {
  // update features. if properties is not provided: ex: {type:'Feature',id:'link_1'}. will delete
  // if its empty. we set Data (refresh all.)
  if (array.length === 0) {
    init()
  } else {
    const features = cloneDeep(array)
    features.forEach(el => el.id = el.properties ? el.properties.index : el.id)
    const mapSource = map.value.getSource(source)
    mapSource.updateData({ type: 'FeatureCollection', features: features })
  // features.forEach(feature => mapSource.updateData(feature))
  }
}

const updateLinks = computed(() => { return rlinksStore.updateLinks })
const updateNodes = computed(() => { return rlinksStore.updateNodes })
watch(updateLinks, (list) => { updateData('rlinks', list) }, { flush: 'sync' })
watch(updateNodes, (list) => { updateData('rnodes', list) }, { flush: 'sync' })

const contextMenu = ref({
  coordinates: [0, 0],
  showed: false,
  actions: [],
  feature: null,
})

function actionClick (event) {
  if (['Delete rLink', 'Delete Selected'].includes(event.action)) {
    rlinksStore.deleterLink({ selectedIndex: event.feature })
    // emit this click to remove the drawlink.
    emits('clickFeature', { action: 'Delete rLink' })
  } else {
    // edit rlinks info
    emits('clickFeature', {
      selectedIndex: event.feature,
      action: event.action,
      lngLat: event.coordinates,
    })
  }
  contextMenu.value.showed = false
  deselectAll()
}

function contextMenuNode (event) {
  // only  if roadMode or CTRL is not press
  const ctrl = event.mapboxEvent.originalEvent.ctrlKey
  if (isRoadMode.value && !ctrl) {
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    selectedFeature.value = features.filter(item => hoveredStateId.value.id.includes(item.id))

    if (selectedFeature.value.length > 0) {
      if (hoveredStateId.value?.layerId === 'rnodes') {
        emits('clickFeature', {
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
// list (set) of selected RoadLinks when selecting multiple with righ click.
const selectedIds = ref(new Set([]))

function toggleSelected(val) {
  selectedIds.value.forEach(id => {
    map.value.setFeatureState(
      { source: 'rlinks', id: id },
      { select: val },
    )
  })
}

function deselectAll() {
  toggleSelected(false)
  selectedIds.value = new Set([])
  contextMenu.value.showed = false
}

function rightClickOnMap(event) {
  if (!event.originalEvent.ctrlKey && event.originalEvent.button === 2) {
    deselectAll()
  }
}
// when we click or right click on the map. deselect all.
onMounted(() => {
  map.value.on('mousedown', rightClickOnMap)
  map.value.on('click', deselectAll)
})
onBeforeUnmount(() => {
  map.value.off('mousedown', rightClickOnMap)
  map.value.off('click', deselectAll)
})

// if someting is selected.
const selected = computed(() => selectedIds.value.size > 0)
watch(selected, (val) => emits('select', val))

function linkRightClick (event) {
  if (isRoadMode.value && hoveredStateId.value?.layerId === 'rlinks') {
    if (!contextMenu.value.showed) {
      contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
    }
    contextMenu.value.showed = true

    const ctrl = event.mapboxEvent.originalEvent.ctrlKey
    if (ctrl) {
      selectedIds.value = new Set([...selectedIds.value, ...hoveredStateId.value.id])
      toggleSelected(true)
      contextMenu.value.feature = cloneDeep(selectedIds)
      contextMenu.value.actions
          = [
          { name: 'Edit selected Info', text: $gettext('Edit selected Info') },
          { name: 'Delete Selected', text: $gettext('Delete Selected') },
        ]
    }
    else {
      toggleSelected(false)
      selectedIds.value = new Set([])
      contextMenu.value.feature = cloneDeep(hoveredStateId.value.id)
      contextMenu.value.actions = [
        { name: 'Edit rLink Info', text: $gettext('Edit rLink Info') },
        { name: 'Delete rLink', text: $gettext('Delete rLink') },
      ]
    }
  }
}

function contextMenuSelection (event) {
  const ctrl = event.mapboxEvent.originalEvent.ctrlKey
  if (ctrl) {
    selectedIds.value = new Set([...selectedIds.value, ...event.selectedId])
  } else {
    toggleSelected(false)
    selectedIds.value = event.selectedId
  }
  toggleSelected(true)

  if (selectedIds.value.size > 0) {
    contextMenu.value.showed = true
    // put it in the nsakbar popup
    contextMenu.value.coordinates = null
    contextMenu.value.feature = cloneDeep(selectedIds)
    contextMenu.value.actions
          = [
        { name: 'Edit selected Info', text: $gettext('Edit selected Info') },
        { name: 'Delete Selected', text: $gettext('Delete Selected') },
      ]
  } else {
    contextMenu.value.showed = false
  }
}

function moveNode (event) {
  if (isRoadMode.value) {
    if (event.mapboxEvent.originalEvent.button === 0
      & ['rnodes', 'anchorrNodes'].includes(hoveredStateId.value.layerId)) {
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
    if (hoveredStateId.value.layerId === 'anchorrNodes') {
      rlinksStore.moverAnchor({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
    } else {
      // when we move a rNode, we need to update drawlink as it is link to this moved node.
      emits('clickFeature', { action: 'Move rNode' })
      rlinksStore.moverNode({ selectedNode: selectedFeature.value, lngLat: Object.values(event.lngLat) })
    }
  }
}
function stopMovingNode () {
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

const cyclewayMode = computed(() => { return store.cyclewayMode })

const ArrowSizeCondition = computed(() => {
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
    ['case', ['to-boolean', ['to-number', ['get', 'oneway']]], 0.1 * width.value, 0],
    0.1 * width.value]

  const getRouteWidth = ['case', ['has', 'route_width'],
    ['case', ['to-boolean', ['to-number', ['get', 'route_width']]],
      ['to-number', ['get', 'route_width']], 2], 2]

  if (cyclewayMode.value) {
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
})

const ArrowDirCondition = computed(() => {
  if (cyclewayMode.value) {
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
})

</script>
<template>
  <section>
    <MapClickSelector
      v-if="isRoadMode"
      :map="map"
      @mouseup="contextMenuSelection"
    />

    <MglGeojsonLayer
      source-id="rlinks"
      :reactive="false"
      :source="{
        type: 'geojson',
        dynamic:true,
        data: visiblerLinks ,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rlinks"
      :layer="{
        type: 'line',
        paint: {
          'line-color': ['case', ['boolean', ['feature-state', 'select'], false], '#87FFF3', ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary]],
          'line-opacity': ['case', ['boolean', isEditorMode, false], 0.3, 1],
          'line-width': ['*',['case', ['boolean', ['feature-state', 'hover'], false], 2*width, width],
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
        minzoom: minZoom.nodes,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 200,
          'icon-ignore-placement': true,
          'icon-image':'arrow',
          'icon-size': ArrowSizeCondition,
          'icon-rotate': ArrowDirCondition,
        },
        paint: {
          'icon-color': ['case', ['boolean', ['feature-state', 'select'], false], '#87FFF3', ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], $vuetify.theme.current.colors.linksprimary]],
        }
      }"
    />

    <MglGeojsonLayer
      source-id="rnodes"
      :reactive="false"
      :source="{
        type: 'geojson',
        dynamic: true,
        data: visiblerNodes,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="rnodes"
      :layer="{
        type: 'circle',
        minzoom: minZoom.nodes,
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
      :reactive="false"
      :source="{
        type: 'geojson',
        data: geojson,
        dynamic:false,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="anchorrNodes"
      :layer="{
        type: 'circle',
        minzoom: minZoom.anchor,
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
      v-if="contextMenu.coordinates!==null"
      :close-button="false"
      :showed="contextMenu.showed"
      :coordinates="contextMenu.coordinates"
      :close-on-click="false"
      @close="contextMenu.showed=false"
    >
      <span
        @mouseleave="()=>{if (!selected) contextMenu.showed=false}"
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
    <v-snackbar
      v-else
      v-model="contextMenu.showed"
      :close-button="false"
      :coordinates="contextMenu.coordinates"
      timeout="-1"
      class="snackbar"
    >
      <v-list density="compact">
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
    </v-snackbar>
  </section>
</template>
<style lang="scss" scoped>

</style>
