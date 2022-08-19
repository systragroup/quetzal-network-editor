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
      console.log(event);
      //this.$store.commit('linksLoaded')
    },
  },
  computed:{
    activeLinks() {
      var filtered = {...this.links}      
      filtered.features = filtered.features.filter(link => this.selectedTrips.includes(link.properties.trip_id)) 
      return filtered
      },
    nonActiveLinks() {
      var filtered = {...this.links}
      filtered.features = filtered.features.filter(link => !this.selectedTrips.includes(link.properties.trip_id)); 
      return filtered
      },

    editorLinks() {
      var filtered = {...this.links}
      filtered.features = filtered.features.filter(link => link.properties.trip_id == this.editorTrip); 
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
        source-id="test"
        :source="{
          type: 'geojson',
          data: activeLinks,
          buffer: 0
        }"
        layer-id="test"
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
        source-id="test2"
        :source="{
          type: 'geojson',
          data: nonActiveLinks,
          buffer: 0
        }"
        layer-id="test2"
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
        @click="lineclick"
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
        source-id="nodes"
        :source="{
          type: 'geojson',
          data: this.nodes,
          buffer: 0
        }"
        layer-id="nodes"
        :layer="{
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
