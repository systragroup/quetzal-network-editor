<!-- eslint-disable no-case-declarations -->
<script setup>
import router from '@src/router/index'
import s3 from '@src/AWSClient'
import { extractZip, unzip, getMatchingAttr, getPerfectMatches, remap, deleteUnusedNodes } from '@comp/utils/utils.js'
import FileLoader from '@comp/import/FileLoader.vue'
import FilesList from '@comp/import/FilesList.vue'
import ScenariosExplorer from '@comp/import/ScenariosExplorer.vue'
import { ref, computed, onMounted } from 'vue'
import { cloneDeep } from 'lodash'

import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

import { useUserStore } from '@src/store/user'
import axios from 'axios'
import short from 'short-uuid'

import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const store = useIndexStore()
const userStore = useUserStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const projectIsEmpty = computed(() => store.projectIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)

const choice = ref(null)
const showDialog = ref(false)
const filesAdded = ref(false)
const zipInput = ref()

onMounted(() => { store.changeNotification('') })

function login () {
  // Leave time for animation to end (.animate-login and .animate-layer css rules)
  setTimeout(() => {
    router.push('/Home').catch(() => {})
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
      message: $gettext($gettext('An error occur fetching example on github')),
    })
  }
}

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
  store.loadFiles(files)
  filesAdded.value = true
  store.changeLoading(false)
  filesAddedNotification(infoPT, infoRoad)
}

function handleConflict(files, type = 'pt') {
  // [{path,content}]
  const nodes = files.filter(file => file.content.features[0].geometry.type == 'Point')[0].content
  const links = files.filter(file => file.content.features[0].geometry.type == 'LineString')[0].content
  const nodesLength = nodes.features.length
  const linksLength = links.features.length
  if (type === 'pt') {
    const storeNodes = cloneDeep(linksStore.nodes)
    const storeLinks = cloneDeep(linksStore.links)
    handleNodesConflict(nodes, storeNodes, links, 'node_')
    handleTripsConflict(links, storeLinks)
    handleLinksConflict(links, storeLinks, 'link_')
  } else if (type === 'road') {
    const storerNodes = cloneDeep(rlinksStore.rnodes)
    const storerLinks = cloneDeep(rlinksStore.rlinks)
    handleNodesConflict(nodes, storerNodes, links, 'rnode_')
    handleLinksConflict(links, storerLinks, 'rlink_')
  }

  nodes.features = deleteUnusedNodes(nodes, links)
  // return the number of added links and nodes
  return {
    nodes: nodesLength, nodesAdded: nodes.features.length,
    links: linksLength, linksAdded: links.features.length,
  }
}

function handleNodesConflict(nodes, storeNodes, links, prefix = 'node_') {
  const dupIndexes = getMatchingAttr(nodes, storeNodes, 'index')
  const perfectMatchs = new Set(getPerfectMatches(nodes, storeNodes, dupIndexes))
  const conflicts = dupIndexes.filter(idx => !perfectMatchs.has(idx))
  // remove perfect matches nodes.
  nodes.features = nodes.features.filter(el => !perfectMatchs.has(el.properties.index))

  // MAYBE: check for distance
  // if distance <1m : keep existing one (became a perfect math)
  // for index of conflict: check dist old and new nodes
  // This is pretty slow.

  // we have conflicts. do something.
  if (conflicts.length !== 0) {
    const newNodesDict = conflicts.reduce((acc, key) => {
      acc[key] = prefix + short.generate()
      return acc
    }, {})

    // rename nodes
    nodes.features.forEach(el => el.properties.index = remap(el.properties.index, newNodesDict))
    links.features.forEach(el => el.properties.a = remap(el.properties.a, newNodesDict))
    links.features.forEach(el => el.properties.b = remap(el.properties.b, newNodesDict))
  }
}

function handleTripsConflict(links, storeLinks) {
  // 1) remove all links with with existing Trip_ID
  const dupTrips = new Set(getMatchingAttr(links, storeLinks, 'trip_id'))
  links.features = links.features.filter(el => !dupTrips.has(el.properties.trip_id))
}

function handleLinksConflict(links, storeLinks, prefix = 'link_') {
  const dupIndexes = getMatchingAttr(links, storeLinks, 'index')
  const perfectMatchs = new Set(getPerfectMatches(links, storeLinks, dupIndexes))
  const conflicts = dupIndexes.filter(idx => !perfectMatchs.has(idx))
  // 1) remove perfect matches links.
  links.features = links.features.filter(el => !perfectMatchs.has(el.properties.index))

  // MAYBE: check a,b index.
  // if Same (idx,a,b) : perfect match. drop
  // not sure its a good idea. you could have same idx,a,b but not same trip
  // we want to create new links. not drop them
  // (ex: MTL orange line have a trip with 1 extra links. this would drop every links except last one.

  // we have conflicts. do something.
  if (conflicts.length !== 0) {
    const newLinksDict = conflicts.reduce((acc, key) => {
      acc[key] = prefix + short.generate()
      return acc
    }, {})
    // 3) rename links that used the same index but are different
    links.features.forEach(el => el.properties.index = remap(el.properties.index, newLinksDict))
  }
}

function filesAddedNotification(infoPT, infoRoad) {
  // norification when files are added. infoPT and road contain conflict info
  if (infoPT && infoRoad) {
    store.changeNotification(
      { text: $gettext('%{a}/%{b} PT nodes added and %{c}/%{d} PT links added. \
                        %{e}/%{f} road nodes added and %{g}/%{h} road links added ',
      { a: infoPT.nodesAdded, b: infoPT.nodes, c: infoPT.linksAdded, d: infoPT.links,
        e: infoRoad.nodesAdded, f: infoRoad.nodes, g: infoRoad.linksAdded, h: infoRoad.links }),
      autoClose: false, color: 'success' })
  } else if (infoPT) {
    store.changeNotification(
      { text: $gettext('%{a}/%{b} PT nodes added and %{c}/%{d} PT links added',
        { a: infoPT.nodesAdded, b: infoPT.nodes, c: infoPT.linksAdded, d: infoPT.links }),
      autoClose: false, color: 'success' })
  } else if (infoRoad) {
    store.changeNotification(
      { text: $gettext('%{a}/%{b} road nodes added and %{c}/%{d} road links added',
        { a: infoRoad.nodesAdded, b: infoRoad.nodes, c: infoRoad.linksAdded, d: infoRoad.links }),
      autoClose: false, color: 'success' })
  } else {
    store.changeNotification(
      { text: $gettext('File(s) added'), autoClose: true, color: 'success' })
  }
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
              @filesLoaded="(files) => loadNetwork(files)"
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
                    {{ $gettext('Empty all') }}
                  </v-btn>
                </template>
                <span>{{ $gettext("Empty all loaded files and start from scratch") }}</span>
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

          <v-col class="left-col">
            <FilesList
              @filesLoaded="(files) => loadNetwork(files)"
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
  position: relative;
  padding: 4rem 2rem 4rem 2rem;
  height:100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  overflow-y: auto;
}

.center-col{
  display: flex;
  flex-direction: column;
  width:28rem;
  padding:0.5rem;

}
.left-col{
  display: flex;
  height:80vh;
  flex-direction: column;
  width:28rem;
  padding:0.5rem;
}

.card {
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
  margin: 0.5rem 0.5rem 0rem 0.5rem;
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
