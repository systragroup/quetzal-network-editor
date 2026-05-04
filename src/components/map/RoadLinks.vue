<script setup lang="ts">

import { MglGeojsonLayer, MglImageLayer, MglPopup } from 'vue-mapbox3'
import { computed, ref, watch, onMounted, toRefs, onBeforeUnmount, watchEffect, onUnmounted, toRaw } from 'vue'
import MapClickSelector from '../utils/MapClickSelector.vue'
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import mapboxgl, { LngLat, MapMouseEvent, Popup } from 'mapbox-gl'
import { Map, GeoJSONSource } from 'mapbox-gl'

import { useGettext } from 'vue3-gettext'
import { cloneDeep } from 'lodash'
const { $gettext } = useGettext()
import { useForm } from '@src/composables/UseForm'
import { getAnchorGeojson } from '@src/utils/network'
import { ActionClickRoad, ContextMenuRoad, CustomMapEvent, HoverStateRoad, MapSelectorEvent } from '@src/types/mapbox'
import { baseLineString, basePoint, createLinestringFeature, GeoJsonFeatures, LineStringFeatures, LineStringGeoJson, PointFeatures } from '@src/types/geojson'
import { RoadsAction, UpdateFeatures } from '@src/types/typesStore'
import RoadLinksDraw from './RoadLinksDraw.vue'
const { openDialog } = useForm()

interface Props {
  map: Map
  isEditorMode: boolean
}

const props = defineProps<Props>()
const store = useIndexStore()
const rlinksStore = userLinksStore()

const { map, isEditorMode } = toRefs(props)
const isRoadMode = computed(() => rlinksStore.editionMode)
onMounted(() => {
  if (map.value.getLayer('links')) {
    map.value.moveLayer('rlinks', 'links')
    map.value.moveLayer('anchorrNodes', 'links')
    map.value.moveLayer('rnodes', 'links')
  }
  init()
})
watch(isRoadMode, () => init())
onBeforeUnmount(() => {
  // remove arrow layer first as it depend on rlink layer
  map.value.removeLayer('arrow-rlinks')
})

onUnmounted(() => {
  if (isRoadMode.value) { rlinksStore.cancelEdition() } // if page change. we cancel.
})

// // ctrl-z

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
function handleKeydown(event: KeyboardEvent) {
  // Check if Ctrl (or Command on Mac) and Z are pressed
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    rlinksStore.undo()
  }
  // if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
  //   event.preventDefault()
  //   rlinksStore.redo()
  // }
}
const visiblerLinks = computed(() => rlinksStore.visiblerLinks)
const visiblerNodes = computed(() => rlinksStore.visiblerNodes)

async function initLinks() {
  const links = visiblerLinks.value
  links.features.forEach((link) => link.id = link.properties.index)
  const source = map.value.getSource('rlinks') as GeoJSONSource
  if (source) {
    source.setData(links)
  }
}
async function initNodes() {
  const nodes = visiblerNodes.value
  nodes.features.forEach((node) => node.id = node.properties.index)
  const source = map.value.getSource('rnodes') as GeoJSONSource
  if (source) {
    source.setData(nodes)
  }
}
function init() {
  initLinks()
  initNodes()
}

type NetworkFeature = (LineStringFeatures | PointFeatures | UpdateFeatures)

function updateData(source: 'rlinks' | 'rnodes', array: NetworkFeature[]) {
  // update features. if properties is not provided: ex: {type:'Feature',id:'link_1'}. will delete
  // if its empty. we set Data (refresh all.)
  if (array.length === 0) {
    if (source == 'rlinks') {
      initLinks()
    } else {
      initNodes()
    }
  } else {
    const features = cloneDeep(array)
    features.forEach(el => el.id = el.properties ? el.properties.index : el.id)
    const mapSource = map.value.getSource(source) as GeoJSONSource
    if (!mapSource) return
    mapSource.updateData({ type: 'FeatureCollection', features: features as any }) // TODO: change any
  }
  rlinksStore.networkWasModified = true // mark as updated. (if nothing change. Canel will be faster)
}

