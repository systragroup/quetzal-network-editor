<script>
import SidePanel from '../components/SidePanel.vue'
import Map from '../components/Map.vue'
import { enableAutoDestroy } from '@vue/test-utils'


export default {
  name: 'Home',
  components: {
    Map,
    SidePanel,

},
  data () {
    return {
      nodes: {},
      links: {},
      selectedTrips : [],
      editorTrip : null,
      showLeftPanel:false,
      actionsList : ['Edit Line info','Cut Line From Node','Cut Line At Node','Extend Line Upward','Extend Line Downward','Add Stop Inline','Move Stop','Delete Stop','Edit Link Info','Edit Node Info'],
      action : null,
      selectedNode : null,
      selectedLink : null,
      showDialog : false,
      editorForm : {},
      cursorPosition : [],
      clickLinkEnabled: true,
      clickNodeEnabled: true,
      tripToDelete : null,
      drawMode : false,
      lingeringAction : false
    }
  },
  watch: {
    action (val) {
      if (val === null) {
        this.clickLinkEnabled = this.clickNodeEnabled = true
        this.drawMode = false
        this.lingeringAction = false
      }
    }
  },
  created () {
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes
    this.editorTrip = this.$store.getters.editorTrip
    this.selectedTrips = this.$store.getters.tripId
  },
  mounted () {
    //this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {
    actionClick(action){
      //when an action is clicked in the sidepanel
      this.action = action
      if ( action == 'Edit Line info' ){
        this.editorForm = {...this.$store.getters.editorLineInfo}
        this.showDialog = true
      }
      else if ( action == 'Edit Link Info' ){
        this.clickNodeEnabled = false
        this.lingeringAction = true
        this.$store.commit('changeNotification',{text:'Select a Link', autoClose:false})
      }
      else if (['Cut Line From Node','Cut Line At Node','Move Stop','Delete Stop','Edit Node Info'].includes(action)){
        this.clickLinkEnabled = false
        this.lingeringAction = true
        this.$store.commit('changeNotification',{text:'Select a node', autoClose:false})
      }
      else if (action == 'Extend Line Upward'){
        this.$store.commit('changeNotification',{text:'Click on the map to extend', autoClose:false})
        this.$store.commit('setNewLink',{action:action})
        this.clickNodeEnabled = false
        this.clickLinkEnabled = false
        this.lingeringAction = true
        //const lastNode = this.$store.getters.editorLinks.features[this.$store.getters.editorLinks.features.length-1].properties.b
        //this.anchorNode = this.$store.getters.editorNodes.features.filter((node) => node.properties.index==lastNode)
        this.drawMode = true
      }
      else if (action == 'Extend Line Downward'){
        this.$store.commit('changeNotification',{text:'Click on the map to extend', autoClose:false})
        this.$store.commit('setNewLink',{action:action})
        this.clickNodeEnabled=false
        this.clickLinkEnabled=false
        this.lingeringAction = true
        const firstNode = this.$store.getters.editorLinks.features[0].properties.a
        //this.anchorNode = this.$store.getters.editorNodes.features.filter((node) => node.properties.index==firstNode)
        this.drawMode=true
      }
      else if (action == 'Add Stop Inline'){
        this.$store.commit('changeNotification',{text:'Click on a link to add a Stop', autoClose:false})
        this.clickNodeEnabled = false
        this.lingeringAction = true
      }
      else {
        this.lingeringAction = false
        this.$store.commit('changeNotification',{text:null, autoClose:true})
      }
    },

    clickNode(event){
      // node is clicked on the map
      this.selectedNode = event.selectedFeature.properties
      this.action = event.action
      if (this.selectedNode){ 
        // node action
        if (this.action == 'Edit Node Info'){
          // map selected node doesnt not return properties with nanulln value. we need to get the node in the store with the selected index.
          this.editorForm = this.$store.getters.editorNodes.features.filter((node)=>node.properties.index==this.selectedNode.index)
          this.editorForm = this.editorForm[0].properties
          // filter properties to only the one that are editable.
          const filteredKeys = ['id','index'];
          let filtered = Object.keys(this.editorForm)
            .filter(key => !filteredKeys.includes(key))
            .reduce((obj, key) => {
              obj[key] = this.editorForm[key];
              return obj;
            }, {});
          this.editorForm = filtered
          this.showDialog = true
        }
        else if (this.action){
          this.showDialog = true
        }
      }
    },
    clickLink(event){
      // link is clicked on the map
      this.selectedLink = event.selectedFeature.properties
      this.action = event.action
      if (this.selectedLink){ 
        // links action
        if(this.action == 'Edit Link Info'){
          // map selected link doesnt not return properties with null value. we need to get the links in the store with the selected index.
          this.editorForm = this.$store.getters.editorLinks.features.filter((link)=>link.properties.index==this.selectedLink.index)
          this.editorForm = this.editorForm[0].properties

          // filter properties to only the one that are editable.
          const filteredKeys = ['id','a','b','link_sequence','agency_id','direction_id','headway','index','route_color','route_short_name','route_type','trip_id','route_id'];
          //const filteredKeys=[]
          let filtered = Object.keys(this.editorForm)
            .filter(key => !filteredKeys.includes(key))
            .reduce((obj, key) => {
              obj[key] = this.editorForm[key];
              return obj;
            }, {});
          this.editorForm = filtered
          this.showDialog = true
        }
        else if (this.action == 'Add Stop Inline'){
          this.cursorPosition = event.lngLat
          this.showDialog=true
 
        }
      }
      
    },

    applyAction(){
      // click yes on dialog
      this.showDialog = false
      if (this.action == 'Cut Line From Node')
      {
        this.$store.commit('cutLineFromNode',{selectedNode:this.selectedNode})  
      }
      else if (this.action == 'Cut Line At Node')
      {
         this.$store.commit('cutLineAtNode',{selectedNode:this.selectedNode})  
      }
      else if (this.action == 'Delete Stop')
      {
        this.$store.commit('deleteNode',{selectedNode:this.selectedNode})
      }
      else if (this.action == 'Edit Link Info')
      {
         this.$store.commit('editLinkInfo',{selectedLinkId:this.selectedLink.index,info:this.editorForm})  
      }
      else if (this.action == 'Edit Node Info')
      {
         this.$store.commit('editNodeInfo',{selectedNodeId:this.selectedNode.index,info:this.editorForm})  
      }
      else if (this.action == 'Edit Line info')
      { 
         this.$store.commit('editLineInfo',this.editorForm)  
      }
      else if (this.action == 'deleteTrip')
      {
        this.$store.commit('deleteTrip',this.tripToDelete)
      }
      else if (this.action == 'Add Stop Inline')
      {
        this.$store.commit('addNodeInline',{selectedLink:this.selectedLink, lngLat:this.cursorPosition})
      }
      if ( !this.lingeringAction ) { this.action = null } 
    },
    cancelAction(){
      this.showDialog = false
      if ( !this.lingeringAction ) { this.action = null }
    },
    confirmChanges(){
      // confirm changes on sidePanel, this overwrite Links in store.
      this.$store.commit('confirmChanges')
      // put editTrip and action to null.
      this.editorTrip = null 
      this.$store.commit('setEditorTrip',null)
      this.action=null
      // notification
      this.$store.commit('changeNotification',{text:"modification applied", autoClose:true,color:'success'})
      
    },
    abortChanges(){
      // unselect a trip for edition. nothing to commit on link here.
      // put editTrip and action to null.
      this.editorTrip = null 
      this.$store.commit('setEditorTrip',null)
      this.action=null
      // notification
      this.$store.commit('changeNotification',{text:"modification aborted", autoClose:true})
    },
    deleteButton(selectedTrip){
      this.tripToDelete=selectedTrip
      this.action='deleteTrip'
      this.showDialog=true
    },
  },
}
</script>
<template>

  <section class="map-view"
  @keydown.esc="!showDialog? action=null: null">
    <v-dialog
      persistent
      v-model="showDialog"
      max-width="290"
      @keydown.enter="applyAction"
      @keydown.esc ="showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ action == 'deleteTrip'? $gettext("Delete ") + ' '+ tripToDelete + '?': $gettext("Edit Properties")}}
        </v-card-title>

        <v-card-text v-if="['Edit Line info', 'Edit Link Info', 'Edit Node Info'].includes(action)">
          <v-container>
              <v-col cols="12" >
                <v-text-field 
                  v-for="(value,name) in editorForm" :key="name"
                  v-model="editorForm[name]"
                  :label="name"
                ></v-text-field>
              </v-col>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="grey"
            text
            @click="cancelAction"
            @keydown.esc="cancelAction"
          >
            {{$gettext("Cancel")}}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="applyAction"
            @keydown.enter="applyAction"
          >
            {{$gettext("Save")}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


  <SidePanel
    v-model="selectedTrips" 
    @showPanel='(e) => showLeftPanel = e'
    :actionsList="actionsList"
    :selectedAction = "action"
    @actionClick="actionClick"
    @confirmChanges="confirmChanges"
    @abortChanges="abortChanges"
    @deleteButton="deleteButton">
  </SidePanel>

  <Map 
    :links="links" 
    :nodes="nodes" 
    :drawMode="drawMode"
    :selectedTrips="selectedTrips" 
    :showLeftPanel="showLeftPanel"
    :clickNodeEnabled="clickNodeEnabled"
    :clickLinkEnabled="clickLinkEnabled"
    :selectedAction="action"
    @clickNode = "clickNode"
    @clickLink = "clickLink">
  </Map>
  
  </section>
</template>
<style lang="scss" scoped>
.map-view {
  height: calc(100% - 50px);
  width: 100%;
  display: flex;
}

</style>
