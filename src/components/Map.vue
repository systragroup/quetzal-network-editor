<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup} from 'vue-mapbox'
import { mapboxPublicKey } from '@src/config.js'

// Filter links from selected line

export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglGeojsonLayer,
    MglMarker,
    MglPopup,
  },
  props:  {
    selectedTrips: {
      type: Array,
      default: []
    },
    showLeftPanel: {
      type: Boolean,
      default: false
    },
    clickNodeEnabled: {
      type: Boolean,
      default: true      
    },
    clickLinkEnabled: {
      type: Boolean,
      default: true
    },
    drawMode:{
      type:Boolean,
      default:false
    }
  },
  events: ["clickLink", "clickNode"],
  data () {
    return {
      links: {},
      nodes: {},
      mapboxPublicKey:  null,
      selectedFeature : null,
      hoveredStateId : null,
    }
  },
  created () {
    this.map = null;
    this.clonedMap = null
    this.mapboxPublicKey = mapboxPublicKey;
    this.links = this.$store.getters.links;
    this.nodes = this.$store.getters.nodes;
  },
  watch: {
    editorNodes(nodes) {
      if ( nodes.features.length > 0 ) {
        const bounds = new Mapbox.LngLatBounds();
        nodes.features.forEach(node => {
          bounds.extend(node.geometry.coordinates)
        })        
        this.map.fitBounds(bounds, {
          padding: 100,
        })
      }
    },
    selectedTrips(newList, oldList) {
      if (this.map !== null) {
        // Set all nodes to hidden
        this.nodes.features.forEach(feature => {
          this.map.setFeatureState({ source: 'nodes', id: feature.properties.index }, 
                                   { hidden: true })
        })
        // Set all links to hidden
        this.links.features.forEach(feature => {
          this.map.setFeatureState({ source: 'links', id: feature.properties.index }, 
                                   { hidden: true })
        }) 
        // Set visible links
        const visibleLinks = new Set();
        newList.forEach(line => {
          this.linksPerLine[line].forEach(link => visibleLinks.add(link))
        })
        visibleLinks.forEach(link => {
          this.map.setFeatureState({ source: 'links', id: link.properties.index }, 
                                   { hidden: false })
        })
        // Set visible nodes
        const a = [...visibleLinks].map(item => item.properties.a);
        const b = [...visibleLinks].map(item => item.properties.b);
        const ab = new Set([...a, ...b]);
        [...ab].forEach(id => {
          this.map.setFeatureState({ source: 'nodes', id: id }, 
                                   { hidden: false })
        })                  
      }
    }
  },
  computed:{
    linksPerLine() {
      const groupBy = function(xs) {
        return xs.reduce(function(rv, x) {
          (rv[x.properties.trip_id] = rv[x.properties.trip_id] || []).push(x);
          return rv;
        }, {});
      };
      return groupBy(this.$store.getters.links.features)
    },
    editorNodes() {
      return this.$store.getters.editorNodes
    },
    drawLine(){
      return this.$store.getters.newLink
    } 
  },
  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds();
      this.links.features.forEach(link => {
        bounds.extend(link.geometry.coordinates)
      })
      event.map.fitBounds(bounds, {
        padding: 100,
      })
      this.map = event.map;
    },
    onCursor(event){
      this.map.getCanvas().style.cursor = 'pointer';
      if (this.hoveredStateId !== null) {
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
          { hover: false }
        )
      }
      
      this.hoveredStateId = { layerId: event.layerId, id: event.mapboxEvent.features[0].id };
      this.map.setFeatureState(
        { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
        { hover: true }
      );
    },
    offCursor(event){
      this.map.getCanvas().style.cursor = '';
      if (this.hoveredStateId !== null) {
        this.map.setFeatureState(
          { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
          { hover: false }
        );
      }
      this.hoveredStateId = null;
    },
    selectClick(event){
      // Get the highlighted feature
      const features = this.map.querySourceFeatures(this.hoveredStateId.layerId);
      for (const feature of features) {
        if (feature.id == this.hoveredStateId.id) {
          this.selectedFeature = feature;
          break;
        }
      }
      // Emit a click base on layer type (node or link)
      if (this.selectedFeature !== null) {
        if (this.hoveredStateId.layerId == 'editorNodes') {
          this.$emit('clickNode', this.selectedFeature);
        } else if (this.hoveredStateId.layerId == 'editorLinks') {
          this.$emit('clickLink', this.selectedFeature);
        }
        //this.selectedFeature = null;
      }
    },
     draw(event){      
      if(this.drawMode && this.map.loaded()){
        //let index = this.drawLine.features.length-1
        //this.drawLine.features[index].geometry.coordinates = [ this.anchorNode[0].geometry.coordinates, Object.values(event.mapboxEvent.lngLat)  ]
        this.$store.commit('editNewLink',Object.values(event.mapboxEvent.lngLat))
        
      }
    },
    addPoint(event){
      if(this.drawMode){
        let pointGeom = Object.values(event.mapboxEvent.lngLat)
        this.$store.commit('applyNewLink',pointGeom)

      }
    },
    resetDraw(event){     
      // reset draw line when we leave the map 
      if(this.drawMode && this.map.loaded()){
        if (this.drawLine.action == 'Extend Line Upward'){
          this.$store.commit('editNewLink',this.drawLine.features[0].geometry.coordinates[0])
        }else {
          this.$store.commit('editNewLink',this.drawLine.features[0].geometry.coordinates[1])
        }
      }
    },

  },
}
</script>
<template>
    <MglMap
       v-show="true"
      :style="{'width': showLeftPanel ? '80%' : '100%'}"
      :access-token="mapboxPublicKey"
      map-style="mapbox://styles/mapbox/light-v9"
 
      @load="onMapLoaded"
      @mousemove="draw"
      @mouseout="resetDraw"
      @click="addPoint"
    >
      <MglNavigationControl position="bottom-right" />
      <MglGeojsonLayer
        source-id="links"
        :source="{
          type: 'geojson',
          data: this.links,
          buffer: 0,
          promoteId: 'index',
        }"
        layer-id="links"
        :layer="{
          interactive: true,
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': ['case', ['boolean', ['feature-state', 'hidden'], false],'#9E9E9E', '#B5E0D6'],
            'line-opacity': ['case', ['boolean', ['feature-state', 'hidden'], false], 0.2, 1],
            'line-width': 3
          }
        }"
        >   
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="editorLinks"
        :source="{
          type: 'geojson',
          data: $store.getters.editorLinks,
          buffer: 0,
          generateId: true,
        }"
        layer-id="editorLinks"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#2196F3',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
            'line-blur':  ['case', ['boolean', ['feature-state', 'hover'], false],  6, 0]
          }
        }"
        v-on="clickLinkEnabled ? { click: selectClick, mouseenter: onCursor, mouseleave: offCursor } : {}"
        >   
      </MglGeojsonLayer>

       <MglGeojsonLayer
        v-if="drawMode"
        source-id="draw"
        :source="{
          type: 'geojson',
          data: drawLine,
          buffer: 0,
          generateId: true,
        }"
        layer-id="draw"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#2196F3',
            'line-width': 5
          }
        }"
        >   
      </MglGeojsonLayer>

      /*
      <MglGeojsonLayer
        source-id="nodes"
        :source="{
          type: 'geojson',
          data: this.nodes,
          buffer: 0,
          promoteId: 'index',
        }"
        layer-id="nodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': ['case', ['boolean', ['feature-state', 'hidden'], false],'#9E9E9E', '#2C3E4E'],
            'circle-radius': 3,
          }
        }"
        >   
      </MglGeojsonLayer>
      */
      <MglGeojsonLayer
        source-id="editorNodes"
        :source="{
          type: 'geojson',
          data: editorNodes,
          buffer: 0,
          generateId: true,
        }"
        layer-id="editorNodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': '#2C3E4E',
            'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false],  12, 8],
            'circle-blur':   ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0]
          }
        }"
        v-on="clickNodeEnabled ? { click: selectClick, mouseenter: onCursor, mouseleave: offCursor } : {}"
        >   
      </MglGeojsonLayer>
    </MglMap>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}
.left-panel {
  height: 100%;
  background-color: white;
  transition: 0.3s;
  z-index: 20;
}
.left-panel-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
.left-panel-toggle-btn {
  position: absolute;
  left: 100%;
  width: 25px;
  z-index: 1;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  transition: 0.3s;
  cursor: pointer;
}
.left-panel-title {
  height: 50px;
  line-height: 55px;
  padding-left: 20px;
  font-size: 1.1em;
  margin-bottom: 10px;
}
.pk-marker {
  width: 15px;
  height: 15px;
  border-radius: 20px;
  background-color: $secondary;
}

.scrollable {
   overflow-y: scroll;
}
</style>