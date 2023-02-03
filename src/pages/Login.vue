<script>

import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
import { extractZip } from '../components/utils/utils.js'
import road_links from '@static/road_links.geojson'
import road_nodes from '@static/road_nodes.geojson'

// rlinks.features.forEach(link => link.properties._hidden = true)
// const ls = ['rlink_1', 'rlins_2', 'rlink_10']
// rlinks.features.filter(link => ls.includes(link.properties.index)).forEach(link => link.properties._hidden = false)
// const test = rlinks.features.filter(link => link.properties._hidden === false)
// console.log(test)

export default {
  name: 'Login',
  data () {
    return {
      loggedIn: false,
      loadedLinks: {},
      loadedNodes: {},
      choice: null,
      loading: { links: false, nodes: false, zip: false },
      showDialog: false,
    }
  },

  computed: {
    filesAreLoaded () { return this.$store.getters.filesAreLoaded },
    localFilesAreLoaded () {
      return !((Object.keys(this.loadedLinks).length === 0 || Object.keys(this.loadedNodes).length === 0))
    },
  },
  watch: {
    loadedLinks (value) {
      this.$store.commit('loadLinks', value)
      this.$store.commit('loadrLinks', linksBase)
      this.loading.links = false
    },
    loadedNodes (value) {
      this.$store.commit('loadNodes', value)
      this.$store.commit('loadrNodes', nodesBase)
      this.loading.nodes = false
    },
    localFilesAreLoaded (val) {
      if (val) {
        this.loggedIn = true
        this.login()
      }
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

    buttonHandle (choice) {
      this.choice = choice
      if (!this.filesAreLoaded) {
        if (choice === 'example') {
          this.loadExample()
        } else if (choice === 'newProject') {
          this.newProject()
        } else if (choice === 'zip') {
          // read zip witjh links and nodes.
          this.$refs.zipInput.click()
        } else {
          // read json links or node (depending on choice)
          this.$refs.fileInput.click()
        }
      } else {
        this.showDialog = true
      }
    },
    applyDialog () {
      // this only happen when both files are loaded.
      // remove links and nodes from store. (and filesAreLoaded)
      this.$store.commit('unloadFiles')

      if (this.choice === 'example') {
        this.loadExample()
      } else if (this.choice === 'newProject') {
        this.newProject()
      } else if (this.choice === 'zip') {
        // handle click and open file explorer
        this.$refs.zipInput.click()
      } else {
        // this only happen when both files are loaded.
        // remove links and nodes from store. (and filesAreLoaded)
        this.$store.commit('unloadFiles')
        // handle click and open file explorer
        this.$refs.fileInput.click()
      }
      this.showDialog = !this.showDialog
    },

    loadExample () {
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/static/'
      fetch(url + 'links_exemple.geojson')
        .then(res => res.json())
        .then(out => { this.loadedLinks = out })
        .catch(err => { alert(err) })

      fetch(url + 'nodes_exemple.geojson')
        .then(res => res.json())
        .then(out => { this.loadedNodes = out })
        .catch(err => { alert(err) })
    },
    newProject () {
      this.loadedLinks = linksBase
      this.loadedNodes = nodesBase
    },

    onFilePicked (event) {
      this.loading[this.choice] = true
      const files = event.target.files
      // there is a file
      if (!files.length) {
        this.loading[this.choice] = false
        return
      }
      // it is a geojson
      if (files[0].name.slice(-7) !== 'geojson') {
        this.loading[this.choice] = false
        alert('file is not a geojson')
        return
      }

      const fileReader = new FileReader()
      fileReader.readAsText(files[0])
      if (this.choice === 'links') {
        fileReader.onload = evt => {
          try {
            this.loadedLinks = JSON.parse(evt.target.result)
          } catch (e) {
            this.$store.commit('changeNotification', { text: e.message, autoClose: true, color: 'red darken-2' })
            this.loading[this.choice] = false
          }
        }
      } else if (this.choice === 'nodes') {
        fileReader.onload = evt => {
          try {
            this.loadedNodes = JSON.parse(evt.target.result)
          } catch (e) {
            alert(e.message)
            this.loading[this.choice] = false
          }
        }
      }
    },
    async readZip (event) {
      this.loading.zip = true
      const files = event.target.files
      // there is a file
      if (!files.length) {
        this.loading.zip = false
        return
      }
      // it is a zip
      if (files[0].name.slice(-3) !== 'zip') {
        this.loading.zip = false
        alert('file is not a zip')
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
        const links = files[0].links
        const nodes = files[0].nodes
        // for each other files concat, concat to links and nodes
        for (let i = 1; i < files.length; i++) {
          links.features.push(...files[i].links.features)
          nodes.features.push(...files[i].nodes.features)
        }
        // then its finish
        this.loadedLinks = links
        this.loadedNodes = nodes
        this.loading.zip = false
      }).catch(err => {
        this.loading.zip = false
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
            {{ $gettext("Links and Nodes files must be geojson in EPSG:4326") }}
          </div>
          <div class=" text-xs-center">
            <v-btn
              :loading="loading.links"
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
              :loading="loading.nodes"
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
                  :loading="loading.zip"
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
              <span>{{ $gettext("nodes.geojson and links.geojson") }}</span>
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
