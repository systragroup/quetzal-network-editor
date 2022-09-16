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
      selectedAction:'Extend Line Upward',
      showedTrips: this.selectedTrips,
      mapboxPublicKey:  null,
      selectedFeature : null,
      isEditorMode : false,
      mapIsLoaded:false,
      drawMode:false,
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
      if (val & ['Extend Line Upward', 'Extend Line Downward'].includes(this.selectedAction)){
        this.drawMode = true
        this.$store.commit('setNewLink',{action:this.selectedAction})
      } else {
        this.drawMode = false
      }


    },


    selectedAction(newVal,oldVal){
       // if history is not empty, apply it.
      // when we are moving and we change the action without any dialog, we want to revert to default value.
      if (oldVal == 'Move Stop'){
        this.map.getCanvas().style.cursor = 'pointer';
        this.map.off('mousemove', this.onMove);
        let hist = this.$store.getters.history
        if (hist.length>0){
          this.$store.commit('moveNode',{selectedNode:hist[0].moveNode.selectedFeature,lngLat:Object.values(hist[0].moveNode.lngLat)})
          this.$store.commit('cleanHistory')
        }
      }else if (['Extend Line Upward','Extend Line Downward'].includes(newVal)){
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
      if(event.mapboxEvent.originalEvent.button==2){
        this.$emit('actionClick',null)
      }
    },
    onHover(){
      this.drawMode=false
      this.map.setLayoutProperty('drawLink', 'visibility', 'none');
    },
    offHover(){
      this.drawMode=true
      this.map.setLayoutProperty('drawLink', 'visibility', 'visible');
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
        v-model=selectedAction
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