<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup} from 'vue-mapbox'
import { mapboxPublicKey } from '@src/config.js'


export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglGeojsonLayer,
    MglMarker,
    MglPopup,
},
  props:  ["selectedTrips", "showLeftPanel"],
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
        const hiddenNodes = this.map.querySourceFeatures('nodes');
        hiddenNodes.forEach(feature => {
          this.map.setFeatureState({ source: 'nodes', id: feature.id }, 
                                   { hidden: true })
        })

        // Set visible links
        const visible = this.map.querySourceFeatures(
                          'links', 
                          {filter: [
                            'in', ['get', 'trip_id'], ['literal', newList]
                          ]})
        visible.forEach(feature => {
          this.map.setFeatureState({ source: 'links', id: feature.id }, 
                                   { hidden: false })
        }) 

        // Set hidden links
        const hidden = this.map.querySourceFeatures(
                          'links', 
                          {filter: [
                            '!', ['in', ['get', 'trip_id'], ['literal', newList]]
                          ]})
        hidden.forEach(feature => {
          this.map.setFeatureState({ source: 'links', id: feature.id }, 
                                   { hidden: true })
        })
        
        // Set visible nodes
        const a = visible.map(item => item.properties.a)
        const b = visible.map(item => item.properties.b)
        const visibleNodes = this.map.querySourceFeatures(
                              'nodes', 
                              {filter: [
                                'in', ['get', 'index'], 
                                ['literal', Array.from(new Set([...a, ...b]))]
                              ]})
        visibleNodes.forEach(feature => {
          this.map.setFeatureState({ source: 'nodes', id: feature.id }, 
                                   { hidden: false })
        })                  
      }
    }
  },

  computed:{
      /*
      var filtered = {...this.links}      
      if (!this.$store.getters.editorTrip)  // no edit links. normal view
      {
        filtered.features = filtered.features.filter(link => this.selectedTrips.includes(link.properties.trip_id)) 
      }
      else  //edit mode. everything is transparent
      {
        filtered.features=[]
      }
      return filtered
      },
      */

    activeNodesList(){
      let a = this.activeLinks.features.map(item => item.properties.a)
      let b = this.activeLinks.features.map(item => item.properties.b)
      return  Array.from(new Set([...a, ...b]))
    },

    activeNodes(){
      var filtered = {...this.nodes}
      filtered.features = filtered.features.filter(node => this.activeNodesList.includes(node.properties.index)); 
      return filtered
    },
    nonActiveNodes(){
      var filtered = {...this.nodes}
      filtered.features = filtered.features.filter(node => !this.activeNodesList.includes(node.properties.index)); 
      return filtered
    },
    editorNodes() {
      return this.$store.getters.editorNodes
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

    
    //console.log(this.map.querySourceFeatures('links', {filter: ['in', ['get', 'trip_id'], ['literal', selectedTrips]]}));
    
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
        this.selectedFeature = null;
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
    >
      <MglNavigationControl position="bottom-right" />
      <MglGeojsonLayer
        source-id="links"
        :source="{
          type: 'geojson',
          data: this.links,
          buffer: 0,
          generateId: true,
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
        @load="console.log('Test')"
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
            'line-color': '#4CAF50',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
            'line-blur':  ['case', ['boolean', ['feature-state', 'hover'], false],  6, 0]
          }
        }"
        @click="selectClick"
        @mouseenter="onCursor"
        @mouseleave="offCursor"
        >   
      </MglGeojsonLayer>
      /*
      <MglGeojsonLayer
        source-id="nodes"
        :source="{
          type: 'geojson',
          data: this.nodes,
          buffer: 0,
          generateId: true,
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
        @mouseenter="onCursor"
        @mouseleave="offCursor"
        @click="selectClick"
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