const updateLinks = computed(() => { return rlinksStore.updateLinks })
const updateNodes = computed(() => { return rlinksStore.updateNodes })
watch(updateLinks, (list) => { updateData('rlinks', list) }, { flush: 'sync' })
watch(updateNodes, (list) => { updateData('rnodes', list) }, { flush: 'sync' })

const selectedPopupContent = computed(() => store.roadsPopupContent)

// init all when we change a filter.
const filtereValues = computed(() => rlinksStore.selectedrGroup)
watch(filtereValues, () => init())

function queryAnchor() {
  // query links in window and generate Anchor nodes.
  const query = map.value.queryRenderedFeatures({ layers: ['rlinks'] })
  const rlinksSet = new Set(query.map(el => el.id))
  const renderedFeatures = visiblerLinks.value.features.filter(link => rlinksSet.has(link.properties.index))
  return getAnchorGeojson(renderedFeatures)
}

const anchorMode = computed(() => { return store.anchorMode })

watchEffect(() => {
  // query nodes every time VisibleLinks, zoom and anchorMode changes.
  const source = map.value.getSource('anchorrNodes') as GeoJSONSource
  if (isRoadMode.value && anchorMode.value && currentZoom.value >= minZoom.value.anchor) {
    const anchors = queryAnchor()
    source.setData(anchors)
  } else {
    source.setData('anchorrNodes').setData(basePoint())
  }
}, { flush: 'post' }) // so its done after the source is created

async function getZoom() { currentZoom.value = map.value.getZoom() }
// width go to x3 when zoomed. go progressively (sigmoid function.)
const width = computed(() => {
  const x = currentZoom.value - minZoom.value.nodes
  const res = 2 / (1 + Math.exp(-x + 3)) + 1
  return res
})

const minZoom = ref({
  anchor: 14,
  nodes: 24, // 12. start at 24 so non visible until isRoadMode change.
})

async function getBounds() {
  // query anchors if we move on the map
  if (anchorMode.value && currentZoom.value >= minZoom.value.anchor) {
    const source = map.value.getSource('anchorrNodes') as GeoJSONSource
    const anchors = queryAnchor()
    source.setData(anchors)
  }
}

watch(isRoadMode, (val) => {
  if (val) {
    map.value.on('dragend', getBounds)
    map.value.on('zoomend', getZoom)
    getZoom() // call function immediatly so line width are update at current zoom.
    minZoom.value.nodes = 12 // set to visible
  } else {
    store.setAnchorMode(false)
    map.value.off('dragend', getBounds)
    map.value.off('zoomend', getZoom)
    minZoom.value.nodes = 24 // set to invisible.
    deselectAll() // deselect any selected links
  }
})

const popup = ref <Popup>()

const disablePopup = ref(false)

const currentZoom = ref(10)

const drawMode = ref(false)
const selectedFeature = ref<GeoJsonFeatures[]>([])

const hoveredStateId = ref<HoverStateRoad | null>(null)

watch(hoveredStateId, (newVal, oldVal) => {
  if (oldVal) {
    map.value.setFeatureState({ source: oldVal.layerId, id: oldVal.id[0] }, { hover: false })
    map.value.getCanvas().style.cursor = ''
    if (popup.value?.isOpen()) popup.value.remove()
  } if (newVal) {
    map.value.setFeatureState({ source: newVal.layerId, id: newVal.id[0] }, { hover: true })
    map.value.getCanvas().style.cursor = 'pointer'
  }
})

