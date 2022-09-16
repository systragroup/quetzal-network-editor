<script>
import { MglPopup, MglImageLayer, MglGeojsonLayer} from 'vue-mapbox'
	
export default {
	name: 'EditorLinks',
	components: {
	MglPopup,
  MglImageLayer,
  MglGeojsonLayer
},
props:["map","drawMode","editorNodes","drawLine","selectedAction"],
events: ["clickLink", "clickNode", "actionClick"],
	data () {
	return {
    clickLinkEnabled : true,
    clickNodeEnabled : true,
    selectedFeature : null,
    hoveredStateId : null,
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
	watch: {
    // Enable of disable clicking on node/link depending to the selected action
    selectedAction (val){
      if (val == null){
        this.clickLinkEnabled = true
        this.clickNodeEnabled = true
      } else if (['Move Stop','Cut Line From Node','Cut Line At Node','Delete Stop', 'Edit Node Info'].includes(val)){
        this.clickLinkEnabled=false
      } else if(['Extend Line Upward','Extend Line Downward'].includes(val)){
        this.clickLinkEnabled=false
        this.clickNodeEnabled=false

      } else if (['Add Stop Inline','Edit Link Info'].includes(val)){
        this.clickNodeEnabled=false
      }
    }

	},
  

	methods: {
    selectClick(event){
      if ( this.hoveredStateId !== null ) {
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
      }
    },
    onCursor(event){
      if ( this.hoveredStateId === null || this.hoveredStateId.layerId == 'editorLinks') {
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
      }
    },
    offCursor(event){
      if ( this.hoveredStateId !== null ) {
        if ( !(this.hoveredStateId.layerId == 'editorNodes' && event.layerId == 'editorLinks') ) {
          this.map.getCanvas().style.cursor = '';
          this.popupEditor.showed = false;
          this.map.setFeatureState(
            { source: this.hoveredStateId.layerId, id: this.hoveredStateId.id },
            { hover: false }
          );
          this.hoveredStateId = null;
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
	},
}
</script>
<template>
	<section>
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
          paint: {
            'line-color': '#7EBAAC',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 12, 5],
            'line-blur':  ['case', ['boolean', ['feature-state', 'hover'], false],  6, 0]
          }
        }"
        v-on="clickNodeEnabled ? { click: selectClick, mouseover: onCursor, mouseleave: offCursor } : {}"
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
          paint: {
            'line-color': '#7EBAAC',
            'line-width': 5
          }
        }"
        >   
      </MglGeojsonLayer>

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
          paint: {
            'circle-color': '#2C3E4E',
            'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false],  16, 8],
            'circle-blur':   ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
          }
        }"
        v-on="clickNodeEnabled ? { click: selectClick, mouseover: onCursor, mouseleave: offCursor, mousedown: moveNode, mouseup:stopMovingNode } : {}"
        @contextmenu="contextMenuNode"
        >   
      </MglGeojsonLayer>



      <MglPopup :closeButton="false"
					:showed="popupEditor.showed"
					:coordinates="popupEditor.coordinates"
          @close="popupEditor.showed=false">
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
                @close="contextMenu.showed=false"
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

	</section>
</template>
<style lang="scss" scoped>

</style>
