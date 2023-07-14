<!-- eslint-disable no-case-declarations -->
<script>
import { serializer } from '@comp/utils/serializer.js'
import { readFileAsText, readFileAsBytes } from '@comp/utils/utils.js'
import FilesList from '@comp/import/FilesList.vue'

// const $gettext = s => s

export default {
  name: 'FileLoader',
  events: ['FilesLoaded'],
  components: {
    FilesList,
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
        let files = []
        if (this.loadedType === 'PT') {
          files = [
            { path: 'inputs/pt/links.geojson', content: this.loadedLinks },
            { path: 'inputs/pt/nodes.geojson', content: this.loadedNodes },
          ]
        } else {
          files = [
            { path: 'inputs/road/links.geojson', content: this.loadedLinks },
            { path: 'inputs/road/nodes.geojson', content: this.loadedNodes },
          ]
        }
        this.$emit('FilesLoaded', files)
        this.loadedLinks = {}
        this.loadedNodes = {}
        this.loadedType = ''
      }
    },

  },

  methods: {
    buttonHandle (choice) {
      this.choice = choice
      if (this.choice === 'inputs') {
        this.$refs.otherInputs.click()
        document.getElementById('other-inputs').value = '' // clean it for next file
      } else if (this.choice === 'outputs') {
        this.$refs.otherOutputs.click()
        document.getElementById('other-outputs').value = '' // clean it for next file
      } else if (this.choice === 'parameters') {
        this.$refs.paramsInput.click()
        document.getElementById('params-input').value = '' // clean it for next file
      } else {
        this.$refs.fileInput.click()
        document.getElementById('file-input').value = '' // clean it for next file
      }
    },
    async readOtherInputs (event) {
      // this.$store.commit('changeLoading', true)
      this.$store.commit('changeLoading', true)
      const fileList = []
      const files = event.target.files
      for (const file of files) {
        const name = 'inputs/' + file.name
        try {
          const content = await readFileAsBytes(file)
          fileList.push({ content: content, path: name })
          this.$store.commit('changeLoading', false)
        } catch (err) {
          this.$store.commit('changeLoading', false)
          this.$store.commit('changeAlert', err)
        }
      }
      this.$store.commit('changeLoading', false)
      this.$emit('FilesLoaded', fileList)

      // this.$store.commit('changeLoading', false)
    },
    async readOtherOutputs (event) {
      // load outputs as Layer Module and as other files (ex: png)
      this.$store.commit('changeLoading', true)
      const fileList = []
      const files = event.target.files
      for (const file of files) {
        const name = 'outputs/' + file.name
        try {
          if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
            let content = await readFileAsText(file)
            content = JSON.parse(content)
            fileList.push({ content: content, path: name })
          } else { // if not a geojson or a json. save as other.
            const content = await readFileAsBytes(file)
            fileList.push({ content: content, path: name })
          }

          this.$store.commit('changeLoading', false)
        } catch (err) {
          this.$store.commit('changeLoading', false)
          this.$store.commit('changeAlert', err)
        }
      }
      this.$store.commit('changeLoading', false)
      this.$emit('FilesLoaded', fileList)
    },

    async readParams (event) {
      this.$store.commit('changeLoading', true)
      const files = event.target.files
      try {
        let data = await readFileAsText(files[0])
        data = JSON.parse(data)
        this.$emit('FilesLoaded', [{ path: 'inputs/params.json', content: data }])
        this.$store.commit('changeLoading', false)
      } catch (err) {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', err)
      }
    },
    async readFile (event) {
      this.$store.commit('changeLoading', true)
      const files = event.target.files
      // it is a geojson
      if (files[0].name.slice(-7) !== 'geojson') {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', { name: 'ImportError', message: 'File must be a geojson' })
        return
      }
      const name = files[0].name

      try {
        let data = await readFileAsText(files[0])
        data = JSON.parse(data)
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
    },
  },
}
</script>
<template>
  <div>
    <div class="row">
      <input
        id="file-input"
        ref="fileInput"
        type="file"
        style="display: none"
        accept=".geojson"
        @change="readFile"
      >
      <input
        id="params-input"
        ref="paramsInput"
        type="file"
        style="display: none"
        accept=".json"
        @change="readParams"
      >
      <input
        id="other-inputs"
        ref="otherInputs"
        type="file"
        style="display: none"
        multiple="multiple"
        @change="readOtherInputs"
      >
      <input
        id="other-outputs"
        ref="otherOutputs"
        type="file"
        style="display: none"
        multiple="multiple"
        @change="readOtherOutputs"
      >
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': linksIsEmpty? '0.50':'1'}"
        >
          fas fa-project-diagram
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': linksIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('PT Network') }}
          <v-icon
            v-if="!linksIsEmpty"
            class="check-icon"
            color="success"
          >
            fas fa-check
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
        <v-icon
          class="type-icon"
          :style="{'opacity': rlinksIsEmpty? '0.50':'1'}"
        >
          fas fa-project-diagram
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': rlinksIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Road Network') }}
          <v-icon
            v-if="!rlinksIsEmpty"
            class="check-icon"
            color="success"
          >
            fas fa-check
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
        <v-icon
          class="type-icon"
          :style="{'opacity': paramsIsEmpty? '0.50':'1'}"
        >
          fas fa-cog
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': paramsIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Parameters') }}
          <v-icon
            v-if="!paramsIsEmpty"
            class="check-icon"
            color="success"
          >
            fas fa-check
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
    <v-divider />
    <FilesList
      @importButton="(e)=>buttonHandle(e)"
    />
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
  margin-left: auto;
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
