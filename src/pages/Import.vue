<!-- eslint-disable no-case-declarations -->
<script>
import s3 from '../AWSClient'
import { extractZip, IndexAreDifferent, unzip, classFile } from '../components/utils/utils.js'
import OSMImporter from '../components/utils/OSMImporter.vue'

const $gettext = s => s

export default {
  name: 'Import',
  components: { OSMImporter },

  data () {
    return {
      loggedIn: false,
      choice: null,
      showDialog: false,
      loadedLinks: {},
      loadedNodes: {},
      loadedType: '',
      zipName: '',
      message: [],
      errorMessage: '',
      filesAdded: false,
    }
  },

  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    localLinksLoaded () { return Object.keys(this.loadedLinks).length === 0 },
    localNodesLoaded () { return Object.keys(this.loadedNodes).length === 0 },
    s3Path () { return this.$route.query.s3Path },
    localFilesAreLoaded () {
      return !(this.localLinksLoaded || this.localNodesLoaded)
    },

  },
  watch: {
    s3Path (val) {
      if (val) this.loadFilesFromS3(val)
    },
    localFilesAreLoaded (val) {
      if (val) {
        this.loadNetwork(this.loadedLinks, this.loadedNodes, this.loadedType, 'individual files')
        this.loadedLinks = {}
        this.loadedNodes = {}
        this.loadedType = ''
      }
    },

  },
  mounted () {
    this.$store.commit('changeNotification', '')
    if (this.s3Path) this.loadFilesFromS3(this.s3Path)
  },
  methods: {
    login () {
      // Leave time for animation to end (.animate-login and .animate-layer css rules)
      setTimeout(() => {
        this.$router.push('/Home').catch(() => {})
      }, 300)
    },
    async loadFilesFromS3 (path) {
      if (!this.projectIsEmpty) {
        this.$store.commit('initNetworks')
        this.$store.commit('unloadLayers')
        this.message = []
      }

      this.$store.commit('changeLoading', true)
      this.$router.replace({ query: null }) // remove query in url when page is load.
      try {
        let prefix = this.$store.getters.scenario + '/' + path.network_paths.read_links_path[0]
        let filesNames = await s3.listFiles(this.$store.getters.model, prefix)
        let links = {}
        let nodes = {}
        for (const file of filesNames) {
          const content = await s3.readJson(this.$store.getters.model, file)
          if (content.features[0].geometry.type === 'LineString') {
            links = content
          } else if (content.features[0].geometry.type === 'Point') {
            nodes = content
          }
        }
        if (filesNames.length > 0) this.loadNetwork(links, nodes, 'PT', 'DataBase')

        prefix = this.$store.getters.scenario + '/' + path.network_paths.read_rlinks_path[0]
        filesNames = await s3.listFiles(this.$store.getters.model, prefix)
        for (const file of filesNames) {
          const content = await s3.readJson(this.$store.getters.model, file)
          if (content.features[0].geometry.type === 'LineString') {
            links = content
          } else if (content.features[0].geometry.type === 'Point') {
            nodes = content
          }
        }
        if (filesNames.length > 0) this.loadNetwork(links, nodes, 'road', 'DataBase')

        // then load other layers.
        prefix = this.$store.getters.scenario + '/' + path.output_paths[0]
        filesNames = await s3.listFiles(this.$store.getters.model, prefix)
        const files = []
        for (const file of filesNames) {
          const content = await s3.readJson(this.$store.getters.model, file)
          files.push(classFile(file, content))
        }
        if (filesNames.length > 0) this.loadStaticLayer(files, 'Database output')
        this.loggedIn = true
        this.login()
        this.$store.commit('changeLoading', false)
      } catch (err) {
        console.error(err)
        this.$store.commit('changeLoading', false)
      }
    },

    loadNetwork (links, nodes, type, zipName) {
      if (links.features.length > 0) {
        if (!Object.keys(links.features[0].properties).includes('index')) {
          this.error($gettext('there is no index in links. Import aborted'))
          return
        }
      }
      if (nodes.features.length > 0) {
        if (!Object.keys(nodes.features[0].properties).includes('index')) {
          this.error($gettext('there is no index in nodes. Import aborted'))
          return
        }
      }

      if (type === 'PT') {
        if (IndexAreDifferent(links, this.$store.getters.links) &&
            IndexAreDifferent(nodes, this.$store.getters.nodes)) {
          this.$store.commit('appendNewLinks', { links: links, nodes: nodes })
          this.filesAdded = true
          if (zipName) this.message.push($gettext('PT Links and nodes Loaded from') + ' ' + zipName)
        } else {
          this.error($gettext('there is duplicated links or nodes index. Import aborted'))
        }
      } else if (type === 'road') {
        if (IndexAreDifferent(links, this.$store.getters.rlinks) &&
            IndexAreDifferent(nodes, this.$store.getters.rnodes)) {
          this.$store.commit('appendNewrLinks', { rlinks: links, rnodes: nodes })
          this.filesAdded = true
          if (zipName) this.message.push($gettext('ROAD links and nodes Loaded from') + ' ' + zipName)
        } else {
          this.error($gettext('there is duplicated links or nodes index. Import aborted'))
        }
      }
    },
    loadStaticLayer (files, zipName) {
      // filter links, road links and nodes if we dont want them before. in some case we want
      // to load them as static links (if the loaded links are called links.geojson for example)
      // load links and nodes geojson as static layers.
      files.filter(file => (['layerLinks', 'links', 'road_links'].includes(file.type))).forEach(
        file => {
          this.$store.commit('loadLayer', { fileName: file.fileName.slice(0, -8), type: 'links', links: file.data })
          this.message.push(file.fileName + ' ' + $gettext('Loaded from') + ' ' + zipName)
        })
      files.filter(file => (['layerNodes', 'nodes', 'road_nodes'].includes(file.type))).forEach(
        file => {
          this.$store.commit('loadLayer', { fileName: file.fileName.slice(0, -8), type: 'nodes', nodes: file.data })
          this.message.push(file.fileName + ' ' + $gettext('Loaded from') + ' ' + zipName)
        })
      // for zones. find the corresponding json file (mat) or nothing.
      files.filter(file => (file.type === 'zones')).forEach(
        file => {
          const zoneData = file.data
          const fileName = file.fileName.slice(0, -8)
          let matData = files.filter(json => json.fileName.slice(0, -5) === fileName)[0]?.data
          matData = matData || {}
          this.$store.commit('loadLayer', { fileName: fileName, type: 'zones', zones: zoneData, mat: matData })
          this.message.push(file.fileName + ' ' + $gettext('Loaded from') + ' ' + zipName)
          if (matData) this.message.push(file.fileName + '.json' + ' ' + $gettext('Loaded from') + ' ' + zipName)
        })
    },

    error (message) {
      this.loadedNodes = {}
      this.loadedLinks = {}
      this.loadedType = ''
      this.message = []
      this.errorMessage = message
      this.$store.commit('changeLoading', false)
    },

    buttonHandle (choice) {
      this.choice = choice
      this.errorMessage = ''
      switch (this.choice) {
        case 'zip':
          this.$refs.zipInput.click()
          document.getElementById('zip-input').value = '' // clean it for next file
          break
        case 'links':
          this.$refs.fileInput.click()
          document.getElementById('file-input').value = '' // clean it for next file
          break
        case 'nodes':
          this.$refs.fileInput.click()
          document.getElementById('file-input').value = '' // clean it for next file
          break
        case 'example1':
          this.projectIsEmpty ? this.loadExample(['PT', 'road']) : this.showDialog = true
          break
        case 'example2':
          this.projectIsEmpty ? this.loadExample(['PT', 'road', 'loaded', 'zones']) : this.showDialog = true
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

      if (this.choice === 'example1') {
        this.loadExample(['PT', 'road'])
      } else if (this.choice === 'example2') {
        this.loadExample(['PT', 'road', 'loaded', 'zones'])
      } else if (this.choice === 'newProject') {
        this.newProject()
      }
      this.showDialog = !this.showDialog
    },

    async loadExample (filesToLoads) {
      this.$store.commit('changeLoading', true)
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/'
      let links = {}
      let nodes = {}
      if (filesToLoads.includes('PT')) {
        links = await fetch(url + 'links_exemple.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!links) return
        nodes = await fetch(url + 'nodes_exemple.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!nodes) return
        this.loadNetwork(links, nodes, 'PT')
      }
      if (filesToLoads.includes('road')) {
        links = await fetch(url + 'road_links_exemple.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!links) return
        nodes = await fetch(url + 'road_nodes_exemple.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!nodes) return
        this.loadNetwork(links, nodes, 'road')
      }
      if (filesToLoads.includes('loaded')) {
        links = await fetch(url + 'loaded_links.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!links) return
        this.$store.commit('loadLayer', { fileName: 'loaded_links', type: 'links', links: links })

        nodes = await fetch(url + 'loaded_nodes.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!nodes) return

        this.$store.commit('loadLayer', { fileName: 'loaded_nodes', type: 'nodes', nodes: nodes })
      }
      if (filesToLoads.includes('zones')) {
        links = await fetch(url + 'zones.geojson').then(res => res.json())
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!links) return
        nodes = await fetch(url + 'zones.zip').then(res => unzip(res.blob()))
          .catch(() => { this.error($gettext('An error occur fetching example on github')) })
        if (!nodes) return

        this.$store.commit('loadLayer', { fileName: 'zones', type: 'zones', zones: links, mat: nodes })
      }
      // this is zones and mat. reuse var to save memory

      this.$store.commit('changeLoading', false)
      this.loggedIn = true
      this.login()
    },
    newProject () {
      this.$store.commit('initNetworks')
      this.$store.commit('unloadLayers')
      this.$store.commit('setScenario', '')

      this.$store.commit('changeNotification',
        { text: $gettext('project overwrited'), autoClose: true, color: 'success' })
      this.message = []
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
              this.loadedLinks = JSON.parse(evt.target.result)
              if (this.loadedType === 'PT') { this.error($gettext('road links loaded with PT nodes')); return }
              this.loadedType = 'road'
            } else {
              this.loadedLinks = JSON.parse(evt.target.result)
              if (this.loadedType === 'road') { this.error($gettext('PT links loaded with road nodes')); return }
              this.loadedType = 'PT'
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
              this.loadedNodes = JSON.parse(evt.target.result)
              if (this.loadedType === 'PT') { this.error($gettext('road nodes loaded for PT links')); return }
              this.loadedType = 'road'
            } else {
              this.loadedNodes = JSON.parse(evt.target.result)
              if (this.loadedType === 'road') { this.error($gettext('PT nodes loaded for road links')); return }
              this.loadedType = 'PT'
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
      Promise.all(PromisesList).then(zipFiles => {
        // asign first file to links and node var
        // for each other files concat, concat to links and nodes
        for (let i = 0; i < zipFiles.length; i++) {
          const files = zipFiles[i].files
          const zipName = zipFiles[i].zipName
          const importPT = files.filter(file => ['links', 'nodes'].includes(file.type)).length === 2
          const importRoad = files.filter(file => ['road_links', 'road_nodes'].includes(file.type)).length === 2
          if (importPT) {
            this.loadNetwork(
              files.filter(file => file.type === 'links')[0].data,
              files.filter(file => file.type === 'nodes')[0].data,
              'PT',
              zipName)
          } if (importRoad) {
            this.loadNetwork(
              files.filter(file => file.type === 'road_links')[0].data,
              files.filter(file => file.type === 'road_nodes')[0].data,
              'road',
              zipName)
          }
          this.loadStaticLayer(
            files.filter(file => !['links', 'nodes', 'road_links', 'road_nodes'].includes(file.type)),
            zipName)
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
            {{ $gettext("Load multiple Transit or road network. Each network will be added to the current project") }}
          </div>
          <div>
            {{ $gettext("Links and Nodes files must be geojson in EPSG:4326.") }}
          </div>
          <div class=" text-xs-center">
            <v-btn
              :color=" !localLinksLoaded? 'primary': 'normal'"
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
              :color=" !localNodesLoaded? 'primary': 'normal'"
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
            id="file-input"
            ref="fileInput"
            type="file"
            style="display: none"
            accept=".geojson"
            @change="onFilePicked"
          >
          <input
            id="zip-input"
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
              <span>{{ $gettext("Delete all network and start from scratch") }}</span>
            </v-tooltip>
          </div>

          <div>
            <v-menu
              offset-y
              nudge-left="70"
              close-delay="100"
              transition="slide-y-transition"
            >
              <template v-slot:activator="{ on: on,attrs:attrs }">
                <v-btn
                  small
                  v-bind="attrs"
                  v-on="on"
                >
                  {{ $gettext('example') }}
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  link
                  @click="()=>buttonHandle('example1')"
                >
                  <v-list-item-title>
                    {{ $gettext("PT & Road") }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item
                  link
                  @click="()=>buttonHandle('example2')"
                >
                  <v-list-item-title>
                    {{ $gettext("PT, Road, Zones, OD & Results") }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <div>
            <OSMImporter />
          </div>
          <div>
            <v-btn
              :disabled="!filesAdded"
              color="primary"
              @click="login()"
            >
              {{ $gettext('Go!') }}
            </v-btn>
          </div>
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'green'}">
          <p
            v-for="mess in message"
            :key="mess"
          >
            {{ $gettext(mess) }}
          </p>
        </v-card-text>
        <v-card-text :style="{textAlign: 'center',color:'red'}">
          {{ $gettext(errorMessage) }}
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
  background-color:var(--v-background-base);

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
  color: var(--v-primary-base);

  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: var(--v-secondarydark-base) !important;
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
