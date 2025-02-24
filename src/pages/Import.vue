<!-- eslint-disable no-case-declarations -->
<script setup>
import router from '@src/router/index'
import s3 from '@src/AWSClient'
import { extractZip, unzip } from '@comp/utils/utils'
import FileLoader from '@comp/import/FileLoader.vue'
import FilesList from '@comp/import/FilesList.vue'
import Info from '@comp/import/Info.vue'
import ScenariosExplorer from '@comp/import/ScenariosExplorer.vue'
import { useConflicts } from '@comp/import/conflicts.js'

import { ref, computed, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

import { useUserStore } from '@src/store/user'
import axios from 'axios'

import { useGettext } from 'vue3-gettext'
import { useODStore } from '@src/store/od'
const { $gettext } = useGettext()

const store = useIndexStore()
const userStore = useUserStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()

const isMobile = computed(() => store.isMobile)
const projectIsEmpty = computed(() => store.projectIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)

const choice = ref(null)
const showDialog = ref(false)
const filesAdded = ref(false)
const zipInput = ref()

onMounted(() => { store.changeNotification('') })

function clickGo () {
  // Leave time for animation to end (.animate-login and .animate-layer css rules)
  setTimeout(() => {
    let page = isMobile.value ? 'Run' : 'Home'
    router.push(page).catch(() => {})
  }, 300)
}

function buttonHandle (event) {
  choice.value = event
  switch (choice.value) {
    case 'zip':
      zipInput.value.click()
      document.getElementById('zip-input').value = '' // clean it for next file
      break
    case 'example1':
      projectIsEmpty.value ? loadExample(['PT', 'road']) : showDialog.value = true
      break
    case 'example2':
      projectIsEmpty.value ? loadExample(['PT', 'road', 'loaded', 'zones']) : showDialog.value = true
      break
    case 'newProject':
      projectIsEmpty.value ? newProject() : showDialog.value = true
      break
  }
}

function applyDialog () {
  // this only happen when both files are loaded.
  // remove links and nodes from store. (and filesAreLoaded)
  if (choice.value === 'example1') {
    loadExample(['PT', 'road'])
  } else if (choice.value === 'example2') {
    loadExample(['PT', 'road', 'loaded', 'zones'])
  } else if (choice.value === 'newProject') {
    newProject()
  }
  showDialog.value = !showDialog.value
}

function newProject () {
  store.initNetworks()
  store.changeNotification({ text: $gettext('Files unloaded'), autoClose: true, color: 'success' })
}

async function readZip (event) {
  try {
    store.changeLoading(true)
    const zfiles = event.target.files
    // there is a file
    if (!zfiles.length) {
      store.changeLoading(false)
      return
    }
    // it is a zip
    if (zfiles[0].name.slice(-3) !== 'zip') {
      store.changeLoading(false)
      store.changeAlert({ name: 'ImportError', message: $gettext('file is not a zip') })
      return
    }
    const files = await extractZip(zfiles[0])
    loadNetwork(files)
  } catch (err) {
    store.changeLoading(false)
    store.changeAlert(err)
  }
}

async function loadFilesFromS3 () {
  if (!projectIsEmpty.value) {
    store.initNetworks()
  }
  store.changeLoading(true)

  const model = userStore.model
  const scen = userStore.scenario + '/'

  const res = []
  try {
    let filesList = await s3.listFiles(model, scen)
    filesList = filesList.filter(name => !name.endsWith('/'))
    for (const file of filesList) {
      const name = file.slice(scen.length) // remove scen name from file
      // take knowned files (styles and attributesChoices, params.json)
      if (name === 'inputs/params.json') {
        const content = await s3.readJson(model, file)
        res.push({ path: name, content })
      } else if (name === 'styles.json') {
        const content = await s3.readJson(model, file)
        res.push({ path: name, content })
      } else if (name === 'info.json') {
        const content = await s3.readJson(model, file)
        res.push({ path: name, content })
      } else if (name === 'attributesChoices.json') {
        const content = await s3.readJson(model, file)
        res.push({ path: name, content })
        // take PT and road network and od (ending en geojson)
      } else if ((name.startsWith('inputs/pt/') || name.startsWith('inputs/road/') || name.startsWith('inputs/od/'))
      && (name.endsWith('.geojson'))) {
        const content = await s3.readJson(model, file)
        res.push({ path: name, content })
        // else. we do not load the file. (outputs or inputs.) we will fetch them when needed.
      } else {
        res.push({ path: name, content: null })
      }
    }
    loadNetwork(res)
  } catch (err) {
    store.changeAlert(err)
    store.changeLoading(false)
  }
}

async function loadExample (filesToLoads) {
  store.initNetworks()
  userStore.unloadProject()

  store.changeLoading(true)
  const url = 'https://raw.githubusercontent.com/systragroup/quetzal-network-editor/master/example/'
  const res = []
  let content = {}

  try {
    if (filesToLoads.includes('PT')) {
      content = await axios.get(url + 'links_exemple.geojson')
      res.push({ path: 'inputs/pt/links.geojson', content: content.data })
      content = await axios.get(url + 'nodes_exemple.geojson')
      res.push({ path: 'inputs/pt/nodes.geojson', content: content.data })
    }

    if (filesToLoads.includes('road')) {
      content = await axios.get(url + 'road_links_exemple.geojson')
      res.push({ path: 'inputs/road/links.geojson', content: content.data })
      content = await axios.get(url + 'road_nodes_exemple.geojson')
      res.push({ path: 'inputs/road/nodes.geojson', content: content.data })
    }

    if (filesToLoads.includes('loaded')) {
      content = await axios.get(url + 'loaded_links.geojson')
      res.push({ path: 'outputs/loaded_links.geojson', content: content.data })
      content = await axios.get(url + 'loaded_nodes.geojson')
      res.push({ path: 'outputs/loaded_nodes.geojson', content: content.data })
    }

    if (filesToLoads.includes('zones')) {
      content = await axios.get(url + 'zones.geojson')
      res.push({ path: 'outputs/zones.geojson', content: content.data })
      content = await axios.request({ url: url + 'zones.zip', method: 'GET', responseType: 'blob' })
      content = await unzip(content.data)
      res.push({ path: 'outputs/zones.json', content })
    }

    loadNetwork(res)
  } catch {
    store.changeLoading(false)
    store.changeAlert({
      name: 'ImportError',
      message: $gettext('An error occur fetching example on github'),
    })
  }
}

const { handleConflict, filesAddedNotification } = useConflicts()

function loadNetwork (files) {
  // HERE: check if duplicated index.
  let infoPT
  let infoRoad
  const ptFiles = files.filter(el => el.path.startsWith('inputs/pt/') && el.path.endsWith('.geojson'))
  if (ptFiles.length > 0 && !linksIsEmpty.value) {
    infoPT = handleConflict(ptFiles, 'pt')
  }
  const roadFiles = files.filter(el => el.path.startsWith('inputs/road/') && el.path.endsWith('.geojson'))
  if (roadFiles.length > 0 && !rlinksIsEmpty.value) {
    infoRoad = handleConflict(roadFiles, 'road')
  }
  // OD are overwrite. if a file is imported. just initOD.
  const ODFiles = files.filter(el => el.path.startsWith('inputs/od/') && el.path.endsWith('.geojson'))
  if (ODFiles.length > 0) {
    const ODStore = useODStore()
    ODStore.$reset()
  }
  store.loadFiles(files)
  filesAdded.value = true
  store.changeLoading(false)
  filesAddedNotification(infoPT, infoRoad)
}

</script>
<template>
  <section class="section">
    <input
      id="zip-input"
      ref="zipInput"
      type="file"
      style="display: none"
      accept=".zip"
      @change="readZip"
    >

    <div class="layout">
      <v-card
        class="card"
      >
        <v-row>
          <v-col class="left-col">
            <div
              class="custom-title"
            >
              {{ userStore.loggedIn? $gettext("Select a Project"): $gettext("Login to access projects") }}
            </div>
            <ScenariosExplorer
              @load="loadFilesFromS3"
              @unload="newProject"
            />
            <div class="button-row">
              <v-btn
                prepend-icon="fas fa-file-archive"
                @click="buttonHandle('zip')"
              >
                {{ $gettext('Load Zip File') }}
              </v-btn>
              <v-menu
                close-delay="100"
                transition="slide-y-transition"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
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
            </div>
          </v-col>
          <v-divider vertical />
          <v-col class="center-col">
            <FileLoader
              @files-loaded="(files) => loadNetwork(files)"
            />
            <v-divider />
            <Info />
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
                    {{ $gettext('Empty all') }}
                  </v-btn>
                </template>
                <span>{{ $gettext("Empty all loaded files and start from scratch") }}</span>
              </v-tooltip>
              <v-btn
                :disabled="!filesAdded"
                :color="filesAdded? 'primary' :'regular'"
                @click="clickGo()"
              >
                {{ $gettext('Go!') }}
              </v-btn>
            </div>
          </v-col>
          <v-divider vertical />

          <v-col class="right-col">
            <FilesList
              @files-loaded="(files) => loadNetwork(files)"
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
          {{ $gettext("Unload all files ?") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
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
  padding: 1rem 2rem;
  height:100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: start;
}
.section{
  height: 100%; /* or any fixed height */
  position: relative;
}
.center-col{
  display: flex;
  flex-direction: column;
  width:28rem;
  margin-bottom: 0.2rem;
  padding:0.5rem;

}
.left-col{
  display: flex;
  height:calc(100vh - 100px);
  flex-direction: column;
  width:28rem;
  padding:0.5rem;
}
.right-col{
  display: flex;
  height: calc(100vh - 100px);
  flex-direction: column;
  width: 28rem;
  padding: 0.5rem 0.5rem 4.2rem;
}
.card {
  overflow-y:auto;
  padding: 20px;
  height:100%;
  width:100%;
  max-width: 100rem;
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
  border-bottom: 1px solid rgb(var(--v-theme-lightgrey));
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
  margin: 0.5rem 0.5rem 0;
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
