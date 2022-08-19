<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup} from 'vue-mapbox'
import { mapboxPublicKey } from '@src/config.js'
import sidePanel from '../components/sidePanel.vue'
import SidePanel from '../components/sidePanel.vue'


export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglGeojsonLayer,
    MglMarker,
    MglPopup,
    sidePanel,
},
  data () {
    return {

      checkPk: true,
      nodes: {},
      mapboxPublicKey: null,
      links: {},
      tripId : this.$store.getters.trip_id, //[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
      selectedTrips : [],
      editorTrip : null,//'STM_12_0'
      showLeftPanel:false

    }
  },
  watch: {

  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes.features

  },
  mounted () {
    //this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds()
      this.links.features[0].geometry.coordinates.forEach(coord => {
        bounds.extend(coord)
      })
      
      event.map.fitBounds(bounds, {
        padding: 100,
      })
    },

    lineclick(event){
      console.log(event)
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
  <section class="map-view">

  <sidePanel
    v-model="selectedTrips" @selectEditorTrip="(e) => editorTrip = e" @showPanel='(e) => showLeftPanel = e'/>

    <MglMap
       v-show="true"
      :style="{'width': showLeftPanel ? '80%' : '100%'}"
      :access-token="mapboxPublicKey"
      map-style="mapbox://styles/mapbox/light-v9"
      @load="onMapLoaded"
    >
      <MglNavigationControl position="bottom-right" />
      <template v-if="checkPk">
      
        <MglMarker
          v-for="(point, index) in nodes"
          :key="`marker-${index}`"
          :coordinates="point.geometry.coordinates"
          color="#2C3E4E"
        >
          <template slot="marker">
            <div class="pk-marker" />
          </template>
          <MglPopup>
            <div>{{ $gettext('stop_id:') }} {{ point.properties.stop_id }}</div>
          </MglPopup>
        </MglMarker>
      </template>
    
      <MglGeojsonLayer
        source-id="test"
        :source="{
          type: 'geojson',
          data: activeLinks
        }"
        layer-id="test"
        :layer="{
          type: 'line',
          paint: {
            'line-color': '#00a6ff',
            'line-width': 5
          }
        }"
        @click="lineclick"
        >   
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="test2"
        :source="{
          type: 'geojson',
          data: nonActiveLinks
        }"
        layer-id="test2"
        :layer="{
          type: 'line',
          paint: {
            'line-color': '#00a6ff',
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
          data: editorLinks
        }"
        layer-id="editorLink"
        :layer="{
          type: 'line',
          paint: {
            'line-color': '#22e335',
            'line-opacity':1,
            'line-width': 8
          }
        }"
        @click="lineclick"
        >   
      </MglGeojsonLayer>

    </MglMap>
  </section>
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
