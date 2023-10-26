<!-- eslint-disable no-case-declarations -->
<script>
import s3 from '../AWSClient'
import { extractZip, unzip } from '../components/utils/utils.js'
import FileLoader from '@comp/import/FileLoader.vue'
import FilesList from '@comp/import/FilesList.vue'

import InfoZip from '@comp/import/InfoZip.vue'
const $gettext = s => s

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Import',
  components: {
    FileLoader,
    InfoZip,
    FilesList,
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
      this.$store.commit('runOSM/cleanRun')
      this.$store.commit('runGTFS/cleanRun')

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
      this.$store.commit('runOSM/cleanRun')
      this.$store.commit('runGTFS/cleanRun')
      this.$store.commit('changeNotification',
        { text: $gettext('project overwrited'), autoClose: true, color: 'success' })
    },

    loadNetwork (files) {
      this.$store.commit('loadFiles', files)
      this.filesAdded = true
      this.$store.commit('changeLoading', false)
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
        const files = await extractZip(zfiles[0])
        this.loadNetwork(files)
      } catch (err) {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', err)
      }
    },

    async loadFilesFromS3 () {
      if (!this.projectIsEmpty) {
        this.$store.commit('initNetworks')
        this.$store.commit('unloadLayers')
        this.$store.commit('run/cleanRun')
        this.$store.commit('runOSM/cleanRun')
        this.$store.commit('runGTFS/cleanRun')
      }
      this.$store.commit('changeLoading', true)
      this.$router.replace({ query: null }) // remove query in url when page is load.

      const model = this.$store.getters.model
      const scen = this.$store.getters.scenario + '/'

      const res = []
      try {
        let filesList = await s3.listFiles(model, scen)
        filesList = filesList.filter(name => !name.endsWith('/'))
        // console.log(filesList)
        for (const file of filesList) {
          const name = file.slice(scen.length) // remove scen name from file
          if (!name.startsWith('outputs/') && !name.startsWith('inputs/')) {
            if (name === 'styles.json') {
              const content = await s3.readJson(model, file)
              res.push({ path: name, content: content })
            }
            if (name === 'attributesChoices.json') {
              const content = await s3.readJson(model, file)
              res.push({ path: name, content: content })
            }
          } else if (file.endsWith('.json') || file.endsWith('.geojson')) {
            const content = await s3.readJson(model, file)
            res.push({ path: name, content: content })
          } else {
            res.push({ path: name, content: null })
          }
        }
        this.loadNetwork(res)
      } catch (err) {
        this.$store.commit('changeAlert', err)
        this.$store.commit('changeLoading', false)
      }
    },

    async loadExample (filesToLoads) {
      this.$store.commit('changeLoading', true)
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/'
      const res = []
      let content = {}

      try {
        if (filesToLoads.includes('PT')) {
          content = await fetch(url + 'links_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/pt/links.geojson', content: content })
          content = await fetch(url + 'nodes_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/pt/nodes.geojson', content: content })
        }

        if (filesToLoads.includes('road')) {
          content = await fetch(url + 'road_links_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/road/links.geojson', content: content })
          content = await fetch(url + 'road_nodes_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/road/nodes.geojson', content: content })
        }

        if (filesToLoads.includes('loaded')) {
          content = await fetch(url + 'loaded_links.geojson').then(res => res.json())
          res.push({ path: 'outputs/loaded_links.geojson', content: content })
          content = await fetch(url + 'loaded_nodes.geojson').then(res => res.json())
          res.push({ path: 'outputs/loaded_nodes.geojson', content: content })
        }

        if (filesToLoads.includes('zones')) {
          content = await fetch(url + 'zones.geojson').then(res => res.json())
          res.push({ path: 'outputs/zones.geojson', content: content })
          content = await fetch(url + 'zones.zip').then(res => unzip(res.blob()))
          res.push({ path: 'outputs/zones.json', content: content })
        }
        // this is zones and mat. reuse var to save memory

        this.loadNetwork(res)
        // this.loggedIn = true
        // this.login()
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
                {{ $gettext("Start importing files individually or start with an empty project") }}
              </div>
              <div class="subtitle">
                {{ $gettext("OR") }}
              </div>
              <div class="title">
                {{ $gettext("Load Zip") }}
                <InfoZip />
              </div>
              <div>
                <v-btn
                  :style="{'margin-right':'auto'}"
                  :color="'normal'"
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
              </div>
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
            </v-card-text>
          </v-col>
          <v-divider vertical />
          <v-col>
            <FileLoader
              @FilesLoaded="(files) => loadNetwork(files)"
            />
          </v-col>
          <v-divider vertical />

          <v-col>
            <FilesList
              @FilesLoaded="(files) => loadNetwork(files)"
            />
          </v-col>
        </v-row>
        <div class="button-row">
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
                {{ $gettext('New Project') }}
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
  width:80rem;
  overflow-y:hidden;
  padding: 20px;
}
.button-question{
  display: flex;
  align-items: center ;

}
.title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em !important;
  color: var(--v-primary-base);
  font-weight: bold;
  margin-top:18px;
}
.subtitle {
  font-size: 1.5em;
  font-weight: bold;
  margin: 20px;
}
.card button {
  margin: 0.5rem;
}
.animate-login {
  transform: translateY(-185%);
  transition: 1s;
}
.animate-layer {
  opacity: 0;
  transition: 1s;
}
.button-row{
  display: flex;
  align-items: center;
  justify-content:center;
  margin-top : 1rem;
  padding-top:0.5rem;
  border-top: 1px solid var(--v-lightgrey-base);
}

</style>
