<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup, MglImageLayer} from 'vue-mapbox'
import StaticLinks from './StaticLinks.vue'
import EditorLinks from './EditorLinks.vue'
import { mapboxPublicKey } from '@src/config.js'
import arrowImage from '@static/arrow.png';

// Filter links from selected line

export default {
  name: 'Map',
  components: {
    MglMap,
    MglNavigationControl,
    MglGeojsonLayer,
    MglMarker,
    MglPopup,
    MglImageLayer,
    StaticLinks,
    EditorLinks,
  },
  props:  {
    selectedTrips: {
      type: Array,
      default: []
    },
    
  },
  events: ["clickLink", "clickNode","actionClick"],
  data () {
    return {
      selectedAction:null,
      showedTrips: this.selectedTrips,
      mapboxPublicKey:  null,
      selectedFeature : null,
      isEditorMode : false,
      mapIsLoaded:false,
      drawMode:false,
      hoverId:null,
    }
  },
  created () {
    this.mapboxPublicKey = mapboxPublicKey;
  },
  watch: {
    editorNodes(newVal, oldVal) {
      let wasEditorMode = ( oldVal.features.length > 0 );
      this.isEditorMode = ( newVal.features.length > 0 );
      if ( this.isEditorMode ) {
        if ( !wasEditorMode ) {this.showedTrips = []}
        const bounds = new Mapbox.LngLatBounds();
        newVal.features.forEach(node => {
          bounds.extend(node.geometry.coordinates)
        })        
        this.map.fitBounds(bounds, {
          padding: 100,
        })
      } else {
        this.showedTrips = this.selectedTrips 
      }
    },
    selectedTrips(newVal) {
      this.showedTrips = newVal
    },
    isEditorMode(val){
      val? this.selectedAction='Extend Line Upward' : null
    },
    'firstNode.geometry.coordinates'(val){ 
      this.$store.commit('setNewLink',{action:this.selectedAction})
    },
    'lastNode.geometry.coordinates'(val){
       this.$store.commit('setNewLink',{action:this.selectedAction})},
    



    selectedAction(newVal,oldVal){
      if (['Extend Line Upward','Extend Line Downward'].includes(newVal)){
        this.$store.commit('setNewLink',{action:this.selectedAction})
        this.drawMode=true
      }else{
        this.drawMode=false
      }
    }
  },
  computed:{
 
  editorNodes() {
    return this.$store.getters.editorNodes
  },
  drawLine(){
    return this.$store.getters.newLink
  },
  firstNode(){
    return this.$store.getters.firstNode
  },
  lastNode(){
    return this.$store.getters.lastNode
  },
},

  methods: {
    onMapLoaded (event) {
      const bounds = new Mapbox.LngLatBounds();
      this.$store.getters.links.features.forEach(link => {
        bounds.extend(link.geometry.coordinates)
      })
      event.map.fitBounds(bounds, {
        padding: 100,
      })
      
      event.map.loadImage(arrowImage, function(err, image) {
        if (err) {
          console.error('err image', err);
          return;
        }
        event.map.addImage('arrow', image);
      });
      this.map = event.map;
      this.mapIsLoaded=true

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

    rightClickMap(event){
       //remove action when right click on map (and not link / nodes)
      if(event.mapboxEvent.originalEvent.button==2  & !this.hoverId){
        this.selectedAction=null
      }
    },
    onHover(event){
      // no drawing when we hover on link or node
      this.drawMode=false
      this.hoverId=event.selectedId
      // change hook when we hover first or last node. 
      if (this.hoverId == this.$store.getters.lastNodeId){
        this.selectedAction='Extend Line Upward'
        this.$store.commit('setNewLink',{action:this.selectedAction})
      }else if (this.hoverId == this.$store.getters.firstNodeId){
        this.selectedAction='Extend Line Downward'
        this.$store.commit('setNewLink',{action:this.selectedAction})
      }
      
    },
    offHover(event){
      // put back drawmode offHover only if action is not null
      console.log(this.selectedAction)
      if(this.selectedAction){
        this.hoverId=null
        this.drawMode = true
      }
    },

  },
  
}
</script>
<template>
    <MglMap
       v-show="true"
      :style="{'width': $store.getters.showLeftPanel ? '80%' : '100%'}"
      :access-token="mapboxPublicKey"
      map-style="mapbox://styles/mapbox/light-v9"
 
      @load="onMapLoaded"
      @mousemove="draw"
      @mouseout="resetDraw"
      @click="addPoint"
      @mouseup="rightClickMap"
    >
      <MglNavigationControl position="bottom-right" />
      <template v-if="mapIsLoaded">
        <StaticLinks 
        :map="map"
        :showedTrips="showedTrips"
        :isEditorMode="isEditorMode">
        </StaticLinks>
      </template>
     
      <template v-if="mapIsLoaded">
        <EditorLinks 
        :map="map"
        :drawMode="drawMode"
        @clickLink="(e) => this.$emit('clickLink',e)"
        @clickNode="(e) => this.$emit('clickNode',e)"
        @actionClick="(e) => this.$emit('actionClick',e)"
        @onHover = "onHover"
        @offHover ="offHover"
        >
        </EditorLinks>
      </template>


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
.scrollable {
   overflow-y: scroll;
}
.context-menu {
  color: blue;
}
</style>