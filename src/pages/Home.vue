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
  data () {
    return {
      showLeftPanel: false,
      showLeftPanelContent: false,
      checkPk: true,
      nodes: {},
      mapboxPublicKey: null,
      links: {},
      tripId : this.$store.getters.trip_id, //[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
      selectedTrips : [],
      editorTrip : null//'STM_12_0'

    }
  },
  watch: {
    showLeftPanel (val) {
      if (val) {
        // Leave time for animation to end (.fade-enter-active css rule)
        setTimeout(() => {
          this.showLeftPanelContent = true
        }, 500)
      } else {
        this.showLeftPanelContent = false
      }
    },
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

    buttonClick(event){
      console.log(this.selectedTrips)
    },
    editButton(value){
      this.editorTrip = this.editorTrip == value? null : value
    }
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
    <div
      class="left-panel elevation-4"
      :style="{'width': showLeftPanel ? '20%' : '0'}"
    >
      <div
        class="left-panel-toggle-btn elevation-4"
        :style="{'left': showLeftPanel ? 'calc(20% + 40px)' : '50px'}"
        @click="showLeftPanel = !showLeftPanel"
      >
        <v-icon
          small
          color="secondary"
        >
          {{ showLeftPanel ? 'fas fa-chevron-left' : 'fas fa-chevron-right' }}
        </v-icon>
      </div>
      <transition name="fade">
        <div
          v-show="showLeftPanelContent"
          class="left-panel-content"
        >
          <div>
            <div class="left-panel-title">
              {{ $gettext('Legend') }}
            </div>
            <div :style="{marginLeft: '20px', marginRight:'20px'}">
              <v-card
                elevation="16"
                max-width="100%"
                class="mx-auto"
              >
                <v-card-title class="white--text primary">
                  <v-spacer></v-spacer>

                    Trips IDs
                  <v-spacer></v-spacer>

                  <v-btn
                    color="white"
                    class="ma-1"
                    fab
                    small
                  >
                    <v-icon>fa-light fa-plus</v-icon>
                  </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-virtual-scroll
                  :items="tripId"
                  height="400"
                  item-height="64"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item :key="item">
                      <v-list-item-action>
                        <v-checkbox
                          :on-icon="'far fa-eye'"
                          :off-icon="'far fa-eye-slash'"
                          :value="item"
                          v-model="selectedTrips"
                          hide-details
                          @click="buttonClick"
                        />
                      </v-list-item-action>

                      <v-list-item-content>
                        <v-list-item-title>
                          <strong>{{ item }}</strong>
                        </v-list-item-title>
                      </v-list-item-content>

                      <v-list-item-action>
                        <v-btn icon class="ma-1" @click="editButton(item)">
                          <v-icon>fa-regular fa-pen</v-icon>
                        </v-btn>
                      </v-list-item-action>

                      <v-list-item-action>
                        <v-btn icon class="ma-1" color="error">
                          <v-icon small>fa-regular fa-trash</v-icon>
                        </v-btn>
                      </v-list-item-action>
                      
                    </v-list-item>

                    <v-divider></v-divider>
                  </template>
                </v-virtual-scroll>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-btn outlined rounded text @click = "selectedTrips = tripId ">       
                  select all
                  </v-btn>
                  <v-btn outlined rounded text @click = "selectedTrips = [] ">  
                  deselect all
                  </v-btn>
                </v-card-actions>
              </v-card>
            </div>
            <div :style="{marginLeft: '20px', marginRight:'20px',marginTop:'20px'}"
                v-show="editorTrip ? true: false">
             <v-card
                elevation="16"
                max-width="100%"
                class="mx-auto"
              >
                <v-card-title class="white--text primary">
                  <v-spacer></v-spacer>
                    {{editorTrip}}
                  <v-spacer></v-spacer>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-btn outlined rounded text> Edit Line info</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Cut Line From Node</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Cut Line At Node</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Extend Line Upward</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Extend Line Downward</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Add Stop Inline</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Move Stop</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Delete Stop</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text color="success"> Confirm Changes</v-btn>
                </v-card-actions>
                  
                
              </v-card>
            </div>

          </div>
        </div>
      </transition>
    </div>
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
