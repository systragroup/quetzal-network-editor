<script>
import SidePanel from '../components/SidePanel.vue'
import Map from '../components/Map.vue'


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
      tripId : [],
      selectedTrips : [],
      editorTrip : null,
      showLeftPanel:false,
      actionsList : ['Edit Line info','Cut Line From Node','Cut Line At Node','Extend Line Upward','Extend Line Downward','Add Stop Inline','Move Stop','Delete Stop'],
      action : null,
      selectedNode : null,
      showDialog : false
    }
  },
  watch: {

  },
  created () {
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes
    this.tripId = this.$store.getters.trip_id
    this.editorTrip = this.$store.getters.editorTrip
    this.selectedTrips = this.tripId


  },
  mounted () {
    //this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {
    actionClick(action){
      this.action = action
      if (action){
        this.$store.commit('changeNotification',{text:'Select a node', autoClose:false})
      }else {
        {this.$store.commit('changeNotification',{text:null, autoClose:true})}
      }
    },

    clickNode(selectedNode){
      this.selectedNode=selectedNode.properties
      if (selectedNode){ 
        // node action
        if(this.action){
          this.showDialog = true
        }
      }
    },
    clickLink(selectedLink){
      console.log('linkClick')
    },

    applyAction(){
      this.showDialog=false
      if (this.action == 'Cut Line From Node')
      {
        this.$store.commit('cutLineFromNode',{selectedNode:this.selectedNode})  
      }else if (this.action == 'Cut Line At Node')
      {
         this.$store.commit('cutLineAtNode',{selectedNode:this.selectedNode})  
      }
      
      
    }

    
  },
  computed:{
   
  }
  
}
</script>
<template>

  <section class="map-view">
    <v-dialog
      v-model="showDialog"
      max-width="290"
      @keydown.enter="applyAction"
      @keydown.esc ="showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{$gettext("Apply Change?")}}
        </v-card-title>


        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="grey"
            text
            @click="showDialog = false"
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
    :actionsList="actionsList"
    @showPanel='(e) => showLeftPanel = e'
    @actionClick="actionClick">
  </SidePanel>

  <Map 
    :links="links" 
    :nodes="nodes" 
    :selectedTrips="selectedTrips" 
    :showLeftPanel="showLeftPanel"
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
