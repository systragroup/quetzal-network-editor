<script>

import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import { extractZip, IndexAreDifferent } from '../components/utils/utils.js'
const $gettext = s => s

export default {
  name: 'Login',
  data () {
    return {
      loggedIn: false,
      loadedLinks: {},
      loadedrLinks: {},
      loadedrNodes: {},
      loadedNodes: {},
      choice: null,
      showDialog: false,
      errorMessage: '',
    }
  },

  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    linksAreLoaded () {
      return !((Object.keys(this.loadedLinks).length === 0 || Object.keys(this.loadedNodes).length === 0))
    },
    rlinksAreLoaded () {
      return !((Object.keys(this.loadedrLinks).length === 0 || Object.keys(this.loadedrNodes).length === 0))
    },

  },
  watch: {
    linksAreLoaded (val) {
      if (val) {
        if (IndexAreDifferent(this.loadedLinks, this.$store.getters.links) &&
            IndexAreDifferent(this.loadedNodes, this.$store.getters.nodes)) {
          this.$store.commit('appendNewLinks', { links: this.loadedLinks, nodes: this.loadedNodes })
        } else {
          this.error($gettext('there is duplicated links or nodes index. Import aborted'))
        }
      }
      this.loadedLinks = {}
      this.loadedNodes = {}
    },
    rlinksAreLoaded (val) {
      if (val) {
        if (IndexAreDifferent(this.loadedrLinks, this.$store.getters.rlinks) &&
            IndexAreDifferent(this.loadedrNodes, this.$store.getters.rnodes)) {
          this.$store.commit('appendNewrLinks', { rlinks: this.loadedrLinks, rnodes: this.loadedrNodes })
        } else {
          this.error($gettext('there is duplicated road links or nodes index. Import aborted'))
        }
      }
      this.loadedrLinks = {}
      this.loadedrNodes = {}
    },

  },
  mounted () {
    this.$store.commit('changeNotification', '')
  },
  methods: {
    login () {
      // Leave time for animation to end (.animate-login and .animate-layer css rules)
      setTimeout(() => {
        this.$router.push('/Home').catch(() => {})
      }, 1000)
    },
    error (message) {
      this.errorMessage = message
      this.$store.commit('changeLoading', false)
      this.loadedLinks = {}
      this.loadedrLinks = {}
      this.loadedrNodes = {}
      this.loadedNodes = {}
    },

    buttonHandle (choice) {
      this.choice = choice
      switch (this.choice) {
        case 'zip':
          this.$refs.zipInput.click()
          break
        case 'links':
          this.$refs.fileInput.click()
          break
        case 'nodes':
          this.$refs.fileInput.click()
          break
        case 'example':
          this.projectIsEmpty ? this.loadExample() : this.showDialog = true
          break
        case 'newProject':
          this.projectIsEmpty ? this.newProject() : this.showDialog = true
      }
    },
    applyDialog () {
      // this only happen when both files are loaded.
      // remove links and nodes from store. (and filesAreLoaded)
      this.$store.commit('unloadFiles')
      this.$store.commit('unloadrFiles')

      if (this.choice === 'example') {
        this.loadExample()
      } else if (this.choice === 'newProject') {
        this.newProject()
      }
      this.showDialog = !this.showDialog
    },

    async loadExample () {
      this.errorMessage = ''
      this.$store.commit('changeLoading', true)
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/static/'
      let fetchData = await fetch(url + 'links_exemple.geojson').then(res => res.json())
        .catch(() => { this.error($gettext('An error occur fetching example on github')) })

      if (!fetchData) return
      this.loadedLinks = fetchData

      fetchData = await fetch(url + 'nodes_exemple.geojson').then(res => res.json())
        .catch(() => { this.error($gettext('An error occur fetching example on github')) })

      if (!fetchData) return
      this.loadedNodes = fetchData

      fetchData = await fetch(url + 'road_links_exemple.geojson').then(res => res.json())
        .catch(() => { this.error($gettext('An error occur fetching example on github')) })

      if (!fetchData) return
      this.loadedrLinks = fetchData

      fetchData = await fetch(url + 'road_nodes_exemple.geojson').then(res => res.json())
        .catch(() => { this.error($gettext('An error occur fetching example on github')) })

      if (!fetchData) return
      this.loadedrNodes = fetchData

      this.$store.commit('changeLoading', false)
      this.loggedIn = true
      this.login()
    },
    newProject () {
      this.loadedLinks = linksBase
      this.loadedNodes = nodesBase
      this.loadedrLinks = linksBase
      this.loadedrNodes = nodesBase
      this.loggedIn = true
      this.login()
    },

    onFilePicked (event) {
      this.$store.commit('changeLoading', true)
      const files = event.target.files
      // there is a file
      if (!files.length) {
        this.$store.commit('changeLoading', false)
        return
      }
      // it is a geojson
      if (files[0].name.slice(-7) !== 'geojson') {
        this.$store.commit('changeLoading', false)
        this.error($gettext('file is not a geojson'))
        return
      }

      const fileReader = new FileReader()
      fileReader.readAsText(files[0])
      if (this.choice === 'links') {
        fileReader.onload = evt => {
          try {
            if (files[0].name.includes('road')) {
              this.loadedrLinks = JSON.parse(evt.target.result)
              this.loadedLinks = linksBase
            } else {
              this.loadedLinks = JSON.parse(evt.target.result)
              this.loadedrLinks = linksBase
            }
            this.$store.commit('changeLoading', false)
          } catch (e) {
            this.error(e.message)
            this.$store.commit('changeLoading', false)
          }
        }
      } else if (this.choice === 'nodes') {
        fileReader.onload = evt => {
          try {
            if (files[0].name.includes('road')) {
              this.loadedrNodes = JSON.parse(evt.target.result)
              this.loadedNodes = nodesBase
            } else {
              this.loadedNodes = JSON.parse(evt.target.result)
              this.loadedrNodes = nodesBase
            }
            this.$store.commit('changeLoading', false)
          } catch (e) {
            this.error(e.message)
            this.$store.commit('changeLoading', false)
          }
        }
      }
    },
    async readZip (event) {
      this.$store.commit('changeLoading', true)
      const files = event.target.files
      // there is a file
      if (!files.length) {
        this.$store.commit('changeLoading', false)
        return
      }
      // it is a zip
      if (files[0].name.slice(-3) !== 'zip') {
        this.$store.commit('changeLoading', false)
        this.errorMessage = $gettext('file is not a zip')
      }
      // read every selected zip and create a list of promises.
      // each promises contain {links, nodes}
      const PromisesList = []
      for (let i = 0; i < files.length; i++) {
        const res = extractZip(files[i])
        PromisesList.push(res)
      }
      // when all files are read
      Promise.all(PromisesList).then(files => {
        // asign first file to links and node var
        // for each other files concat, concat to links and nodes
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (Object.keys(file).includes('links') && Object.keys(file).includes('nodes')) {
            this.loadedLinks = file.links
            this.loadedNodes = file.nodes
          } if (Object.keys(file).includes('road_links') && Object.keys(file).includes('road_nodes')) {
            this.loadedrLinks = file.road_links
            this.loadedrNodes = file.road_nodes
          }
        }

        this.$store.commit('changeLoading', false)
      }).catch(err => {
        this.$store.commit('changeLoading', false)
        alert(err)
      })
    },

  },
}
</script>
<template>
  <section>
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
            {{ $gettext("Links and Nodes files must be geojson in EPSG:4326.") }}
          </div>
          <div class=" text-xs-center">
            <v-btn
              :color=" Object.keys(loadedLinks).length != 0? 'primary': 'normal'"
              @click="buttonHandle('links')"
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
              :color=" Object.keys(loadedNodes).length != 0? 'primary': 'normal'"
              @click="buttonHandle('nodes')"
            >
              <v-icon
                small
                left
              >
                fa-solid fa-upload
              </v-icon>
              {{ $gettext('Nodes') }}
            </v-btn>
            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  v-bind="attrs"
                  :color="'normal'"
                  v-on="on"
                  @click="buttonHandle('zip')"
                >
                  <v-icon
                    small
                    left
                  >
                    fas fa-file-archive
                  </v-icon>
                  {{ 'zip' }}
                </v-btn>
              </template>
              <span>{{ $gettext("Load zip files containing") }}</span>
              <br>
              <span>{{ $gettext("nodes.geojson and links.geojson or") }}</span>
              <br>
              <span>{{ $gettext("road_nodes.geojson and road_links.geojson") }}</span>
              <br>
              <span>{{ $gettext("or both the PT and road geojsons") }}</span>
            </v-tooltip>
          </div>
          <input
            ref="fileInput"
            type="file"
            style="display: none"
            accept=".geojson"
            @change="onFilePicked"
          >
          <input
            ref="zipInput"
            type="file"
            style="display: none"
            accept=".zip"
            multiple="multiple"
            @change="readZip"
          >

          <div>
            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  small
                  v-bind="attrs"
                  @click="buttonHandle('newProject')"
                  v-on="on"
                >
                  {{ $gettext('New Project') }}
                </v-btn>
              </template>
              <span>{{ $gettext("Create a network from scratch") }}</span>
            </v-tooltip>
          </div>

          <div>
            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  x-small
                  v-bind="attrs"
                  @click="buttonHandle('example')"
                  v-on="on"
                >
                  {{ $gettext('Example') }}
                </v-btn>
              </template>
              <span>{{ $gettext("Load Montréal Example") }}</span>
            </v-tooltip>
          </div>
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>
      </v-card>
    </div>
    <v-dialog
      v-model="showDialog"
      persistent
      max-width="350"
      @keydown.enter="applyDialog"
      @keydown.esc="showDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Overwrite current Project ?") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="regular"
            @click="showDialog = !showDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="applyDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
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
