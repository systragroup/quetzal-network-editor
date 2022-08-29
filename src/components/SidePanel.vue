<script>
export default {
  name: 'sidePanel',
  components: {

},
  props:  ["selectedTrips","actionsList","selectedAction"],
  model: {
    prop: "selectedTrips",
    event: "update-tripList"
  },
  events: ["selectEditorTrip","showPanel","ActionClick","confirmChanges","abortChanges"],

  data () {
    return {
      showLeftPanel: false,
      showLeftPanelContent: false,
      tripList : this.selectedTrips,
    }
  },
  computed:{
    editorTrip(){return this.$store.getters.editorTrip},
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
      this.$emit("showPanel",this.showLeftPanel)
    },
    tripList (val){
      this.$emit("update-tripList", val);
    },
    tripId(new_val,old_val){
      // update TripList v-model when a trip_id is changed.
      var dict = {};
      old_val.forEach((key, i) => dict[key] = new_val[i]);
      this.tripList = this.tripList.map((trip)=>dict[trip])
    }
  },

  methods: {
    
    
    actionClick(action){
      let val = this.selectedAction == action? null:action
      this.$emit("actionClick",val)
      
    },
    editButton(value){
      if (this.editorTrip == value){
       // this.$store.commit('setEditorTrip',null)
       // this.$emit("actionClick",null)
       // this.$store.commit('changeNotification',{text:null, autoClose:true})
       this.$emit("abortChanges")

      }else{
        this.$store.commit('setEditorTrip',value)
      }
    },
    
    

    disableAction(action){
      if (this.selectedAction == null)
      {
        return false
        }
      else if(this.selectedAction == action) 
      {
        return false
        }
      else 
      {
        return true
        }
    },
    
  }
  
  
}
</script>
<template>
    <div
      class="left-panel elevation-4"
      :style="{'width': showLeftPanel ? '20%' : '0'}"
    >
      <div
        class="left-panel-toggle-btn elevation-4"
        :style="{'left': showLeftPanel ? 'calc(20% + 40px)' : '50px'}"
        @click="showLeftPanel = !showLeftPanel"
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
          class="left--conpaneltent"
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
                dense
                  :items="tripId"
                  height=400
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
                      <v-list-item-content>
                        <v-list-item-title>
                          {{ item }}
                        </v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-btn icon class="ma-1" 
                        @click="editButton(item)"
                        :disabled="(item != editorTrip) & (editorTrip!=null) ? true: false">
                          <v-icon  :color="item == editorTrip? 'error':'regular' ">fa-regular fa-pen</v-icon>
                        </v-btn>
                      </v-list-item-action>
                      <v-list-item-action>
                        <v-btn 
                        icon class="ma-1" 
                        color="error"
                        :disabled="editorTrip ? true: false">
                          <v-icon small>fa-regular fa-trash</v-icon>
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
              </v-card>
            </div>
            <div :style="{marginLeft: '20px', marginRight:'20px',marginTop:'20px'}"
                v-show="editorTrip ? true: false">
             <v-card
                elevation="16"
                max-width="100%"
                class="mx-auto"
              >
                <v-card-title class="white--text primary">
                  <v-spacer></v-spacer>
                    {{editorTrip}}
                  <v-spacer></v-spacer>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-actions
                    v-for="action in actionsList"
                    :key="action.id">
                  <v-btn x-small outlined rounded text
                    @click = "actionClick(action)"
                    :disabled= "disableAction(action)"> 
                    {{$gettext(action)}}
                    </v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text color="success" @click="$emit('confirmChanges')"> {{$gettext("Confirm")}}</v-btn>
                  <v-btn outlined rounded text color="error" @click="$emit('abortChanges')"> {{$gettext("Abort")}}</v-btn>

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
</style>
