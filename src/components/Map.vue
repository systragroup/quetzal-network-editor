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
  props:  ["links", "nodes", "selectedTrips", "editorTrip", "showLeftPanel"],
    data () {
      return {
        mapboxPublicKey:  null,
      }
    },
    created () {
      this.mapboxPublicKey = mapboxPublicKey
    },
  watch: {},
  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds();
      this.links.features.forEach(link => {
        bounds.extend(link.geometry.coordinates)
      })
      event.map.fitBounds(bounds, {
        padding: 100,
      })
    },
    lineclick(event){
      console.log(event.mapboxEvent.features[0])
      console.log(this.activeNodes)
      //console.log(this.activeLinks)
      //console.log(this.nodes)
    },

  },
  computed:{
    activeLinks() {
      var filtered = {...this.links}      
      if (!this.editorTrip)  // no edit links. normal view
      {
        filtered.features = filtered.features.filter(link => this.selectedTrips.includes(link.properties.trip_id)) 
      }
      else  //edit mode. everything is transparent
      {
        filtered.features=[]
      }
      return filtered
      },
    nonActiveLinks() {
      var filtered = {...this.links}
      if (!this.editorTrip) // no edit mode. normal view
      {
        filtered.features = filtered.features.filter(link => !this.selectedTrips.includes(link.properties.trip_id)); 
      }
       else // edit mode. everythin in transperent excep edit trip id
      {
        filtered.features = filtered.features.filter(link => link.properties.trip_id != this.editorTrip); 
      }
      return filtered
      },

    editorLinks() {
      var filtered = {...this.links}
      filtered.features = filtered.features.filter(link => link.properties.trip_id == this.editorTrip); 
      return filtered
      },

    selectedNodes(){
      let a = this.activeLinks.features.map(item => item.properties.a)
      let b = this.activeLinks.features.map(item => item.properties.b)
      return  Array.from(new Set([...a, ...b]))
    },
    editorNodesList(){
      let a = this.editorLinks.features.map(item => item.properties.a)
      let b = this.editorLinks.features.map(item => item.properties.b)
      return  Array.from(new Set([...a, ...b]))
    },

    activeNodes(){
      var filtered = {...this.nodes}
      filtered.features = filtered.features.filter(node => this.selectedNodes.includes(node.properties.index)); 
      return filtered
    },
    nonActiveNodes(){
      var filtered = {...this.nodes}
      filtered.features = filtered.features.filter(node => !this.selectedNodes.includes(node.properties.index)); 
      return filtered
    },
    editorNodes(){
      var filtered = {...this.nodes}
      filtered.features = filtered.features.filter(node => this.editorNodesList.includes(node.properties.index)); 
      return filtered
    }
    
  }
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
        source-id="activeLinks"
        :source="{
          type: 'geojson',
          data: activeLinks,
          buffer: 0
        }"
        layer-id="activeLinks"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#B5E0D6',
            'line-width': 3
          }
        }"
        @click="lineclick"
        >   
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="nonActiveLinks"
        :source="{
          type: 'geojson',
          data: nonActiveLinks,
          buffer: 0
        }"
        layer-id="nonActiveLinks"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#9E9E9E',
            'line-opacity':0.2,
            'line-width': 3
          }
        }"
        >   
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="editorLink"
        :source="{
          type: 'geojson',
          data: editorLinks,
          buffer: 0
        }"
        layer-id="editorLink"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#4CAF50',
            'line-opacity':1,
            'line-width': 5
          }
        }"
        @click="lineclick"
        >   
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="activeNodes"
        :source="{
          type: 'geojson',
          data: this.activeNodes,
          buffer: 0
        }"
        layer-id="activeNodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': '#2C3E4E',
            'circle-radius': 3,
          }
        }"
        @click="lineclick"
        >   
      </MglGeojsonLayer>

      <MglGeojsonLayer
        source-id="nonActiveNodes"
        :source="{
          type: 'geojson',
          data: this.nonActiveNodes,
          buffer: 0
        }"
        layer-id="nonActiveNodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': '#9E9E9E',
            'circle-radius': 3,
            'circle-opacity':0.2,
          }
        }"
        >   
      </MglGeojsonLayer>

      <MglGeojsonLayer
        source-id="editorNodes"
        :source="{
          type: 'geojson',
          data: this.editorNodes,
          buffer: 0
        }"
        layer-id="editorNodes"
        :layer="{
          interactive: true,
          type: 'circle',
          minzoom: 12,
          maxzoom: 18,
          paint: {
            'circle-color': '#2C3E4E',
            'circle-radius': 3,
          }
        }"
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
