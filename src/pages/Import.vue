<!-- eslint-disable no-case-declarations -->
<script>
import s3 from '../AWSClient'
import { extractZip, IndexAreDifferent, unzip, classFile } from '../components/utils/utils.js'
import { serializer } from '../components/utils/serializer.js'
import FilesList from '@comp/import/FilesList.vue'
import FileLoader from '@comp/import/FileLoader.vue'

const $gettext = s => s

export default {
  name: 'Import',
  components: {
    FilesList,
    FileLoader,

  },

  data () {
    return {
      loggedIn: false,
      choice: null,
      showDialog: false,

      filesAdded: false,
    }
  },

  computed: {
    projectIsEmpty () { return this.$store.getters.projectIsEmpty },
    s3Path () { return this.$route.query.s3Path },

  },
  watch: {
    s3Path (val) {
      if (val) this.loadFilesFromS3(val)
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

    buttonHandle (choice) {
      this.choice = choice
      switch (this.choice) {
        case 'zip':
          this.$refs.zipInput.click()
          document.getElementById('zip-input').value = '' // clean it for next file
          break
        case 'example1':
          this.projectIsEmpty ? this.loadExample(['PT', 'road']) : this.showDialog = true
          break
        case 'example2':
          this.projectIsEmpty ? this.loadExample(['PT', 'road', 'loaded', 'zones']) : this.showDialog = true
          break
        case 'newProject':
          this.projectIsEmpty ? this.newProject() : this.showDialog = true
          break
      }
    },

    applyDialog () {
      // this only happen when both files are loaded.
      // remove links and nodes from store. (and filesAreLoaded)
      this.$store.commit('initNetworks')
      this.$store.commit('unloadLayers')
      this.$store.commit('unloadProject')
      this.$store.commit('run/cleanRun')

      if (this.choice === 'example1') {
        this.loadExample(['PT', 'road'])
      } else if (this.choice === 'example2') {
        this.loadExample(['PT', 'road', 'loaded', 'zones'])
      } else if (this.choice === 'newProject') {
        this.newProject()
      }
      this.showDialog = !this.showDialog
    },

    newProject () {
      this.$store.commit('initNetworks')
      this.$store.commit('unloadLayers')
      this.$store.commit('unloadProject')
      this.$store.commit('run/cleanRun')
      this.$store.commit('changeNotification',
        { text: $gettext('project overwrited'), autoClose: true, color: 'success' })
    },

    loadNetwork (links, nodes, type) {
      if (type === 'PT') {
        if (IndexAreDifferent(links, this.$store.getters.links) &&
            IndexAreDifferent(nodes, this.$store.getters.nodes)) {
          this.$store.commit('appendNewLinks', { links: links, nodes: nodes })
          this.filesAdded = true
        } else {
          this.$store.commit('changeAlert', {
            name: 'ImportError',
            message: $gettext('there are duplicated links or nodes index. Import aborted'),
          })
        }
      } else if (type === 'road') {
        if (IndexAreDifferent(links, this.$store.getters.rlinks) &&
            IndexAreDifferent(nodes, this.$store.getters.rnodes)) {
          this.$store.commit('appendNewrLinks', { rlinks: links, rnodes: nodes })
          this.filesAdded = true
        } else {
          this.$store.commit('changeAlert', {
            name: 'ImportError',
            message: $gettext('there are duplicated links or nodes index. Import aborted'),
          })
        }
      }
    },

    async readZip (event) {
      try {
        this.$store.commit('changeLoading', true)
        const zfiles = event.target.files
        // there is a file
        if (!zfiles.length) {
          this.$store.commit('changeLoading', false)
          return
        }
        // it is a zip
        if (zfiles[0].name.slice(-3) !== 'zip') {
          this.$store.commit('changeLoading', false)
          this.$store.commit('changeAlert', { name: 'ImportError', message: $gettext('file is not a zip') })
          return
        }
        // read every selected zip and create a list of promises.
        // each promises contain {links, nodes}

        // when all files are read
        const zipFiles = await extractZip(zfiles[0])
        // asign first file to links and node var
        // for each other files concat, concat to links and nodes
        const files = zipFiles.files

        const zipName = zipFiles.zipName
        const ptFiles = files.filter(file => ['links', 'nodes'].includes(file?.type))
        const roadFiles = files.filter(file => ['road_links', 'road_nodes'].includes(file?.type))
        if (ptFiles.length % 2 !== 0) {
          console.log(ptFiles.length)
          const err = new Error($gettext('Need the same number of links and nodes files.'))
          err.name = 'ImportError'
          throw err
        }
        if (roadFiles.length % 2 !== 0) {
          const err = new Error($gettext('Need the same number of road_links and road_nodes files.'))
          err.name = 'ImportError'
          throw err
        }
        for (let i = 0; i < ptFiles.length / 2; i++) {
          const links = files.filter(file => file.type === 'links')[i]
          const nodes = files.filter(file => file.type === 'nodes')[i]
          this.loadNetwork(
            serializer(links.data, links.fileName, 'LineString'),
            serializer(nodes.data, nodes.filesNames, 'Point'),
            'PT')
        } for (let i = 0; i < roadFiles.length / 2; i++) {
          const links = files.filter(file => file.type === 'road_links')[0]
          const nodes = files.filter(file => file.type === 'road_nodes')[0]
          this.loadNetwork(
            serializer(links.data, links.fileName, 'LineString'),
            serializer(nodes.data, nodes.fileName, 'Point'),
            'road')
        }
        // load params
        console.log(files)
        const params = files.filter(file => file.type === 'params')
        if (params.length > 0) {
          console.log(params)
          this.$store.commit('run/getLocalParameters', params[0].data)
          this.$store.commit('addFile', { name: params[0].fileName, source: zipName, type: 'params' })
        }

        this.$store.commit('loadLayers', {
          files: files.filter(file => !['links', 'nodes', 'road_links', 'road_nodes'].includes(file?.type)),
          name: zipName,
        },
        )

        this.$store.commit('loadOtherFiles', { files: files.filter(file => file?.type === 'other'), source: zipName })

        this.$store.commit('changeLoading', false)
        this.$store.commit('changeLoading', false)
      } catch (err) {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', err)
      }
    },

    async loadFilesFromS3 (path) {
      if (!this.projectIsEmpty) {
        this.$store.commit('initNetworks')
        this.$store.commit('unloadLayers')
      }
      this.$store.commit('changeLoading', true)
      this.$router.replace({ query: null }) // remove query in url when page is load.
      let links = {}
      let nodes = {}
      const scen = this.$store.getters.scenario + '/'
      const model = this.$store.getters.model
      try {
        let filesNames = await s3.listFiles(model, scen + path.network_paths.links)
        if (filesNames.length > 0) {
          links = await s3.readJson(model, scen + path.network_paths.links)
          nodes = await s3.readJson(model, scen + path.network_paths.nodes)
          this.loadNetwork(
            serializer(links, path.network_paths.links, 'LineString'),
            serializer(nodes, path.network_paths.nodes, 'Point'),
            'PT')
        }
        filesNames = await s3.listFiles(model, scen + path.network_paths.rlinks)
        console.log(filesNames)
        if (filesNames.length > 0) {
          links = await s3.readJson(model, scen + path.network_paths.rlinks)
          nodes = await s3.readJson(model, scen + path.network_paths.rnodes)
          this.loadNetwork(
            serializer(links, path.network_paths.rlinks, 'LineString'),
            serializer(nodes, path.network_paths.rnodes, 'Point'),
            'road')
        }
        // then load results layers.
        filesNames = await s3.listFiles(model, scen + path.output_paths)
        filesNames = filesNames.filter(name => !name.endsWith('/'))
        filesNames = filesNames.filter(name => !name.endsWith('.png'))
        const files = []
        for (const file of filesNames) {
          const content = await s3.readJson(model, file)
          const name = file.split('/').slice(1).join('/')
          files.push(classFile(name, content))
        }
        if (filesNames.length > 0) this.$store.commit('loadLayers', { files: files, name: 'db' })

        // load rasters (static geojson layers.)
        filesNames = await s3.listFiles(model, scen + path.raster_path)
        filesNames = filesNames.filter(name => name.endsWith('.geojson'))
        const rasterFiles = []
        for (const file of filesNames) {
          let type = await s3.readJson(model, file)
          type = type.features[0].geometry.type
          rasterFiles.push({ name: file, type: type })
        }
        this.$store.commit('setRasterFiles', rasterFiles)

        this.loggedIn = true
        this.login()
        this.$store.commit('changeLoading', false)
      } catch (err) {
        this.$store.commit('changeAlert', err)
        this.$store.commit('changeLoading', false)
      }
    },

    async loadExample (filesToLoads) {
      this.$store.commit('changeLoading', true)
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/'
      let links = {}
      let nodes = {}
      try {
        if (filesToLoads.includes('PT')) {
          links = await fetch(url + 'links_exemple.geojson').then(res => res.json())
          if (!links) return
          nodes = await fetch(url + 'nodes_exemple.geojson').then(res => res.json())
          if (!nodes) return
          this.loadNetwork(links, nodes, 'PT')
        }

        if (filesToLoads.includes('road')) {
          links = await fetch(url + 'road_links_exemple.geojson').then(res => res.json())
          if (!links) return
          nodes = await fetch(url + 'road_nodes_exemple.geojson').then(res => res.json())
          if (!nodes) return
          this.loadNetwork(links, nodes, 'road')
        }

        if (filesToLoads.includes('loaded')) {
          links = await fetch(url + 'loaded_links.geojson').then(res => res.json())
          if (!links) return
          this.$store.commit('createLayer', { fileName: 'loaded_links', data: links, mat: {} })
          nodes = await fetch(url + 'loaded_nodes.geojson').then(res => res.json())
          if (!nodes) return
          this.$store.commit('createLayer', { fileName: 'loaded_nodes', data: nodes, mat: {} })
          // add files to list of loaded files
          this.$store.commit('addFile', { name: 'loaded_links', source: 'example', type: 'result' })
          this.$store.commit('addFile', { name: 'loaded_nodes', source: 'example', type: 'result' })
        }

        if (filesToLoads.includes('zones')) {
          links = await fetch(url + 'zones.geojson').then(res => res.json())
          if (!links) return
          nodes = await fetch(url + 'zones.zip').then(res => unzip(res.blob()))
          if (!nodes) return
          this.$store.commit('createLayer', { fileName: 'zones', data: links, mat: nodes })
          // add files to list of loaded files
          this.$store.commit('addFile', { name: 'zones', source: 'example', type: 'result' })
          this.$store.commit('addFile', { name: 'zones', source: 'matrix', type: 'result matrix' })
        }
        // this is zones and mat. reuse var to save memory

        this.$store.commit('changeLoading', false)
        this.loggedIn = true
        this.login()
      } catch {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', {
          name: 'ImportError',
          message: $gettext($gettext('An error occur fetching example on github')),
        })
      }
    },

  },
}
</script>
<template>
  <section>
    <input
      id="zip-input"
      ref="zipInput"
      type="file"
      style="display: none"
      accept=".zip"
      @change="readZip"
    >

    <div class="layout">
      <div
        class="layout-overlay"
        :class="{ 'animate-layer': loggedIn }"
      />
      <v-card
        class="card"
        :class="{ 'animate-login': loggedIn }"
      >
        <v-row>
          <v-col>
            <v-card-text :style="{textAlign: 'center'}">
              <div class="title">
                {{ $gettext("Select a Project") }}
              </div>
              <div>
                {{ $gettext("Log in and select an existing project or create a new project from project navigation menu") }}
              </div>
              <div class="subtitle">
                {{ $gettext("OR") }}
              </div>
              <div class="title">
                {{ $gettext("Continue Without Project") }}
              </div>
              <div>
                {{ $gettext("Start importing files individually ") }}
              </div>
              <div class="subtitle">
                {{ $gettext("OR") }}
              </div>
              <div class="title">
                {{ $gettext("Load Zip") }}
              </div>
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
                    {{ $gettext('Load Zip File') }}
                  </v-btn>
                </template>
                <span>{{ $gettext("Load zip files containing") }}</span>
                <br>
                <span>{{ $gettext("inputs/pt/ nodes.geojson and links.geojson") }}</span>
                <br>
                <span>{{ $gettext("inputs/road/ road_nodes.geojson and road_links.geojson") }}</span>
                <br>
                <span>{{ $gettext("outputs/ anything") }}</span>
              </v-tooltip>

              <div class="subtitle">
                {{ $gettext("OR") }}
              </div>
              <div class="title">
                {{ $gettext("Load Example") }}
              </div>

              <v-menu

                offset-y
                nudge-left="70"
                close-delay="100"
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ on: on,attrs:attrs }">
                  <v-btn
                    :style="{'margin-bottom':'2rem'}"
                    v-bind="attrs"
                    v-on="on"
                  >
                    {{ $gettext('Load Example') }}
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
              <v-divider />

              <div>
                <v-tooltip
                  bottom
                  open-delay="500"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      v-bind="attrs"
                      @click="buttonHandle('newProject')"
                      v-on="on"
                    >
                      {{ $gettext('Delete All') }}
                    </v-btn>
                  </template>
                  <span>{{ $gettext("Delete all network and start from scratch") }}</span>
                </v-tooltip>
                <v-btn
                  :disabled="!filesAdded"
                  color="primary"
                  @click="login()"
                >
                  {{ $gettext('Go!') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-col>
          <v-divider vertical />
          <v-col>
            <div class="overflow-container">
              <v-row>
                <FileLoader @networkLoaded="(e)=>loadNetwork(e.links,e.nodes,e.type)" />
              </v-row>

              <v-divider />
              <FilesList />
            </div>
          </v-col>
        </v-row>
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
  height: 42em;
  width:calc(70%);
  overflow-y:hidden;
  padding: 20px;
}
.col{
  margin:1em;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 2em !important;
  color: var(--v-primary-base);
  font-weight: bold;
  margin-top:30px;
}
.subtitle {
  font-size: 1.5em;
  font-weight: bold;
  margin: 20px;
}
.card button {
  margin-top: 0.5rem;
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
