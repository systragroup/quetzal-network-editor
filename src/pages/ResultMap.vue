<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglScaleControl, MglGeojsonLayer } from 'vue-mapbox'
import StaticLinks from './StaticLinks.vue'
import EditorLinks from './EditorLinks.vue'
import RoadLinks from './RoadLinks.vue'
import Settings from './Settings.vue'
import { mapboxPublicKey } from '@src/config.js'
import arrowImage from '@static/arrow.png'
import Linestring from 'turf-linestring'

// Filter links from selected line
const $gettext = s => s

export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglScaleControl,
    MglGeojsonLayer,
    StaticLinks,
    EditorLinks,
    RoadLinks,
    Settings,
  },
  props: {
    selectedTrips: {
      type: Array,
      default: () => [],
    },
    isRoadMode: {
      type: Boolean,
      default: false,
    },

  },
  events: ['clickFeature'],
  data () {
    return {
      mapboxPublicKey: null,
      selectedFeature: null,
      isEditorMode: false,
      mapIsLoaded: false,
      drawMode: false,
      hoverId: null,
      hoverLayer: null,
      mapDiv: null,
      drawLink: null,
      mouseout: false,
      selectedNode: { id: null, layerId: null },
      connectedDrawLink: false,
      showSettings: false,
    }
  },
  computed: {

    showLeftPanel () {
      return this.$store.getters.showLeftPanel
    },
    editorTrip () {
      return this.$store.getters.editorTrip
    },
    editorNodes () {
      return this.$store.getters.editorNodes
    },
    firstNode () {
      return this.$store.getters.firstNode
    },
    lastNode () {
      return this.$store.getters.lastNode
    },
    anchorMode () { return this.$store.getters.anchorMode },
  },
  watch: {
    showLeftPanel () {
      setTimeout(() => this.map.resize(), 250)
    },
    anchorMode (val) {
      if (val) {
        this.drawMode = false
        this.$store.commit('changeNotification',
          { text: $gettext('Left click to add an anchor point, right click to delete'), autoClose: false })
      } else {
        this.$store.commit('changeNotification', { text: '', autoClose: true })
      }
    },
    isRoadMode (val) {
      if (!val) {
        this.drawMode = false
      }
    },

    editorNodes (newVal, oldVal) {
      this.$store.commit('setAnchorMode', false)
      this.isEditorMode = (newVal.features.length > 0)
      if (this.isEditorMode) {
        if (this.$store.getters.changeBounds) {
          const bounds = new Mapbox.LngLatBounds()
          newVal.features.forEach(node => {
            bounds.extend(node.geometry.coordinates)
          })
          this.map.fitBounds(bounds, {
            padding: 100,
          })
        }
      }
    },

    drawMode (val) {
      // set layer visible if drawMode is true
      // check if layer exist. will bug if it is check befere rendering the layer
      if (this.map?.getStyle().layers.filter(layer => layer.id === 'drawLink').length > 0) {
        if (val) {
          this.map.setLayoutProperty('drawLink', 'visibility', 'visible')
        } else {
          this.map.setLayoutProperty('drawLink', 'visibility', 'none')
        }
      }
    },

    editorTrip (val) {
      if (val) {
        this.isEditorMode = true
        this.connectedDrawLink = false
      }
    },
    isEditorMode (val) {
      // check if map is loaded too, there is a bug if not, when component is laoded in edition mode (changing page).
      if (val && this.editorNodes.features.length > 0 && !this.anchorMode && this.mapIsLoaded) {
        this.drawMode = true
      } else {
        this.drawMode = false
      }// remove drawmode if we quit edition mode.
      if (!val & this.drawMode) {
        this.drawMode = false
      }
    },
    // when the first or last node change (delete or new) change the value of those nodes.
    'firstNode.geometry.coordinates' (val) {
      if (this.editorTrip) {
        this.drawLink = Linestring([val, val])
        this.selectedNode.layerId = 'nodes'
        this.selectedNode.id = this.firstNode.properties.index
      }
    },
    'lastNode.geometry.coordinates' (val) {
      if (this.editorTrip) {
        this.drawLink = Linestring([val, val])
        this.selectedNode.layerId = 'nodes'
        this.selectedNode.id = this.lastNode.properties.index
      }
    },
  },
  created () {
    if (this.editorTrip) { this.isEditorMode = true }
    this.mapboxPublicKey = mapboxPublicKey
    this.drawLink = structuredClone(this.$store.getters.linksHeader)
  },

  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds()
      // only use first and last point. seems to bug when there is anchor...
      if (this.$store.getters.links.features.length > 0) {
        this.$store.getters.links.features.forEach(link => {
          bounds.extend([link.geometry.coordinates[0],
            link.geometry.coordinates[link.geometry.coordinates.length - 1]])
        })
      } else {
        this.$store.getters.rlinks.features.forEach(link => {
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

      this.map = event.map
      event.map.dragRotate.disable()
      this.mapIsLoaded = true
    },

    draw (event) {
      // do not update position on connected link, this makes the node sticky
      if (!this.connectedDrawLink) {
        // there is no mousein event, so if drawlink was put nonvisible by mouseout, we cancel here.
        if (this.drawMode && this.mouseout) {
          this.map.setLayoutProperty('drawLink', 'visibility', 'visible')
          this.mouseout = false
        }
        if (this.drawMode && !this.anchorMode) {
        // update draw line with new geometry.
          const geometry = [this.drawLink.geometry.coordinates[0], Object.values(event.mapboxEvent.lngLat)]
          this.drawLink = Linestring(geometry)
        }
      }
    },
    addPoint (event) {
      if (this.drawMode) {
        if (this.selectedNode.layerId === 'rnodes') {
          const pointGeom = Object.values(event.mapboxEvent.lngLat)
          const payload = {
            nodeIdA: this.selectedNode.id,
            nodeIdB: this.hoverId, // could be null, a node or a link.
            geom: pointGeom,
            layerId: this.hoverLayer,
          }
          // this action overwrite payload.nodeIdB to the actual newLink nodeB.
          this.$store.commit('createrLink', payload)
          this.drawMode = false
          // then, create a hover (and off hover) to the new node b to continue drawing
          this.onHoverRoad({ layerId: 'rnodes', selectedId: [payload.nodeIdB] })
          this.offHover()

          // onHoverRoad (event)
          this.$refs.roadref.getBounds()
        } else { // PT nodes
          if (this.drawMode & !this.anchorMode & !this.hoverId) {
            const action = (this.selectedNode.id === this.$store.getters.lastNodeId)
              ? 'Extend Line Upward'
              : 'Extend Line Downward'
            const pointGeom = Object.values(event.mapboxEvent.lngLat)

            this.$store.commit('applyNewLink', { nodeId: this.selectedNode.id, geom: pointGeom, action: action })
          }
        }
      } else {
        // for a new Line
        if (this.editorNodes.features.length === 0 && this.editorTrip) {
          this.$store.commit('createNewNode', Object.values(event.mapboxEvent.lngLat))
          this.$store.commit('changeNotification', { text: '', autoClose: true })
        }
      }
    },
    resetDraw (event) {
      // reset draw line when we leave the map.
      // there is no mouseIn event, so we track it with mouseout = true, and reapply visible on mousemove.
      if (this.drawMode) {
        this.mouseout = true
        this.map.setLayoutProperty('drawLink', 'visibility', 'none')
      }
    },

    rightClickMap (event) {
      // remove drawmode when we right click on map
      if (event.mapboxEvent.originalEvent.button === 2 & !this.hoverId) {
        this.drawMode = false
      }
    },
    onHover (event) {
      // no drawing when we hover on link or node
      this.hoverId = event.selectedId
      if (this.drawMode) { this.map.setLayoutProperty('drawLink', 'visibility', 'none') }
      // change hook when we hover first or last node.
      if ([this.$store.getters.lastNodeId, this.$store.getters.firstNodeId].includes(this.hoverId)) {
        const node = this.$store.getters.editorNodes.features.filter(node =>
          node.properties.index === event.selectedId)
        this.drawLink = Linestring([node[0].geometry.coordinates, node[0].geometry.coordinates])
        this.selectedNode.id = this.hoverId
        this.selectedNode.layerId = event.layerId

        this.drawMode = true
      }
    },
    onHoverRoad (event) {
      if (event?.layerId === 'rnodes') {
        this.hoverLayer = event.layerId
        this.hoverId = event.selectedId[0]
        if (this.drawMode) {
          // nodes are sticky. drawlink change size and style
          this.connectedDrawLink = true
        } else {
          this.connectedDrawLink = false
          const node = this.$store.getters.visiblerNodes.features.filter(node =>
            node.properties.index === this.hoverId)
          this.drawLink = Linestring([node[0].geometry.coordinates, node[0].geometry.coordinates])
          this.drawMode = true
          this.connectedDrawLink = false
          this.selectedNode.id = this.hoverId
          this.selectedNode.layerId = this.hoverLayer
        }
      } else if (event?.layerId === 'rlinks') {
        this.hoverLayer = event.layerId
        this.hoverId = event.selectedId
      }
    },
    offHover (event) {
      // put back visible draw line
      this.hoverId = null
      this.hoverLayer = null
      if (this.drawMode) {
        this.map.setLayoutProperty('drawLink', 'visibility', 'visible')
        this.connectedDrawLink = false
      }
    },
    clickFeature (event) {
      // when we move a rNode, we need to update drawlink as it is link to this moved node.
      if (['Move rNode', 'Delete rLink'].includes(event.action)) {
        this.drawMode = false
        // this.drawLink = Linestring([event.lngLat, event.lngLat])
      }
      // prevent emitting add road node inline when drawmode is on.
      // we will add the node inlne and create the new link in this component.
      if (!(event.action === 'Add Road Node Inline' && this.drawMode)) {
        this.$emit('clickFeature', event)
      }
    },

  },

}
</script>
<template>
  <MglMap
    :style="{'width': '100%'}"
    :access-token="mapboxPublicKey"
    map-style="mapbox://styles/mapbox/light-v9?optimize=true"
    @load="onMapLoaded"
    @mousemove="draw"
    @mouseout="resetDraw()"
    @click="addPoint"
    @mouseup="rightClickMap"
  >
    <v-menu
      v-model="showSettings"
      :close-on-content-click="false"
      :close-on-click="false"
      :origin="'top right'"
      transition="scale-transition"
      :position-y="30"
      :nudge-width="200"
      offset-x
      offset-y
    >
      <template v-slot:activator="{ on, attrs }">
        <v-btn
          class="setting"
          fab
          small
          v-bind="attrs"
          v-on="on"
        >
          <v-icon
            color="regular"
          >
            fa-solid fa-cog
          </v-icon>
        </v-btn>
      </template>
      <Settings
        v-if="showSettings"
        @submit="showSettings=false"
      />
    </v-menu>

    <MglScaleControl position="bottom-right" />
    <MglNavigationControl position="bottom-right" />
    <template v-if="mapIsLoaded">
      <RoadLinks
        ref="roadref"
        :map="map"
        :is-editor-mode="isEditorMode"
        :is-road-mode="isRoadMode"
        :anchor-mode="anchorMode"
        v-on="(isEditorMode)? {} : anchorMode ? {clickFeature: clickFeature } : {onHover:onHoverRoad, offHover:offHover,clickFeature: clickFeature}"
      />
    </template>

    <template v-if="mapIsLoaded">
      <StaticLinks
        :map="map"
        :showed-trips="selectedTrips"
        :is-editor-mode="isEditorMode"
        @rightClick="(e) => $emit('clickFeature',e)"
      />
    </template>

    <template v-if="mapIsLoaded">
      <EditorLinks
        :map="map"
        :anchor-mode="anchorMode"
        v-on="anchorMode ? {clickFeature: clickFeature } : {onHover:onHover, offHover:offHover,clickFeature: clickFeature}"
      />
    </template>
    <template v-if="mapIsLoaded">
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
            'line-color': '#7EBAAC',
            'line-width': ['case', ['boolean', connectedDrawLink, false], 5, 3],
            'line-dasharray':['case', ['boolean', connectedDrawLink, false],['literal', []] , ['literal', [0, 2, 4]]],

          }
        }"
      />
    </template>
  </MglMap>
</template>
<style lang="scss" scoped>
.map-view {
  width: 100%;

}
.setting {
  position: absolute;
  top: 10px;
  right: 20px;
}
.my-custom-dialog {
  position: absolute !important;
  top: 10px !important;
  right: 20px !important;
}
</style>
