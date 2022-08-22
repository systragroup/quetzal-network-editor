<script>
export default {
  name: 'sidePanel',
  components: {

},
  props:  ["selectedTrips"],
  model: {
    prop: "selectedTrips",
    event: "update-tripList"
  },
  events: ["selectEditorTrip","showPanel"],

  data () {
    return {
      showLeftPanel: false,
      showLeftPanelContent: false,
      tripId : this.$store.getters.trip_id, //[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]
      editorTrip: null,
      tripList : this.selectedTrips
    }
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
    }
  },

  methods: {
    
    
    buttonClick(event){
      
      
    },
    editButton(value){
      this.editorTrip = this.editorTrip == value? null : value
      this.$emit("selectEditorTrip", this.editorTrip);
    }
  },
  computed:{

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
                  height=400
                  item-height="32"
                >
                  <template v-slot:default="{ item }">
                    <v-list-item :key="item">
                      <v-list-item-action>
                        <v-checkbox
                          :on-icon="'fa-eye fa'"
                          :off-icon="'fa-eye-slash fa'"
                          :value="item"
                          v-model="tripList"
                          hide-details
                          @click="buttonClick"
                        />
                      </v-list-item-action>
                      <v-list-item-content>
                        <v-list-item-title>
                          {{ item }}
                        </v-list-item-title>
                      </v-list-item-content>
                      <v-list-item-action>
                        <v-btn icon class="ma-1" @click="editButton(item)">
                          <v-icon>fa-regular fa-pen</v-icon>
                        </v-btn>
                      </v-list-item-action>
                      <v-list-item-action>
                        <v-btn icon class="ma-1" color="error">
                          <v-icon>fa-regular fa-trash</v-icon>
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
                <v-card-actions>
                  <v-btn outlined rounded text> Edit Line info</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Cut Line From Node</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Cut Line At Node</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Extend Line Upward</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Extend Line Downward</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Add Stop Inline</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Move Stop</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text> Delete Stop</v-btn>
                </v-card-actions>
                <v-card-actions>
                  <v-btn outlined rounded text color="success"> Confirm Changes</v-btn>
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
