<!-- eslint-disable no-case-declarations -->
<script>
import s3 from '../AWSClient'
import { extractZip, unzip } from '../components/utils/utils.js'
import FileLoader from '@comp/import/FileLoader.vue'
import FilesList from '@comp/import/FilesList.vue'
import ScenariosExplorer from '@comp/import/ScenariosExplorer.vue'

import { computed } from 'vue'

import InfoZip from '@comp/import/InfoZip.vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useRunStore } from '@src/store/run'
const $gettext = s => s

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Import',
  components: {
    ScenariosExplorer,
    FileLoader,
    InfoZip,
    FilesList,
  },
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const scenariosList = computed(() => { return userStore.scenariosList.splice(0, 4) })
    const runStore = useRunStore()
    const projectIsEmpty = computed(() => store.projectIsEmpty)

    function showScenarios () {
      store.changeShowScenarios()
    }
    return { store, userStore, runStore, projectIsEmpty, showScenarios, scenariosList }
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
    s3Path () { return this.$route.query.s3Path },

  },
  watch: {
    s3Path (val) {
      if (val) this.loadFilesFromS3(val)
    },

  },
  mounted () {
    this.store.changeNotification('')
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
      this.store.initNetworks()
      // TODO
      // this.store.unloadLayers()
      this.userStore.unloadProject()
      this.runStore.cleanRun()
      // TODO
      // this.runOSMStore.cleanRun()
      // this.runGTFSStore.cleanRun()

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
      this.store.initNetworks()
      // TODO
      // this.store.unloadLayers()
      this.userStore.unloadProject()
      this.runStore.cleanRun()
      // TODO
      // this.runOSMStore.cleanRun()
      // this.runGTFSStore.cleanRun()
      this.store.changeNotification({ text: $gettext('project overwrited'), autoClose: true, color: 'success' })
    },

    loadNetwork (files) {
      this.store.loadFiles(files)
      this.filesAdded = true
      this.store.changeLoading(false)
    },

    async readZip (event) {
      try {
        this.store.changeLoading(true)
        const zfiles = event.target.files
        // there is a file
        if (!zfiles.length) {
          this.store.changeLoading(false)
          return
        }
        // it is a zip
        if (zfiles[0].name.slice(-3) !== 'zip') {
          this.store.changeLoading(false)
          this.store.changeAlert({ name: 'ImportError', message: $gettext('file is not a zip') })
          return
        }
        const files = await extractZip(zfiles[0])
        this.loadNetwork(files)
      } catch (err) {
        this.store.changeLoading(false)
        this.store.changeAlert(err)
      }
    },

    async loadFilesFromS3 () {
      if (!this.projectIsEmpty) {
        this.store.initNetworks()
        this.runStore.cleanRun()
        // this.store.unloadLayers()
        // TODO
        // this.runOSMStore.cleanRun()
        // this.runGTFSStore.cleanRun()
      }
      this.store.changeLoading(true)
      this.$router.replace({ query: null }) // remove query in url when page is load.

      const model = this.userStore.model
      const scen = this.userStore.scenario + '/'

      const res = []
      try {
        let filesList = await s3.listFiles(model, scen)
        filesList = filesList.filter(name => !name.endsWith('/'))
        for (const file of filesList) {
          const name = file.slice(scen.length) // remove scen name from file
          // take knowned files outside of outputs and inputs (styles and attrivutesChoides)
          if (!name.startsWith('outputs/') && !name.startsWith('inputs/')) {
            if (name === 'styles.json') {
              const content = await s3.readJson(model, file)
              res.push({ path: name, content })
            }
            if (name === 'attributesChoices.json') {
              const content = await s3.readJson(model, file)
              res.push({ path: name, content })
            }
            // take PT and road network and param.json.
          } else if (name.startsWith('inputs/pt/') || name.startsWith('inputs/road/') || name.startsWith('inputs/od/') || name === 'inputs/params.json') {
            const content = await s3.readJson(model, file)
            res.push({ path: name, content })
            // else. we do not load the file. (outputs or inputs.) we will fetch them when needed.
          } else {
            res.push({ path: name, content: null })
          }
        }
        this.loadNetwork(res)
      } catch (err) {
        this.store.changeAlert(err)
        this.store.changeLoading(false)
      }
    },

    async loadExample (filesToLoads) {
      this.store.changeLoading(true)
      const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/'
      const res = []
      let content = {}

      try {
        if (filesToLoads.includes('PT')) {
          content = await fetch(url + 'links_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/pt/links.geojson', content })
          content = await fetch(url + 'nodes_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/pt/nodes.geojson', content })
        }

        if (filesToLoads.includes('road')) {
          content = await fetch(url + 'road_links_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/road/links.geojson', content })
          content = await fetch(url + 'road_nodes_exemple.geojson').then(res => res.json())
          res.push({ path: 'inputs/road/nodes.geojson', content })
        }

        if (filesToLoads.includes('loaded')) {
          content = await fetch(url + 'loaded_links.geojson').then(res => res.json())
          res.push({ path: 'outputs/loaded_links.geojson', content })
          content = await fetch(url + 'loaded_nodes.geojson').then(res => res.json())
          res.push({ path: 'outputs/loaded_nodes.geojson', content })
        }

        if (filesToLoads.includes('zones')) {
          content = await fetch(url + 'zones.geojson').then(res => res.json())
          res.push({ path: 'outputs/zones.geojson', content })
          content = await fetch(url + 'zones.zip').then(res => unzip(res.blob()))
          res.push({ path: 'outputs/zones.json', content })
        }
        // this is zones and mat. reuse var to save memory

        this.loadNetwork(res)
        // this.loggedIn = true
        // this.login()
      } catch {
        this.store.changeLoading(false)
        this.store.changeAlert({
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
          <v-col class="left-col">
            <scenariosExplorer />
          </v-col>
          <v-divider vertical />
          <v-col class="center-col">
            <FileLoader
              @FilesLoaded="(files) => loadNetwork(files)"
            />
            <div class="button-row">
              <v-tooltip
                location="bottom"
                open-delay="500"
              >
                <template v-slot:activator="{ props }">
                  <v-btn

                    v-bind="props"
                    @click="buttonHandle('newProject')"
                  >
                    {{ $gettext('delete all') }}
                  </v-btn>
                </template>
                <span>{{ $gettext("Delete all network and start from scratch") }}</span>
              </v-tooltip>
              <v-btn
                :disabled="!filesAdded"
                :color="filesAdded? 'primary' :'regular'"
                @click="login()"
              >
                {{ $gettext('Go!') }}
              </v-btn>
            </div>
          </v-col>
          <v-divider vertical />

          <v-col>
            <FilesList
              @FilesLoaded="(files) => loadNetwork(files)"
            />
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
  overflow-y: auto;
}
.center-col{
  display: flex;
  flex-direction: column;
}
.left-col{
  display: flex;
  height:37rem;
  border:solid blue 1px
}

.layout-overlay {
  height: 100%;
  width: 100%;
  background-color:rgb(var(--v-theme-background));
  position: absolute;
}
.card {
  width:80rem;
  height:38rem;
  overflow-y:hidden;
  padding: 20px;
  background-color: rgb(var(--v-theme-lightergrey));

}
.button-question{
  display: flex;
  align-items: center ;

}
.custom-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em !important;
  color: rgb(var(--v-theme-primary));
  font-weight: bold;
  margin-top:18px;
}
.card-title {
  font-size: 2em !important;
  color: rgb(var(--v-theme-primary));
  font-weight: bold;
}
.clickage{
  cursor:pointer
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
  margin-top:auto;
  justify-content:center;
  border-top: 1px solid rgb(var(--v-theme-lightgrey));
}

</style>
