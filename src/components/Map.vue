<script>
import Mapbox from 'mapbox-gl'
import { MglMap, MglNavigationControl, MglGeojsonLayer, MglMarker, MglPopup, MglImageLayer} from 'vue-mapbox'
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
  },
  props:  {
    selectedTrips: {
      type: Array,
      default: []
    },
    showLeftPanel: {
      type: Boolean,
      default: true
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
    },
    selectedAction:{
      type: String,
      defaut: null      
    }
  },
  events: ["clickLink", "clickNode","actionClick"],
  data () {
    return {
      links: {},
      nodes: {},
      showedTrips: this.selectedTrips,
      mapboxPublicKey:  null,
      selectedFeature : null,
      hoveredStateId : null,
      isEditorMode : false,
      popup: {
        coordinates: [0, 0],
        showed: false,
        content: null
      },
      popupEditor: {
        coordinates: [0, 0],
        showed: false,
        content: null
      },
      contextMenu: {
        coordinates: [0, 0],
        showed: false,
        actions: [],
        feature: null,
        type: null // link of node
      }
    }
  },
  created () {
    this.map = null;
    this.mapboxPublicKey = mapboxPublicKey;
    this.links = this.$store.getters.links;
    this.nodes = this.$store.getters.nodes
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
    popupEditor() {
      this.contextMenu = {
        coordinates: [0, 0],
        showed: false,
        actions: [],
        feature: null
      }
    },
    showedTrips(newList, oldList) {
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
    },
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
      
      event.map.loadImage(arrowImage, function(err, image) {
        if (err) {
          console.error('err image', err);
          return;
        }
        event.map.addImage('arrow', image);
      });
      this.map = event.map;

    },
    enterLink(event) {
      this.map.getCanvas().style.cursor = 'pointer';
      this.popup.coordinates = [event.mapboxEvent.lngLat.lng,
                                event.mapboxEvent.lngLat.lat
      ]
      this.popup.content = event.mapboxEvent.features[0].properties.trip_id
      this.popup.showed = true
    },
    leaveLink(event) {
      this.map.getCanvas().style.cursor = '';
      this.popup.showed = false
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
      if ( this.selectedAction === null ) {
        this.popupEditor.coordinates = [event.mapboxEvent.lngLat.lng,
                                      event.mapboxEvent.lngLat.lat
        ]
        this.popupEditor.content = this.hoveredStateId.id;
        this.popupEditor.showed = true;
      }
    },
    offCursor(event){
      this.map.getCanvas().style.cursor = '';
      this.popupEditor.showed = false;
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
      this.selectedFeature = features.filter(item => item.id == this.hoveredStateId.id)[0]

      // Emit a click base on layer type (node or link)
      if (this.selectedFeature !== null) {
        let click = {selectedFeature: this.selectedFeature,
                     action: this.selectedAction,
                     lngLat: event.mapboxEvent.lngLat}
        if (this.hoveredStateId.layerId == 'editorNodes') {
          if ( this.selectedAction === null ) {  click.action = 'Edit Node Info' }
          this.$emit('clickNode', click);
        } else if (this.hoveredStateId.layerId == 'editorLinks') {
          if ( this.selectedAction === null ) {  click.action = 'Edit Link Info' }
          this.$emit('clickLink', click);
        }
      }
    },
    contextMenuNode(event) {
      if ( this.popupEditor.showed && this.hoveredStateId.layerId == 'editorNodes') {
        this.popupEditor.showed = false;
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng,
                                        event.mapboxEvent.lngLat.lat
        ]
        this.contextMenu.showed = true;
        
        this.contextMenu.type = 'node';
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId);
        this.contextMenu.feature = features.filter(item => item.id == this.hoveredStateId.id )[0];

        let selectedNode = this.contextMenu.feature.properties.index
        let firstNode = this.$store.getters.editorLinks.features[0].properties.a
        let lastNode = this.$store.getters.editorLinks.features.slice(-1)[0].properties.b
        if (selectedNode == firstNode){
          this.contextMenu.actions = ['Edit Node Info',
                                    'Extend Line Downward',
                                    'Delete Stop']
        }else if (selectedNode == lastNode){
          this.contextMenu.actions = ['Edit Node Info',
                                      'Extend Line Upward',
                                      'Delete Stop']
        }else{
          this.contextMenu.actions = ['Edit Node Info',
                                      'Cut Line From Node',
                                      'Cut Line At Node',
                                      'Delete Stop']
        }
      }
    },
    contextMenuLink(event) {
      if ( this.popupEditor.showed && this.hoveredStateId.layerId == 'editorLinks' ) {
        this.popupEditor.showed = false;
        this.contextMenu.coordinates = [event.mapboxEvent.lngLat.lng,
                                        event.mapboxEvent.lngLat.lat
        ]
        this.contextMenu.showed = true;
        this.contextMenu.actions = ['Edit Link Info',
                                    'Add Stop Inline']
        this.contextMenu.type = 'link';
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId);
        this.contextMenu.feature = features.filter(item => item.id == this.hoveredStateId.id )[0];
      }
    },
    actionClick(event) {
      if (['Extend Line Upward', 'Extend Line Downward'].includes(event.action)){
        this.$emit('actionClick',event.action)

      }else{
        let click = {selectedFeature: event.feature,
                    action: event.action,
                    lngLat: event.coordinates }
        if ( this.contextMenu.type == 'node' ) { this.$emit('clickNode', click) }
        if ( this.contextMenu.type == 'link' ) { this.$emit('clickLink', click) }

      }
     
      
      this.contextMenu.showed = false
      this.contextMenu.type = null
    },
    draw(event){      
      if(this.drawMode && this.map.loaded()){
        //let index = this.drawLine.features.length-1
        //this.drawLine.features[index].geometry.coordinates = [ this.anchorNode[0].geometry.coordinates, Object.values(event.mapboxEvent.lngLat)  ]
        this.$store.commit('editNewLink',Object.values(event.mapboxEvent.lngLat))
        
      }
    },
    addPoint(event){
      this.contextMenu.showed = false
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
    moveNode(event){
      if ( this.selectedAction == 'Move Stop' ){
        event.mapboxEvent.preventDefault(); // prevent map control
        this.map.getCanvas().style.cursor = 'grab';
        // get selected node
        const features = this.map.querySourceFeatures(this.hoveredStateId.layerId);
        this.selectedFeature = features.filter(item => item.id == this.hoveredStateId.id )[0]
        let nodeId = this.selectedFeature.properties.index
        // store default position in history
        let geom =this.editorNodes.features.filter(node=>node.properties.index == nodeId)[0].geometry.coordinates
        this.$store.commit('addToHistory',{moveNode:{selectedFeature:this.selectedFeature,lngLat:geom}})
        
        // get position
        this.map.on('mousemove',this.onMove)
      }
    },
    onMove(event){
      // get position and update node position
      if (this.map.loaded()){
          this.$store.commit('moveNode',{selectedNode:this.selectedFeature,lngLat:Object.values(event.lngLat)})
      }
    },
    stopMovingNode(event){
      // stop tracking position (moving node.)
      this.map.getCanvas().style.cursor = 'pointer';
      this.map.off('mousemove', this.onMove);
      // emit a clickNode with the selected node.
      // this will work with lag as it is the selectedFeature and not the highlighted one.
      if (this.selectedAction == 'Move Stop') {
        let click = {selectedFeature: this.selectedFeature,
                     action: this.selectedAction,
                     lngLat: event.lngLat}
          this.$emit('clickNode', click);
       }
    },
    rightClickMap(event){
      if(event.mapboxEvent.originalEvent.button==2){
        this.$emit('actionClick',null)
      }
    }

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
      @mouseup="rightClickMap"
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
            'line-color': ['case', ['has', 'route_color'], ['concat', '#', ['get', 'route_color']], '#B5E0D6'],
            'line-opacity': ['case', ['boolean', ['feature-state', 'hidden'], false], 0.1, 1],
            'line-width': 3
          }
        }"
        v-on="isEditorMode ? { } : { mouseenter: enterLink, mouseleave: leaveLink }"
        >  
      </MglGeojsonLayer>
      <MglGeojsonLayer
        source-id="editorLinks"
        :source="{
          type: 'geojson',
          data: $store.getters.editorLinks,
          buffer: 0,
          promoteId: 'index',
        }"
        layer-id="editorLinks"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#7EBAAC',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
            'line-blur':  ['case', ['boolean', ['feature-state', 'hover'], false],  6, 0]
          }
        }"
        v-on="clickLinkEnabled ? { click: selectClick, mouseenter: onCursor, mouseleave: offCursor} : {}"
        @contextmenu="contextMenuLink"
        >   
      </MglGeojsonLayer>

      <MglImageLayer
        source-id= 'editorLinks'
        type= 'symbol'
        source= 'editorLinks'
        layer-id="arrow-layer"
        :layer="{
          type: 'symbol',
          layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 30,
          'icon-ignore-placement': true,
          'icon-image': 'arrow',
          'icon-size': 0.5,
          'icon-rotate': 90
          }
        }"
        >
      </MglImageLayer>
       <MglGeojsonLayer
        v-if="drawMode"
        source-id="drawLink"
        :source="{
          type: 'geojson',
          data: drawLine,
          buffer: 0,
          generateId: true,
        }"
        layer-id="drawLink"
        :layer="{
          type: 'line',
          minzoom: 9,
          maxzoom: 18,
          paint: {
            'line-color': '#7EBAAC',
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
          promoteId: 'index',
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
        v-on="clickNodeEnabled ? { click: selectClick, mouseenter: onCursor, mouseleave: offCursor, mousedown: moveNode, mouseup:stopMovingNode } : {}"
        @contextmenu="contextMenuNode"
        >   
      </MglGeojsonLayer>
      <MglPopup :closeButton="false"
                :showed="popup.showed"
                :coordinates="popup.coordinates">
        {{this.popup.content}}
      </MglPopup>
      <MglPopup :closeButton="false"
                :showed="popupEditor.showed"
                :coordinates="popupEditor.coordinates">
        <span>
          <h3>{{this.popupEditor.content}}</h3>
          <hr>
          {{$gettext("Left click to edit properties")}}
          <hr>
          {{$gettext("Right click for context menu")}}
        </span>
      </MglPopup>
      <MglPopup :closeButton="false"
                :showed="contextMenu.showed"
                :coordinates="contextMenu.coordinates">
        <span>
          <v-list dense flat >
            <v-list-item-group>
              <v-list-item
                v-for="action in contextMenu.actions"
                :key="action.id"
              >
                <v-list-item-content>
                  <v-btn  outlined small
                    @click = "actionClick({action: action, 
                                           feature: contextMenu.feature, 
                                           coordinates: contextMenu.coordinates})"> 
                    {{$gettext(action)}}
                  </v-btn>
                </v-list-item-content>
              </v-list-item>
            </v-list-item-group>
          </v-list>
        </span>
      </MglPopup>
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