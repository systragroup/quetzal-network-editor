<script setup>
import Mapbox from 'mapbox-gl'
/// import MglMap from '@comp/q-mapbox/MglMap.vue'
import { MglGeojsonLayer } from 'vue-mapbox3'

import { computed, watch, ref, toRefs, onBeforeUnmount } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import arrowImage from '@static/arrow.png'
import Linestring from 'turf-linestring'

const props = defineProps(['map'])

const { map } = toRefs(props)

const connectedDrawLink = ref(false)
const drawMode = ref(false)

const drawLink = ref(Linestring([]))

watch(editorTrip, (val) => {
  if (val) {
    connectedDrawLink.value = false
  } else {
    connectedDrawLink.value = false
    drawMode.value = false
    // for some reason. isEditorMode watcher not working when creating a
    // a new line. so need to apply the values that were supposed to be applied.
    drawLink.value.geometry.coordinates = []
  }
})

watch(isEditorMode, (val) => {
  // check if map is loaded too, there is a bug if not, when component is laoded in edition mode (changing page).
  if (val && editorNodes.value.features.length > 0 && !anchorMode.value && mapIsLoaded.value) {
    drawMode.value = true
  } else {
    drawMode.value = false
    drawLink.value.geometry.coordinates = []
  }// remove drawmode if we quit edition mode.

  if (!val && drawMode.value) {
    drawMode.value = false
    drawLink.value.geometry.coordinates = []
  }
})

watch(showLeftPanel, () => {
  setTimeout(() => map.value.resize(), 250)
})
watch(anchorMode, (val) => {
  if (val) {
    drawMode.value = false
  }
})

watch(mode, (val) => {
  if (val === 'pt') {
    drawMode.value = false
  }
})

watch(drawMode, (val) => {
  // set layer visible if drawMode is true
  // check if layer exist. will bug if it is check befere rendering the layer
  if (map.value?.getStyle().layers.filter(layer => layer.id === 'drawLink').length > 0) {
    if (val) {
      map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
    } else {
      map.value.setLayoutProperty('drawLink', 'visibility', 'none')
    }
  }
})

// when the first or last node change (delete or new) change the value of those nodes.
watch(firstNode, (val) => {
  if (editorTrip.value && val) {
    drawLink.value.geometry.coordinates = [val.geometry.coordinates, val.geometry.coordinates]
    selectedNode.value.layerId = 'nodes'
    selectedNode.value.id = firstNode.value?.properties.index
  }
}, { deep: true })
watch(lastNode, (val) => {
  if (editorTrip.value && val) {
    drawLink.value.geometry.coordinates = [val.geometry.coordinates, val.geometry.coordinates]
    selectedNode.value.layerId = 'nodes'
    selectedNode.value.id = lastNode.value?.properties.index
  }
}, { deep: true })

function onMapLoaded (event) {
  if (map.value) mapIsLoaded.value = false
  const bounds = new Mapbox.LngLatBounds()
  // only use first and last point. seems to bug when there is anchor...
  if (linksStore.links.features.length > 0) {
    linksStore.links.features.forEach(link => {
      bounds.extend([link.geometry.coordinates[0],
        link.geometry.coordinates[link.geometry.coordinates.length - 1]])
    })
  } else {
    rlinksStore.rlinks.features.forEach(link => {
      bounds.extend([link.geometry.coordinates[0],
        link.geometry.coordinates[link.geometry.coordinates.length - 1]])
    })
  }

  // for empty (new) project, do not fit bounds around the links geometries.
  if (Object.keys(bounds).length !== 0) {
    event.map.fitBounds(bounds, {
      padding: 100,
    })
  }
  event.map.loadImage(arrowImage, function (err, image) {
    if (err) {
      console.error('err image', err)
      return
    }
    event.map.addImage('arrow', image, { sdf: true })
  })

  map.value = event.map
  // event.map.dragRotate.disable()
  mapIsLoaded.value = true
}

