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
      actionsList : ['Edit Line info','Cut Line From Node','Cut Line At Node','Extend Line Upward','Extend Line Downward','Add Stop Inline','Move Stop','Delete Stop'],
      action : null,
      selectedNode : null,
      showDialog : false,
      editorLinksInfo:{},
      clickLinkEnabled: true,
      clickNodeEnabled: true 
    }
  },
  watch: {
    action (val) {
      if (val === null) {
        this.clickLinkEnabled = this.clickNodeEnabled = true
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
      if (action=='Edit Line info'){
        this.editorLinksInfo = {...this.$store.getters.editorLinksInfo}
        this.showDialog=true
      }
      else if (['Cut Line From Node','Cut Line At Node','Move Stop','Delete Stop'].includes(action)){
        this.clickLinkEnabled = false
        this.$store.commit('changeNotification',{text:'Select a node', autoClose:false})
      }else {
        this.$store.commit('changeNotification',{text:null, autoClose:true})
      }
      
    },

    clickNode(selectedNode){
      // node is clicked on the map
      this.selectedNode=selectedNode.properties
      if (selectedNode){ 
        // node action
        if(this.action){
          this.showDialog = true
        }
      }
    },
    clickLink(selectedLink){
      // link is clicked on the map
      console.log('linkClick')
    },

    applyAction(){
      // click yes on dialog
      this.showDialog=false
      if (this.action == 'Cut Line From Node')
      {
        this.$store.commit('cutLineFromNode',{selectedNode:this.selectedNode})  
      }
      else if (this.action == 'Cut Line At Node')
      {
         this.$store.commit('cutLineAtNode',{selectedNode:this.selectedNode})  
      }
      else if (this.action == 'Edit Line info')
      {
         this.$store.commit('editLineInfo',this.editorLinksInfo)  
         this.action = null
      }
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

    
  },
  computed:{
   
  }
  
}
</script>
<template>

  <section class="map-view">
    <v-dialog
      persistent
      v-model="showDialog"
      max-width="290"
      @keydown.enter="applyAction"
      @keydown.esc ="showDialog=false; action=null"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{$gettext("Apply Change?")}}
        </v-card-title>

        <v-card-text v-if="action == 'Edit Line info'">
          <v-container>
              <v-col cols="12" >
                <v-text-field 
                  v-for="(value,name) in editorLinksInfo" :key="name"
                  v-model="editorLinksInfo[name]"
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
            @click="showDialog = false; action = null"
          >
            {{$gettext("Disagree")}}
          </v-btn>

          <v-btn
            color="green darken-1"
            text
            @click="applyAction"
            
          >
            {{$gettext("Agree")}}
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
    @abortChanges="abortChanges">
  </SidePanel>

  <Map 
    :links="links" 
    :nodes="nodes" 
    :selectedTrips="selectedTrips" 
    :showLeftPanel="showLeftPanel"
    :clickNodeEnabled="clickNodeEnabled"
    :clickLinkEnabled="clickLinkEnabled"
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
