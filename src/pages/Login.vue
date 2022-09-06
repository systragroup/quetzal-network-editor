<script>

import lines from '@static/links_test.geojson'
import points from '@static/nodes_test.geojson'



export default {
  name: 'Login',
  data () {
    return {
      loggedIn: false,
      loadedLinks:{},
      loadedNodes:{},
      choice:null,
      loading:{links:false,nodes:false}
    }
  },
  mounted () {
    //this.$store.commit('changeRoute', this.$options.name)
  },

  computed:{
    filesAreLoaded(){return this.$store.getters.filesAreLoaded}

  },
  watch:{
    loadedLinks(){
      this.$store.commit('loadLinks',this.loadedLinks)
      this.loading['links'] = false
    },
    loadedNodes(){
      this.$store.commit('loadNodes',this.loadedNodes)
      this.loading['nodes'] = false
    },
    filesAreLoaded(val){
      if (val){
        this.login()
      }
    }

  },
  methods: {
    login () {
      // Leave time for animation to end (.animate-login and .animate-layer css rules)
      setTimeout(() => {
        this.$router.push('/').catch(()=>{})
      }, 1000)
    },
    loadExample(){
      this.$store.commit('loadLinks',lines)
      this.$store.commit('loadNodes',points)
    },

    readJSON(choice){
      
      this.choice=choice
      this.$refs.fileInput.click()
    },

    onFilePicked (event) {
      this.loading[this.choice] = true
      const files = event.target.files
      // there is a file
      if (!files.length){
        this.loading[this.choice]=false
        return
      }
      //it is a geojson
      if (files[0].name.slice(-7) != 'geojson'){
        this.loading[this.choice]=false
        alert('file is not a geojson')
        return
      }

      let fileReader = new FileReader()
      fileReader.readAsText(files[0])
      if (this.choice == 'links'){
        fileReader.onload =  evt =>  {
        try{
            this.loadedLinks =  JSON.parse(evt.target.result)
        } catch (e){ console.log('error') }
      }
      }else if (this.choice == 'nodes') {
        fileReader.onload =  evt =>  {
        try{
            this.loadedNodes =  JSON.parse(evt.target.result)
        } catch (e){ console.log('error') }
      }
      }
      
    },
  },

  
}
</script>
<template>
  <div class="layout">
    <div
      class="layout-overlay"
      :class="{ 'animate-layer': loggedIn }"
    />
    <v-card
      class="card"
      :class="{ 'animate-login': loggedIn }"
    >
      <v-card-title class="title">
        Quetzal Network Editor
      </v-card-title>
      <v-card-text :style="{textAlign: 'center'}">
        <div class="subtitle">
          {{ $gettext("Load Files") }}
        </div>
        <div>
          <!-- eslint-disable-next-line max-len -->
          {{ $gettext("Links and Nodes files must be geojson in EPSG:4326 ") }}
        </div>
        <v-btn
          :loading="loading.links"
          :color=" this.$store.getters.linksAreLoaded? 'primary': 'normal'"
          @click="readJSON('links')"
        >
          <v-icon
            small
            left
          >
          fa-solid fa-upload
          </v-icon>
          {{ $gettext('Links') }}
        </v-btn>

        <v-btn
          :loading="loading.nodes"
          :color=" this.$store.getters.nodesAreLoaded? 'primary': 'normal'"
          @click="readJSON('nodes')"
        >
          <v-icon
            small
            left
          >
            fa-solid fa-upload
          </v-icon>
          {{ $gettext('Nodes') }}
        </v-btn>

        <input
          type="file"
          style="display: none"
          ref="fileInput"
          accept=".geojson"
          @change="onFilePicked"/>
      <div> 
        <v-btn text x-small @click="loadExample">Load Example</v-btn> 
      </div>
      <div> 
        <v-btn
        color="primary"
        v-show="filesAreLoaded"
        @click="login">
        <v-icon
            small
            left
          >
            fas fa-sign-in-alt
          </v-icon>
          {{ $gettext('GO!') }}

        </v-btn>
      </div>
      </v-card-text>
    </v-card>
  </div>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  width: 500px;
  max-height: calc(100% - 2em);
  overflow-y: auto;
  padding: 40px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  margin: 40px;
}
.card button {
  margin-top: 40px;
}
.animate-login {
  transform: translateY(-185%);
  transition: 1s;
}
.animate-layer {
  opacity: 0;
  transition: 1s;
}
</style>