// hovering
function setPopup(coords: LngLat, feature: any) {
  if (popup.value?.isOpen()) popup.value.remove()
  if (!disablePopup.value && selectedPopupContent.value.length > 0) {
    const htmlContent = `
    <ul>
    ${selectedPopupContent.value
    .map(prop => `<ul>${prop}: <b>${feature.properties[prop] ?? ''}</b></ul>`)
    .join('')}
    </ul>
    `
    popup.value = new mapboxgl.Popup({ closeButton: false })
      .setLngLat(coords)
      .setHTML(htmlContent)
      .addTo(map.value)
  }
}

function onCursor (event: CustomMapEvent) {
  if (!isRoadMode.value) return
  // make sure there is no popup before creating one.

  if (!event.mapboxEvent.features) return
  // this make hovering more natural and avoid collision from node to links
  if (!hoveredStateId.value || hoveredStateId.value.layerId === 'rlinks') {
    const features = event.mapboxEvent.features as GeoJsonFeatures[]
    // get a list of all overID. if there is multiple superposed link get all of them!
    const uniqueArray = features.map(item => item.id) as string[]
    hoveredStateId.value = { layerId: event.layerId, id: uniqueArray, features: features }

    if (event.layerId === 'rlinks') {
      setPopup(event.mapboxEvent.lngLat, features[0])
    }
  }
}

function offCursor (event: CustomMapEvent) {
  if (!isRoadMode.value) return
  if (!hoveredStateId.value) return
  if (['rnodes', 'anchorrNodes'].includes(hoveredStateId.value.layerId) && event.layerId === 'rlinks') return
  hoveredStateId.value = null
}

function selectClick (event: CustomMapEvent) {
  if (drawMode.value) return
  if (!isRoadMode.value) return
  if (!hoveredStateId.value) return
  // Get the highlighted feature
  const selectedIndexes = hoveredStateId.value.id
  if (!selectedIndexes) return
  // Emit a click base on layer type (node or link)
  if (hoveredStateId.value.layerId === 'rlinks') {
    if (anchorMode.value) {
      rlinksStore.addAnchor({
        selectedIndex: selectedIndexes,
        lngLat: event.mapboxEvent.lngLat,
      })
    } else {
      rlinksStore.addNodeInline({
        selectedIndex: selectedIndexes,
        lngLat: event.mapboxEvent.lngLat,
      })
    }
  }
}

const contextMenu = ref<ContextMenuRoad>({
  coordinates: [0, 0],
  showed: false,
  actions: [],
  ids: [],
  type: null, // link of node

})

function actionClick (event: ActionClickRoad) {
  if (['Delete rLink', 'Delete Selected'].includes(event.action)) {
    rlinksStore.deleteLink(event.feature)
    // emit this click to remove the drawlink.
  } else {
    // edit rlinks info
    const action = event.action as RoadsAction
    openDialog({ action: action, selectedArr: Array.from(event.feature), lingering: true, type: 'road' })
  }
  contextMenu.value.showed = false
  deselectAll()
}

function contextMenuNode (event: CustomMapEvent) {
  // only  if roadMode or CTRL is not press
  const ctrl = event.mapboxEvent.originalEvent.ctrlKey
  if (isRoadMode.value && !ctrl) {
    if (!hoveredStateId.value?.layerId) return
    const features = map.value.querySourceFeatures(hoveredStateId.value.layerId)
    const ids = hoveredStateId.value.id
    selectedFeature.value = features.filter(item => ids.includes(item.id as string)) as GeoJsonFeatures[]
    if (selectedFeature.value.length > 0) {
      const point = selectedFeature.value[0] as PointFeatures
      if (hoveredStateId.value?.layerId === 'rnodes') {
        const index = point.properties.index
        openDialog({ action: 'Edit rNode Info', selectedArr: [index], lingering: true, type: 'road' })
      } else if (hoveredStateId.value?.layerId === 'anchorrNodes') {
        rlinksStore.deleteAnchorNode({
          linkIndex: point.properties.linkIndex,
          coordinatedIndex: point.properties.coordinatedIndex,
        })
      }
    }
  }
}
// list (set) of selected RoadLinks when selecting multiple with righ click.
const selectedIds = ref<Set<string>>(new Set([]))

