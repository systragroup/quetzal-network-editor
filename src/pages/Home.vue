<script>
import sidePanel from '../components/sidePanel.vue'
import Map from '../components/Map.vue'


export default {
  name: 'Home',
  components: {
    Map,
    sidePanel,
},
  data () {
    return {

      nodes: {},
      links: {},
      tripId : [], //[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
      selectedTrips : [],
      editorTrip : null,//'STM_12_0'
      showLeftPanel:false

    }
  },
  watch: {

  },
  created () {
    this.links = this.$store.getters.links
    this.nodes = this.$store.getters.nodes.features
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

  <sidePanel
    v-model="selectedTrips" 
    @selectEditorTrip="(e) => editorTrip = e" 
    @showPanel='(e) => showLeftPanel = e'>
  </sidePanel>

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
