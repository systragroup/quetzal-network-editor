<!-- eslint-disable no-case-declarations -->
<script>
import { serializer } from '@comp/utils/serializer.js'

// const $gettext = s => s

export default {
  name: 'FileLoader',
  events: ['networkLoaded'],
  components: {
  },
  data () {
    return {
      loadedLinks: {},
      loadedNodes: {},
      loadedType: '',
      choice: '',

    }
  },

  computed: {
    rlinksIsEmpty () { return this.$store.getters.rlinksIsEmpty },
    linksIsEmpty () { return this.$store.getters.linksIsEmpty },
    paramsIsEmpty () { return this.$store.getters['run/parametersIsEmpty'] },
    localLinksLoaded () { return Object.keys(this.loadedLinks).length !== 0 },
    localNodesLoaded () { return Object.keys(this.loadedNodes).length !== 0 },
    localFilesAreLoaded () {
      return (this.localLinksLoaded && this.localNodesLoaded)
    },

  },
  watch: {

    localFilesAreLoaded (val) {
      if (val) {
        this.$emit('networkLoaded', { links: this.loadedLinks, nodes: this.loadedNodes, type: this.loadedType })
        this.loadedLinks = {}
        this.loadedNodes = {}
        this.loadedType = ''
      }
    },

  },

  methods: {
    buttonHandle (choice) {
      this.choice = choice
      this.$refs.fileInput.click()
      document.getElementById('file-input').value = '' // clean it for next file
    },
    readFile (event) {
      this.$store.commit('changeLoading', true)
      const files = event.target.files
      // it is a geojson
      if (files[0].name.slice(-7) !== 'geojson') {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', { name: 'ImportError', message: 'File must be a geojson' })
        return
      }
      const name = files[0].name
      const fileReader = new FileReader()
      fileReader.readAsText(files[0])
      fileReader.onload = evt => {
        try {
          const data = JSON.parse(evt.target.result)
          switch (this.choice) {
            case 'PT links':
              this.loadedLinks = serializer(data, name, 'LineString')
              this.loadedType = 'PT'
              break
            case 'PT nodes':
              this.loadedNodes = serializer(data, name, 'Point')
              this.loadedType = 'PT'
              break
            case 'road links':
              this.loadedLinks = serializer(data, name, 'LineString')
              this.loadedType = 'road'
              break
            case 'road nodes':
              this.loadedNodes = serializer(data, name, 'Point')
              this.loadedType = 'road'
              break
            default:
              console.log('autre')
          }
          this.$store.commit('changeLoading', false)
        } catch (err) {
          this.$store.commit('changeLoading', false)
          this.$store.commit('changeAlert', err)
        }
      }
    },
  },
}
</script>
<template>
  <div class="row">
    <input
      id="file-input"
      ref="fileInput"
      type="file"
      style="display: none"
      accept=".geojson"
      @change="readFile"
    >
    <div class="container">
      <v-icon class="type-icon">
        fas fa-project-diagram
      </v-icon>
      <div class="subtitle">
        {{ $gettext('PT Network') }}
        <v-icon
          class="check-icon"
          :color="linksIsEmpty? 'warning':'success'"
        >
          {{ linksIsEmpty? 'fas fa-times':'fas fa-check' }}
        </v-icon>
      </div>

      <div class="element">
        <v-menu
          offset-y
          close-delay="100"
          transition="slide-y-transition"
        >
          <template v-slot:activator="{ on: on,attrs:attrs }">
            <v-btn
              icon
              outlined
              v-bind="attrs"
              v-on="on"
            >
              <v-icon small>
                fa-solid fa-upload
              </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              link
              :disabled="loadedType=='road' || localLinksLoaded"
              @click="()=>buttonHandle('PT links')"
            >
              <v-list-item-title>
                {{ $gettext('Links') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item
              link
              :disabled="loadedType=='road' || localNodesLoaded"
              @click="()=>buttonHandle('PT nodes')"
            >
              <v-list-item-title>
                {{ $gettext('Nodes') }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
    <div class="container">
      <v-icon class="type-icon">
        fas fa-project-diagram
      </v-icon>
      <div class="subtitle">
        {{ $gettext('Road Network') }}
        <v-icon
          class="check-icon"
          :color="rlinksIsEmpty? 'warning':'success'"
        >
          {{ rlinksIsEmpty? 'fas fa-times':'fas fa-check' }}
        </v-icon>
      </div>

      <div class="element">
        <v-menu
          offset-y
          close-delay="100"
          transition="slide-y-transition"
        >
          <template v-slot:activator="{ on: on,attrs:attrs }">
            <v-btn
              icon
              outlined
              v-bind="attrs"
              v-on="on"
            >
              <v-icon
                small
              >
                fa-solid fa-upload
              </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              link
              :disabled="loadedType=='PT' || localLinksLoaded"
              @click="()=>buttonHandle('road links')"
            >
              <v-list-item-title>
                {{ $gettext('Links') }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item
              link
              :disabled="loadedType=='PT' || localNodesLoaded"
              @click="()=>buttonHandle('road nodes')"
            >
              <v-list-item-title>
                {{ $gettext('Nodes') }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
    <div class="container">
      <v-icon class="type-icon">
        fas fa-cog
      </v-icon>
      <div class="subtitle">
        {{ $gettext('Parameters') }}
        <v-icon
          class="check-icon"
          :color="paramsIsEmpty? 'warning':'success'"
        >
          {{ paramsIsEmpty? 'fas fa-times':'fas fa-check' }}
        </v-icon>
      </div>

      <div class="element">
        <v-btn
          icon
          outlined
          @click="()=>buttonHandle('parameters')"
        >
          <v-icon small>
            fa-solid fa-upload
          </v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.row{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-bottom: 30px;

}
.container{
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding-left: 2em;
  padding-right: 2em;

}
.type-icon{
  padding-right: 0.2em;
}
.element{
  flex:1;
}
.check-icon{
  padding-left: 1em;
}
.subtitle {
  flex:2;
  font-size: 1.5em;
  font-weight: bold;

}
</style>