function toggleSelected(val: boolean) {
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

function rightClickOnMap(event: MapMouseEvent) {
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

function linkRightClick (event: CustomMapEvent) {
  if (isRoadMode.value && hoveredStateId.value?.layerId === 'rlinks') {
    if (!contextMenu.value.showed) {
      contextMenu.value.coordinates = [event.mapboxEvent.lngLat.lng, event.mapboxEvent.lngLat.lat]
    }
    contextMenu.value.showed = true

    const ctrl = event.mapboxEvent.originalEvent.ctrlKey
    if (ctrl) {
      selectedIds.value = new Set([...selectedIds.value, ...hoveredStateId.value.id])
      toggleSelected(true)
      contextMenu.value.ids = [...cloneDeep(selectedIds.value)]
      contextMenu.value.actions
          = [
          { name: 'Edit Road Group Info', text: $gettext('Edit selected Info') },
          { name: 'Delete Selected', text: $gettext('Delete Selected') },
        ]
    }
    else {
      toggleSelected(false)
      selectedIds.value = new Set([])
      contextMenu.value.ids = cloneDeep(hoveredStateId.value.id)
      contextMenu.value.actions = [
        { name: 'Edit rLink Info', text: $gettext('Edit rLink Info') },
        { name: 'Delete rLink', text: $gettext('Delete rLink') },
      ]
    }
  }
}

function contextMenuSelection (event: MapSelectorEvent) {
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
    // put it in the navbar popup
    contextMenu.value.coordinates = null
    contextMenu.value.ids = [...cloneDeep(selectedIds.value)]
    contextMenu.value.actions
          = [
        { name: 'Edit Road Group Info', text: $gettext('Edit selected Info') },
        { name: 'Delete Selected', text: $gettext('Delete Selected') },
      ]
  } else {
    contextMenu.value.showed = false
  }
}

//
// moving
//

const movingLine = ref<LineStringGeoJson>(baseLineString())
const hasMoved = ref(false)

function stopMoving() {
  // remove temp linestring
  movingLine.value = baseLineString()
  // stop tracking position (moving node.)
  map.value.getCanvas().style.cursor = 'pointer'
  // enable popup and hovering off back. disable Dragmode
  disablePopup.value = false
  hasMoved.value = false
}

function startMoving(event: CustomMapEvent) {
  // disable popup
  disablePopup.value = true
  // prevent map control
  event.mapboxEvent.preventDefault()
  map.value.getCanvas().style.cursor = 'grab'
  // disable mouseLeave so we stay in hover state.
}

function moveNode (event: CustomMapEvent) {
  if (!isRoadMode.value) return
  if (event.mapboxEvent.originalEvent.button !== 0) return
  if (!hoveredStateId.value) return

  // get selected node
  selectedFeature.value = hoveredStateId.value.features
  const selectedNode = selectedFeature.value[0] as PointFeatures
  const nodeIndex = selectedNode.properties.index

  // get links connected to the node
  // update the position of the movingLine
  const b = cloneDeep(visiblerLinks.value.features.filter(link => link.properties.b === nodeIndex))
  const a = cloneDeep(visiblerLinks.value.features.filter(link => link.properties.a === nodeIndex))
  const features: LineStringFeatures[] = []
  a.forEach(link => features.push(createLinestringFeature(link.geometry.coordinates)))
  b.forEach(link => features.push(createLinestringFeature(link.geometry.coordinates.toReversed())))

  movingLine.value.features = features
  startMoving(event)
  // get position
  map.value.on('mousemove', onMove)
  map.value.on('mouseup', stopMovingNode)
}

function moveAnchorNode(event: CustomMapEvent) {
  if (!isRoadMode.value) return
  if (event.mapboxEvent.originalEvent.button !== 0) return
  if (!hoveredStateId.value) return
  const selected = hoveredStateId.value.features
  if (!selected) return //  sometime its undefined...
  selectedFeature.value = selected

  const linkIndex = selectedFeature.value[0].properties.linkIndex
  const link = cloneDeep(visiblerLinks.value.features.filter(link => link.properties.index === linkIndex)[0])
  movingLine.value.features = [createLinestringFeature(link.geometry.coordinates)]
  startMoving(event)
  map.value.on('mousemove', onMoveAnchor)
  map.value.on('mouseup', stopMovingAnchor)
}

function onMove (event: MapMouseEvent) {
  drawMode.value = false
  hasMoved.value = true
  movingLine.value.features.forEach(link => link.geometry.coordinates[0] = Object.values(event.lngLat))
}

function onMoveAnchor (event: MapMouseEvent) {
  drawMode.value = false
  hasMoved.value = true
  const index = selectedFeature.value[0].properties.coordinatedIndex
  movingLine.value.features[0].geometry.coordinates[index] = Object.values(event.lngLat)
}

function stopMovingNode() {
  if (!selectedFeature.value) return
  if (hasMoved.value) {
    const selected = selectedFeature.value[0] as PointFeatures
    const geom = movingLine.value.features[0].geometry.coordinates[0]
    rlinksStore.moverNode({ selectedNode: selected, lngLat: geom })
    // hoveredStateId.value = null
  }
  stopMoving()
  map.value.off('mousemove', onMove)
  map.value.off('mouseup', stopMovingNode)
}

function stopMovingAnchor() {
  if (!selectedFeature.value) return
  if (hasMoved.value) {
    const selected = selectedFeature.value[0] as PointFeatures
    const index = selected.properties.coordinatedIndex
    const geom = movingLine.value.features[0].geometry.coordinates[index]
    rlinksStore.moverAnchor({ selectedNode: selected, lngLat: toRaw(geom) })

    // hoveredStateId.value = null
  }
  stopMoving()
  map.value.off('mousemove', onMoveAnchor)
  map.value.off('mouseup', stopMovingAnchor)
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
    <RoadLinksDraw
      v-model="drawMode"
      :map="map"
      :hovered-state-id="hoveredStateId"
    />
    <MapClickSelector
      v-if="isRoadMode"
      :map="map"
      @mouseup="contextMenuSelection"
    />

    <MglGeojsonLayer
      source-id="movingLine"
      :source="{
        type: 'geojson',
        data: movingLine,
        buffer: 0,
        promoteId: 'index',
      }"
      layer-id="movingLine"
      :layer="{
        type: 'line',
        minzoom: 2,
        paint: {
          'line-color': $vuetify.theme.current.colors.linkssecondary,
          'line-width': 3,
          'line-dasharray':['literal', [0, 2, 4]],
        }
      }"
    />

    <MglGeojsonLayer
      source-id="rlinks"
      :reactive="false"
      :source="{
        type: 'geojson',
        dynamic:true,
        data: baseLineString() ,
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
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 6*width, 3*width],
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
        data: basePoint(),
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
          'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 6*width, 3*width],
          'circle-blur': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0],
          'circle-stroke-color': $vuetify.theme.current.colors.darkgrey,
          'circle-stroke-width': 2,
        },
      }"
      @click="selectClick"
      @mouseover="onCursor"
      @mouseleave="offCursor"
      @mousedown="moveAnchorNode"
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
        @mouseleave="()=>{if (selectedIds.size === 0) contextMenu.showed=false}"
      >
        <v-list
          density="compact"
        >
          <v-list-item
            v-for="(action,key) in contextMenu.actions"
            :key="key"
          >
            <v-btn
              variant="outlined"
              size="small"
              @click="actionClick({action: action.name,
                                   feature: contextMenu.ids})"
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
          v-for="(action,key) in contextMenu.actions"
          :key="key"
        >
          <v-btn
            variant="outlined"
            size="small"
            @click="actionClick({action: action.name,
                                 feature: contextMenu.ids})"
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
