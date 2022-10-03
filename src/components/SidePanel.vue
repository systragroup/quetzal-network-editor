<script>

const $gettext = s => s


export default {
  name: 'sidePanel',
  components: {

},
  props:  ["selectedTrips"],
  model: {
    prop: "selectedTrips",
    event: "update-tripList"
  },
  events: ["selectEditorTrip","confirmChanges","abortChanges","deleteButton","propertiesButton","newLine"],

  data () {
    return {
      showLeftPanelContent: true,
      tripList : this.selectedTrips,
      width:null,
    }
  },
  computed:{
    showLeftPanel() {return this.$store.getters.showLeftPanel},
    height() {return (window.innerHeight-80) - 20*3 - 100},
   
    editorTrip() {return this.$store.getters.editorTrip},
    tripId() {return this.$store.getters.tripId} 
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
    tripList (val){
      this.$emit("update-tripList", val);
    },
    tripId(new_val,old_val){
      if (new_val.length != old_val.length){
        // if a trip is deleted. we remove it, no remapping.
        this.tripList = this.tripList.filter((trip)=>new_val.includes(trip))
      }
      else{
        // if a trip name changes.
        // update TripList v-model when a trip_id is changed.
        var dict = {};
        old_val.forEach((key, i) => dict[key] = new_val[i]);
        this.tripList = this.tripList.map((trip)=>dict[trip])
      }
    }
  },

  methods: {
    getWidth(){
      this.width=this.$refs.leftPanelDiv.clientWidth
    },
    
    editButton(value){
      if (this.editorTrip == value){
       this.$emit("abortChanges")
      }else{
        this.$store.commit('setEditorTrip',value)
      }
    },

    propertiesButton(value){
      // select the TripId and open dialog
      if (!this.editorTrip){
        this.$store.commit('setEditorTrip',value)
        this.$emit("propertiesButton",{action:'Edit Line Info', lingering:false})

      }// just open dialog
      else{
        this.$emit("propertiesButton",{action:'Edit Line Info', lingering:true})
      }
    },
    createNewLine(){
      this.$store.commit('setEditorTrip','trip_' + (+new Date).toString(36))
      this.$emit("propertiesButton",{action:'Edit Line Info', lingering:true})
      this.$store.commit('changeNotification',{text: $gettext("Click on the map to start drawing"), autoClose: false})


    },

    deleteButton(val){
      this.$emit("deleteButton",val)
    },
  
  }
  
  
}
</script>
<template>
    <div
      ref="leftPanelDiv"
      class="left-panel elevation-4"
      :style="{'width': showLeftPanel ? '400px' : '0'}"
    >
      <div
        class="left-panel-toggle-btn elevation-4"
        :style="{'left': showLeftPanel ? 'calc(350px + 40px)' : '50px'}"
        @click="$store.commit('changeLeftPanel')"
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
            <div :style="{margin: '20px'}">
              <v-card
                max-width="100%"
                class="mx-auto"
              >
                <v-card-title class="white--text primary" text-align='left'>
                  <v-spacer></v-spacer>
                  {{ $gettext("Lines") }}
                  <v-spacer></v-spacer>
                </v-card-title>
                <v-virtual-scroll
                  :items="tripId"
                  :height="height"
                  :item-height="41"
                  
                >
                  <template v-slot:default="{ item }">
                    <v-list-item :key="item.id">
                      <v-list-item-action >
                        <v-checkbox
                          :on-icon="'fa-eye fa'"
                          :off-icon="'fa-eye-slash fa'"
                          :value="item"
                          size="30"
                          v-model="tripList"
                          hide-details
                        />
                      </v-list-item-action>
                        <v-list-item-title>
                          {{ item }}
                        </v-list-item-title>

                      <v-list-item-avatar>
                        <v-btn icon class="ma-1" 
                        @click="editButton(item)"
                        :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false">
                          <v-icon  :color="item == editorTrip? 'error':'regular' ">fa-regular fa-pen</v-icon>
                        </v-btn>
                      </v-list-item-avatar>

                      <v-list-item-action>
                        <v-btn icon class="ma-1" 
                        @click="propertiesButton(item)"
                        :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false">
                          <v-icon :color="item == editorTrip? 'regular':'regular' ">fa-regular fa-table</v-icon>
                        </v-btn>
                      </v-list-item-action>
                      
                      <v-list-item-action>
                        <v-btn icon class="ma-1" 
                        
                        @click="deleteButton(item)"
                        :disabled="editorTrip ? true: false">
                          <v-icon small color="error">fa-regular fa-trash</v-icon>
                        </v-btn>
                      </v-list-item-action>

                    </v-list-item>
                  </template>
                </v-virtual-scroll>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-btn outlined rounded text @click = "tripList = tripId ">       
                  {{ $gettext("Show All") }}
                  </v-btn>
                  <v-btn outlined rounded text @click = "tripList = [] ">  
                  {{ $gettext("Hide All") }}
                  </v-btn>
                </v-card-actions>
                <v-card-actions v-if="editorTrip ? true: false">
                  <v-btn outlined rounded text color="success" @click="$emit('confirmChanges')"> {{$gettext("Confirm")}}</v-btn>
                  <v-btn outlined rounded text color="error" @click="$emit('abortChanges')"> {{$gettext("Abort")}}</v-btn>
                </v-card-actions>
                <v-card-actions v-if="editorTrip ? false: true">
                  <v-btn outlined rounded text color="success" @click="createNewLine"> {{$gettext("New Line")}}</v-btn>
                </v-card-actions>
              </v-card>
            </div>
            

          </div>
        </div>
      </transition>
    </div>
</template>
<style lang="scss" scoped>
@import "src/scss/variables.scss";
.left-panel {
  height: 100%;
  background-color: $primary-dark;
  transition: 0.3s;
  display:flex;
  z-index: 20;
  resize: horizontal;
  overflow: auto;
  
}
.left-panel-content {
  display: flex;
  width : 100%;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  //resize: horizontal;
  //overflow: auto;
  
  
}
.left-panel-toggle-btn {
  position: absolute;
  left: 100%;
  width: 25px;
  z-index: 1;
  background-color: $primary-dark;
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

.drawer-list-item {
  padding: 0 13px !important;
  justify-content: flex-start !important;
  flex: 0;
  transition: 0.3s;
}
</style>
