<script>

import linksExample from '@static/links_exemple.geojson'
import nodesExample from '@static/nodes_exemple.geojson'
import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'

export default {
  name: 'Login',
  data () {
    return {
      loggedIn: false,
      loadedLinks: {},
      loadedNodes: {},
      choice: null,
      loading: { links: false, nodes: false },
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
    loadedLinks () {
      this.$store.commit('loadLinks', this.loadedLinks)
      this.loading.links = false
    },
    loadedNodes () {
      this.$store.commit('loadNodes', this.loadedNodes)
      this.loading.nodes = false
    },
    localFilesAreLoaded (val) {
      if (val) {
        this.login()
      }
    },

  },
  created () {
    const cookieLinks = this.$localStorage.get('links')
    const cookieNodes = this.$localStorage.get('nodes')
    if (Object.keys(cookieLinks).length !== 0 && Object.keys(cookieNodes).length !== 0) {
      this.$store.commit('loadLinks', cookieLinks)
      this.$store.commit('loadNodes', cookieNodes)
    }
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
      this.loadedLinks = linksExample
      this.loadedNodes = nodesExample
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
    readZip (event) {
      this.loading[this.choice] = true
      const files = event.target.files
      // there is a file
      if (!files.length) {
        this.loading[this.choice] = false
        return
      }
      // it is a geojson
      if (files[0].name.slice(-3) !== 'zip') {
        this.loading[this.choice] = false
        alert('file is not a zip')
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
            <v-btn
              :loading="loading.nodes"
              :color=" Object.keys(loadedNodes).length != 0? 'primary': 'normal'"
              @click="buttonHandle('zip')"
            >
              <v-icon
                small
                left
              >
                fa-solid fa-upload
              </v-icon>
              {{ $gettext('zip') }}
            </v-btn>
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
