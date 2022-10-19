<script>

import JSZip from 'jszip'
const $gettext = s => s

export default {
  name: 'Import',
  data () {
    return {
      loggedIn: false,
      errorMessage: '',
      loadedLinks: {},
      loadedNodes: {},
      loading: { zip: false },
    }
  },

  computed: {
    localFilesAreLoaded () {
      return !((Object.keys(this.loadedLinks).length === 0 || Object.keys(this.loadedNodes).length === 0))
    },
  },
  watch: {
    loadedLinks (newLinks) {
      if (Object.keys(newLinks).length !== 0) {
        const linksIndex = new Set(this.$store.getters.links.features.map(item => item.properties.index))
        const newLinksIndex = new Set(newLinks.features.map(item => item.properties.index))
        if (new Set([...linksIndex, ...newLinksIndex]).size !== (linksIndex.size + newLinksIndex.size)) {
          this.loadedLinks = {}
          this.loadedNodes = {}
          this.errorMessage = $gettext('there is duplicated links index. Import aborted')
        } else {
          // console.log('all good')
        }
        if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(newLinks.crs.properties.name)) {
          this.errorMessage = $gettext('invalid CRS. use CRS84 / EPSG:4326. Import aborted')
          this.loadedNodes = {}
          this.loadedLinks = {}
        }
      }
    },
    loadedNodes (newNodes) {
      if (Object.keys(newNodes).length !== 0) {
        const nodesIndex = new Set(this.$store.getters.nodes.features.map(item => item.properties.index))
        const newNodesIndex = new Set(newNodes.features.map(item => item.properties.index))
        if (new Set([...nodesIndex, ...newNodesIndex]).size !== (nodesIndex.size + newNodesIndex.size)) {
          this.errorMessage = $gettext('there is duplicated nodes index. Import aborted')
          this.loadedNodes = {}
          this.loadedLinks = {}
        } else {
          // console.log('all good')
        }
        if (!['urn:ogc:def:crs:OGC:1.3:CRS84', 'EPSG:4326'].includes(newNodes.crs.properties.name)) {
          this.errorMessage = $gettext('invalid CRS. use CRS84 / EPSG:4326. Import aborted')
          this.loadedNodes = {}
          this.loadedLinks = {}
        }
      }
    },
    localFilesAreLoaded (val) {
      if (val) {
        this.$store.commit('appendNewFile', { links: this.loadedLinks, nodes: this.loadedNodes })
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
      // save as cookie
      this.$localStorage.set('links', this.$store.getters.links)
      this.$localStorage.set('nodes', this.$store.getters.nodes)
      // Leave time for animation to end (.animate-login and .animate-layer css rules)
      setTimeout(() => {
        this.$router.push('/Home').catch(() => {})
      }, 1000)
    },
    buttonHandle (choice) {
      this.loadedLinks = {}
      this.loadedNodes = {}
      this.errorMessage = ''
      // read zip witjh links and nodes.
      this.$refs.zipInput.click()
    },
    readZip (event) {
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
        this.errorMessage = $gettext('file is not a zip. Import aborted')
        return
      }
      const zip = new JSZip()
      zip.loadAsync(files[0])
        .then((zip) => {
          // process ZIP file content here
          // eslint-disable-next-line no-var
          // var counter = 0
          Object.keys(zip.files).forEach((key) => {
            if (zip.files[key].name.slice(-7) === 'geojson') {
              let fileName = key.split('/')
              fileName = fileName[fileName.length - 1]
              // if (fileName.includes('links') | fileName.includes('nodes')) { counter++ }
              zip.file(key).async('string').then((str) => {
                const content = JSON.parse(str)
                if (fileName.includes('links')) {
                  this.loadedLinks = content
                } else if (fileName.includes('nodes')) {
                  this.loadedNodes = content
                }
              }).catch(() => { }) // remove alert, this happen when there is more file in the zip, ex: DS_STORE
            }
          })
          // if (counter !== 2) {
          //  alert('zip must contains nodes.geojson and links.geojson exactly once')
          //  this.loadedLinks = {}
          //  this.loadedNodes = {}
          // }

          this.loading.zip = false
        }, () => { this.errorMessage = $gettext('Not a valid zip file. Import aborted'); this.loading.zip = false })
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
            {{ $gettext("Add Files") }}
          </div>
          <div>
            {{ $gettext("Links and Nodes files must be geojson in EPSG:4326") }}
          </div>
          <div class=" text-xs-center">
            <v-tooltip
              bottom
              open-delay="500"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  v-bind="attrs"
                  :loading="loading.zip"
                  :color=" localFilesAreLoaded? 'primary': 'normal'"
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
              <span>{{ $gettext("Load a zip file containing") }}</span>
              <br>
              <span>{{ $gettext("nodes.geojson and links.geojson") }}</span>
            </v-tooltip>
          </div>
          <input
            ref="zipInput"
            type="file"
            style="display: none"
            accept=".zip"
            @change="readZip"
          >
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ errorMessage }}
        </v-card-text>
      </v-card>
    </div>
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
