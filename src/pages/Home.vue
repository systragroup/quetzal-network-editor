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
      showLeftPanel:false

    }
  },
  watch: {

  },
  created () {
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes
    this.tripId = this.$store.getters.trip_id

  },
  mounted () {
    //this.$store.commit('changeRoute', this.$options.name)
  },
  methods: {

    
  },
  computed:{
   
  }
  
}
</script>
<template>
  <section class="map-view">

  <SidePanel
    v-model="selectedTrips" 
    @selectEditorTrip="(e) => editorTrip = e" 
    @showPanel='(e) => showLeftPanel = e'>
  </SidePanel>

  <Map 
    :links="links" 
    :nodes="nodes" 
    :selectedTrips="selectedTrips" 
    :editorTrip="editorTrip" 
    :showLeftPanel="showLeftPanel">
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
