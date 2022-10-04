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
      showDialog:false,
      showLeftPanelContent: true,
      tripList : this.selectedTrips,
      width :null,
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
        this.showDialog = true
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
    showAll(){
      if (this.tripList == this.tripId){
        this.tripList = []
      }else
      {
        this.tripList = this.tripId
      }
      
    },
  
  }
  
  
}
</script>
<template>
    

    <section
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
                <v-card-title class = "white--text primary">
                  <v-tooltip bottom open-delay="500">
                    <template v-slot:activator="{ on, attrs }">
                    <v-btn icon class = "ma-2" color="white"
                            v-bind="attrs"
                            v-on="on"
                            @click="showAll()">
                        <v-icon  class="list-item-icon">fa-eye fa</v-icon>
                    </v-btn>
                    </template>
                    <span>{{ tripList == tripId? $gettext("Hide All"): $gettext("Show All")}}</span>
                  </v-tooltip>  

                    <v-spacer></v-spacer>
                      {{ $gettext("Lines") }}                    
                    <v-spacer></v-spacer>
                  <v-tooltip bottom open-delay="500">
                    <template v-slot:activator="{ on, attrs }">
                    <v-btn icon class="ma-2" color="white"
                            v-bind="attrs"
                            v-on="on"
                            @click="$store.commit('exportFiles')" >
                      <v-icon >fa-solid fa-download</v-icon>
                    </v-btn>     
                    </template>
                      <span>{{ $gettext("Export Files")}}</span>
                   </v-tooltip>  
                          

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
                          :color="'primary'"
                          :value="item"
                          size="30"
                          v-model="tripList"
                          hide-details
                        />
                      </v-list-item-action>
                        <v-list-item-title v-if="item==editorTrip">
                          <strong >{{ item }}</strong>
                        </v-list-item-title>
                        <v-list-item-title v-else>
                          {{ item }}
                        </v-list-item-title>

                      <v-list-item-avatar>

                        <v-tooltip bottom open-delay="500" >
                          <template v-slot:activator="{ on, attrs }">
                            <v-btn icon class="ma-1" 
                              v-bind="attrs"
                              v-on="on"
                              @click="editButton(item)"
                              :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false">
                            <v-icon  :color="item == editorTrip? 'regular':'regular' ">fa-regular fa-pen</v-icon>
                        </v-btn>
                          </template>
                          <span>{{ $gettext("Edit Line")}}</span>
                        </v-tooltip>  

                    
                      </v-list-item-avatar>

                      <v-list-item-action>
                        <v-tooltip bottom open-delay="500">
                          <template v-slot:activator="{ on, attrs }">
                            <v-btn icon class="ma-1" 
                            v-bind="attrs"
                            v-on="on"
                            @click="propertiesButton(item)"
                            :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false">
                              <v-icon :color="item == editorTrip? 'regular':'regular' ">fa-regular fa-table</v-icon>
                            </v-btn>
                          </template>
                          <span>{{ $gettext("Edit Line Properties")}}</span>
                        </v-tooltip>  
                      </v-list-item-action>
                      
                      <v-list-item-action>
                        <v-tooltip bottom open-delay="500">
                          <template v-slot:activator="{ on, attrs }">
                            <v-btn icon class="ma-1" 
                            v-bind="attrs"
                            v-on="on"
                            @click="deleteButton(item)"
                            :disabled="editorTrip ? true: false">
                              <v-icon small color="regular">fa-regular fa-trash</v-icon>
                            </v-btn>
                          </template>
                          <span>{{ $gettext("Delete Line")}}</span>
                        </v-tooltip>  
                      </v-list-item-action>

                    </v-list-item>
                  </template>
                </v-virtual-scroll>
                <v-divider></v-divider>
                <v-card-actions v-if="editorTrip ? true: false">
                  <v-spacer></v-spacer>
                  <v-btn @click="$emit('abortChanges')"> 
                    <v-icon small left>
                      fas fa-times-circle
                    </v-icon>
                    {{$gettext("Abort")}}
                  </v-btn>
                  <v-btn  color="primary" @click="$emit('confirmChanges')"> 
                    <v-icon small left>
                      fas fa-save
                    </v-icon>
                    {{$gettext("Confirm")}}
                  </v-btn>
                </v-card-actions>
                <v-card-actions v-show="editorTrip ? false: true">
                  <v-spacer></v-spacer>

                  <v-tooltip bottom open-delay="500">
                    <template v-slot:activator="{ on, attrs }">
                      <v-btn 
                        v-bind="attrs"
                        v-on="on"
                        color="primary"
                        class="text--primary"
                        fab
                        small
                        @click="createNewLine"> 
                        <v-icon>fas fa-plus</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ $gettext("Create new Line")}}</span>
                  </v-tooltip>  

                  
                </v-card-actions>
              </v-card>
            </div>
            

          </div>
        </div>
      </transition>
    <v-dialog
      persistent
      v-model="showDialog"
      max-width="290"
      @keydown.enter="$emit('confirmChanges'); showDialog = !showDialog"
      @keydown.esc="showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Save Changes?")}}
        </v-card-title>
        <v-card-actions>
          <v-btn
            color="grey"
            text
            left
            @click="showDialog = false"
          >
            {{$gettext("Cancel")}}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="regular"
            @click="$emit('abortChanges'); showDialog = !showDialog"
          >
            {{$gettext("No")}}
          </v-btn>

          <v-btn
            color="primary"
            
            @click="$emit('confirmChanges'); showDialog = !showDialog"
          >
            {{$gettext("Yes")}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </section>
    

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

.list-item-icon {
  display: flex !important;
  flex-flow: row !important;
  justify-content: center !important;
  margin: 0 !important;
  color: white;
}

</style>