function draw (event) {
  // do not update position on connected link, this makes the node sticky
  if (Object.keys(event).includes('mapboxEvent')) {
    if (!connectedDrawLink.value) {
      // there is no mousein event, so if drawlink was put nonvisible by mouseout, we cancel here.
      if (drawMode.value && mouseout.value) {
        map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
        mouseout.value = false
      }
      if (drawMode.value && !anchorMode.value) {
        // update draw line with new geometry.
        const geometry = [drawLink.value.geometry.coordinates[0], Object.values(event.mapboxEvent.lngLat)]
        drawLink.value.geometry.coordinates = geometry
      }
    }
  }
}
function addPoint (event) {
  if (Object.keys(event).includes('mapboxEvent')) {
    event.mapboxEvent.originalEvent.stopPropagation()
    if (drawMode.value) {
      if (selectedNode.value.layerId === 'rnodes') {
        const pointGeom = Object.values(event.mapboxEvent.lngLat)
        const payload = {
          nodeIdA: selectedNode.value.id,
          nodeIdB: hoverId.value, // could be null, a node or a link.
          geom: pointGeom,
          layerId: hoverLayer.value,
        }
        // this action overwrite payload.nodeIdB to the actual newLink nodeB.
        rlinksStore.createrLink(payload)
        drawMode.value = false
        // then, create a hover (and off hover) to the new node b to continue drawing
        onHoverRoad({ layerId: 'rnodes', selectedId: [payload.nodeIdB] })
        offHover()

        // onHoverRoad (event)
      } else { // PT nodes
        if (drawMode.value && !anchorMode.value && !hoverId.value) {
          const action = (selectedNode.value.id === linksStore.lastNodeId)
            ? 'Extend Line Upward'
            : 'Extend Line Downward'
          const pointGeom = Object.values(event.mapboxEvent.lngLat)

          linksStore.applyNewLink({ nodeId: selectedNode.value.id, geom: pointGeom, action })
        }
      }
    } else {
      // for a new Line
      if (editorNodes.value.features.length === 0 && editorTrip.value) {
        linksStore.createNewNode(Object.values(event.mapboxEvent.lngLat))
        store.changeNotification({ text: '', autoClose: true })
      }
    }
  }
}
function resetDraw () {
  // reset draw line when we leave the map.
  // there is no mouseIn event, so we track it with mouseout = true, and reapply visible on mousemove.
  if (drawMode.value) {
    mouseout.value = true
    map.value.setLayoutProperty('drawLink', 'visibility', 'none')
  }
}

function rightClickMap (event) {
  // remove drawmode when we right click on map
  if (event.mapboxEvent?.originalEvent.button === 2 && !hoverId.value) {
    drawMode.value = false
  }
}
function onHover (event) {
  // no drawing when we hover on link or node
  hoverId.value = event.selectedId
  if (drawMode.value) { map.value.setLayoutProperty('drawLink', 'visibility', 'none') }
  // change hook when we hover first or last node.
  if (hoverId.value === linksStore.firstNodeId) {
    // eslint-disable-next-line max-len
    drawLink.value.geometry.coordinates = [firstNode.value.geometry.coordinates, firstNode.value.geometry.coordinates]
    selectedNode.value.id = hoverId.value
    selectedNode.value.layerId = event.layerId
    drawMode.value = true
  } else if (hoverId.value === linksStore.lastNodeId) {
    drawLink.value.geometry.coordinates = [lastNode.value.geometry.coordinates, lastNode.value.geometry.coordinates]
    selectedNode.value.id = hoverId.value
    selectedNode.value.layerId = event.layerId
    drawMode.value = true
    // linksStore.firstNodeId
  }
}

function onHoverRoad (event) {
  if (event?.layerId === 'rnodes') {
    hoverLayer.value = event.layerId
    hoverId.value = event.selectedId[0]
    if (drawMode.value) {
      // nodes are sticky. drawlink change size and style
      connectedDrawLink.value = true
    } else {
      const node = rlinksStore.renderedrNodes.features.filter(node =>
        node.properties.index === hoverId.value)[0]
      drawLink.value.geometry.coordinates = [node.geometry.coordinates, node.geometry.coordinates]
      drawMode.value = true
      connectedDrawLink.value = false
      selectedNode.value.id = hoverId.value
      selectedNode.value.layerId = hoverLayer.value
    }
  } else if (event?.layerId === 'rlinks') {
    hoverLayer.value = event.layerId
    hoverId.value = event.selectedId
  }
}
function offHover () {
  // put back visible draw line
  hoverId.value = null
  hoverLayer.value = null
  if (drawMode.value) {
    map.value.setLayoutProperty('drawLink', 'visibility', 'visible')
    connectedDrawLink.value = false
  }
}
function clickFeature (event) {
  // when we move a rNode, we need to update drawlink as it is link to this moved node.
  if (['Move rNode', 'Delete rLink'].includes(event.action)) {
    drawMode.value = false
    connectedDrawLink.value = false
  }
  // prevent emitting add road node inline when drawmode is on.
  // we will add the node inlne and create the new link in this component.
  if (!(event.action === 'Add Road Node Inline' && drawMode.value)) {
    context.emit('clickFeature', event)
  }
}
onBeforeUnmount(() => {
  try {
    saveMapPosition()
  } catch (err) {}
})

</script>
<template>
  <MglGeojsonLayer
    v-if="drawMode"
    source-id="drawLink"
    :source="{
      type: 'geojson',
      data:drawLink,
      buffer: 0,
      generateId: true,
    }"
    layer-id="drawLink"
    :layer="{
      type: 'line',
      minzoom: 2,
      paint: {
        'line-opacity': 1,
        'line-color': $vuetify.theme.current.colors.linksprimary,
        'line-width': ['case', ['boolean', connectedDrawLink, false], 5, 3],
        'line-dasharray':['case', ['boolean', connectedDrawLink, false],['literal', []] , ['literal', [0, 2, 4]]],

      }
    }"
  />
</template>
<style lang="scss" scoped>

</style>
