import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
import rlinksModule from './rlinks.js'
import resultsModule from './results.js'
import layerModule from './layer.js'
import runModule from './api/run.js'
import MatrixRoadCasterModule from './api/MatrixRoadCaster.js'
import OSMImporterModule from './api/OSMImporter.js'
import userModule from './user.js'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import s3 from '../AWSClient'
import { serializer } from '../components/utils/serializer.js'

import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'
Vue.use(Vuex)

export const store = new Vuex.Store({
  modules: {
    user: userModule,
    links: linksModule,
    rlinks: rlinksModule,
    results: resultsModule,
    run: runModule,
    runMRC: MatrixRoadCasterModule,
    runOSM: OSMImporterModule,
  },

  state: {
    notification: {},
    alert: {},
    darkMode: false,
    loading: false,
    showLeftPanel: true,
    windowHeight: 0,
    anchorMode: false,
    linksPopupContent: ['trip_id'],
    roadsPopupContent: ['highway'],
    outputName: 'output',
    mapCenter: [-73.570337, 45.498310],
    mapZoom: 11,
    availableLayers: ['links', 'rlinks', 'nodes', 'rnodes'],
    loadedFiles: [],
    otherFiles: [],

  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
    },
    changeAlert (state, payload) {
      /// payload {name,message}, or just alert
      state.alert = payload
    },
    changeDarkMode (state, payload) {
      state.darkMode = payload
      state.rlinks.rlinksDefaultColor = state.darkMode ? '2196F3' : '7EBAAC' //  its the primary color.
      state.links.linksDefaultColor = state.darkMode ? '2196F3' : 'B5E0D6' //  its the primary color.
    },
    changeLoading (state, payload) {
      state.loading = payload
    },
    changeWindowHeight (state, payload) {
      state.windowHeight = payload
    },
    changeLeftPanel (state) {
      state.showLeftPanel = !state.showLeftPanel
    },
    saveMapPosition (state, payload) {
      state.mapCenter = payload.mapCenter
      state.mapZoom = payload.mapZoom
    },
    setAnchorMode (state, payload) {
      state.anchorMode = payload
    },
    changeAnchorMode (state) {
      state.anchorMode = !state.anchorMode
    },
    addFile (state, payload) {
      // payload = { name: , source: source, type: }
      state.loadedFiles.push(payload)
    },
    removeResultsFiles (state) {
      state.loadedFiles = state.loadedFiles.filter(file => !file.name.startsWith('output'))
    },
    loadOtherFiles (state, payload) {
      payload.files.forEach(file => {
        state.otherFiles.push(file)
        this.commit('addFile', { name: file.fileName, source: payload.source, type: 'other' })
      })
    },
    applySettings (state, payload) {
      state.links.linkSpeed = Number(payload.linkSpeed)
      state.rlinks.roadSpeed = Number(payload.roadSpeed)
      state.linksPopupContent = payload.linksPopupContent
      state.roadsPopupContent = payload.roadsPopupContent
      state.rlinks.defaultHighway = payload.defaultHighway
      state.outputName = payload.outputName
    },
    loadLayers (state, payload) {
      payload.files.filter(file => (file?.type === 'result')).forEach(
        file => {
          const fileName = file.fileName.slice(0, -8) // remove .geojson
          let matData = payload.files.filter(json => json?.fileName.slice(0, -5) === fileName)[0]?.data
          matData = matData || {}
          const matDataExist = Object.keys(matData).length > 0

          // if matDataExist does not exist, we want to ignore index as they are only needed for a OD mat.
          file.data = serializer(file.data, file.fileName, null, !matDataExist)

          this.commit('addFile', { name: file.fileName, source: payload.name, type: 'result' })
          if (matDataExist) {
            this.commit('addFile', { name: fileName + '.json', source: payload.name, type: 'result matrix' })
          }

          this.commit('createLayer', {
            fileName: fileName,
            data: file.data,
            mat: matData,
          })
        })
    },

    createLayer (state, payload) {
      const moduleName = payload.fileName
      if (!Object.keys(this._modules.root._children).includes(moduleName)) {
        this.registerModule(moduleName, layerModule)
      }
      this.commit(`${moduleName}/createLayer`, payload)
      if (!state.availableLayers.includes(moduleName)) {
        state.availableLayers.push(moduleName)
      }
    },
    initNetworks (state) {
      this.commit('loadLinks', linksBase)
      this.commit('loadrLinks', linksBase)
      this.commit('loadNodes', nodesBase)
      this.commit('loadrNodes', nodesBase)
      state.otherFiles = []
      state.loadedFiles = []
    },
    unloadLayers (state) {
      const moduleToDelete = Object.keys(this._modules.root._children).filter(
        x => !['links', 'rlinks', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
      moduleToDelete.forEach(moduleName => this.unregisterModule(moduleName))
      state.availableLayers = ['links', 'rlinks', 'nodes', 'rnodes']
    },

  },
  actions: {
    async exportFiles ({ state, commit }, payload = 'all') {
      const zip = new JSZip()
      let links = ''
      let nodes = ''
      let rlinks = ''
      let rnodes = ''
      // export only visible line (line selected)
      commit('applyPropertiesTypes')
      if (payload !== 'all') {
        const tempLinks = structuredClone(state.links.links)
        tempLinks.features = tempLinks.features.filter(
          link => state.links.selectedTrips.includes(link.properties.trip_id))
        links = JSON.stringify(tempLinks)
        // delete every every nodes not in links
        const a = tempLinks.features.map(item => item.properties.a)
        const b = tempLinks.features.map(item => item.properties.b)
        const nodesInLinks = Array.from(new Set([...a, ...b]))
        const tempNodes = structuredClone(state.links.nodes)
        tempNodes.features = tempNodes.features.filter(node => nodesInLinks.includes(node.properties.index))
        nodes = JSON.stringify(tempNodes)

        rlinks = JSON.stringify(state.rlinks.visiblerLinks)
        rnodes = JSON.stringify(state.rlinks.visiblerNodes)
      // export everything
      } else {
        links = JSON.stringify(state.links.links)
        nodes = JSON.stringify(state.links.nodes)
        rlinks = JSON.stringify(state.rlinks.rlinks)
        rnodes = JSON.stringify(state.rlinks.rnodes)
      }
      // export only if not empty
      if (JSON.parse(links).features.length > 0) {
        let blob = new Blob([links], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('inputs/pt/links.geojson', blob)
        blob = new Blob([nodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('inputs/pt/nodes.geojson', blob)
      }
      if (JSON.parse(rlinks).features.length > 0) {
        let blob = new Blob([rlinks], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('inputs/road/road_links.geojson', blob)
        blob = new Blob([rnodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('inputs/road/road_nodes.geojson', blob)
      }
      if (payload === 'all') {
        if (!this.getters['run/parametersIsEmpty']) {
          const blob = new Blob([JSON.stringify(this.getters['run/parameters'])], { type: 'application/json' })
          zip.file('inputs/params.json', blob)
        }
        const staticLayers = Object.keys(this._modules.root._children).filter(
          x => !['links', 'rlinks', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
        for (const layer of staticLayers) {
          const blob = new Blob([JSON.stringify(this.getters[`${layer}/layer`])], { type: 'application/json' })
          const name = layer + '.geojson'
          // zip name = layer.replace('/', '_') + '.geojson'
          zip.file(name, blob)
          if (this.getters[`${layer}/mat`]) {
            const blob = new Blob([JSON.stringify(this.getters[`${layer}/mat`])], { type: 'application/json' })
            const name = layer + '.json'
            zip.file(name, blob)
          }
        }

        for (const file of state.otherFiles) {
          // if others file loaded from S3 (they are not loaded yet. need to download them.)
          if (file.data == null && state.user.model !== null) {
            file.data = await s3.readBytes(state.user.model, state.user.scenario + '/' + file.fileName)
          }
          if (file.data instanceof Uint8Array) {
            const blob = new Blob([file.data]) // { type: 'text/csv' }
            zip.file(file.fileName, blob)
          } else {
            const blob = new Blob([JSON.stringify(file.data)], { type: 'application/json' })
            zip.file(file.fileName, blob)
          }
        }
      }
      zip.generateAsync({ type: 'blob' })
        .then(function (content) {
          // see FileSaver.js
          saveAs(content, state.outputName + '.zip')
        })
    },

    async exportToS3 ({ state, commit }, payload) {
      if (payload !== 'saveOnly') {
        commit('run/changeRunning', true)
      }
      this.commit('applyPropertiesTypes')
      const scen = state.user.scenario + '/'
      const bucket = state.user.model
      const inputFolder = scen + 'inputs/'
      const ptFolder = inputFolder + 'pt/'
      const roadFolder = inputFolder + 'road/'
      const paths = {
        links: ptFolder + 'links.geojson',
        nodes: ptFolder + 'nodes.geojson',
        rlinks: roadFolder + 'road_links.geojson',
        rnodes: roadFolder + 'road_nodes.geojson',
        params: scen + 'inputs/params.json',
      }
      // save params
      if (state.run.parameters.length > 0) {
        await s3.putObject(bucket, paths.params, JSON.stringify(state.run.parameters))
      }
      // save PT
      if (state.links.links.features.length > 0) {
        await s3.putObject(bucket, paths.links, JSON.stringify(state.links.links))
        await s3.putObject(bucket, paths.nodes, JSON.stringify(state.links.nodes))
      }
      // save Roads
      if (state.rlinks.rlinks.features.length > 0) {
        await s3.putObject(bucket, paths.rlinks, JSON.stringify(state.rlinks.rlinks))
        await s3.putObject(bucket, paths.rnodes, JSON.stringify(state.rlinks.rnodes))
      }
      // save Static Layers
      const staticLayers = Object.keys(this._modules.root._children).filter(
        x => !['links', 'rlinks', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
      for (const layer of staticLayers) {
        const name = layer + '.geojson'
        await s3.putObject(bucket, scen + name, JSON.stringify(this.getters[`${layer}/layer`]))
        if (this.getters[`${layer}/mat`]) {
          const name = layer + '.json'
          await s3.putObject(bucket, scen + name, JSON.stringify(this.getters[`${layer}/mat`]))
        }
      }
      // save others layers
      for (const file of state.otherFiles) {
        // if others file loaded from S3 (they are not loaded yet. need to download them.)
        if (file.data == null) {
          // pass
        } else if (file.data instanceof Uint8Array) {
          await s3.putObject(bucket, scen + file.fileName, file.data)
        } else {
          await s3.putObject(bucket, scen + file.fileName, JSON.stringify(file.data))
        }
      }
      // console.log(res)
      // commit('setScenariosList', res)
    },
  },
  getters: {
    notification: (state) => state.notification,
    alert: (state) => state.alert,
    loading: (state) => state.loading,
    mapCenter: (state) => state.mapCenter,
    mapZoom: (state) => state.mapZoom,
    windowHeight: (state) => state.windowHeight,
    anchorMode: (state) => state.anchorMode,
    showLeftPanel: (state) => state.showLeftPanel,
    linksPopupContent: (state) => state.linksPopupContent,
    roadsPopupContent: (state) => state.roadsPopupContent,
    outputName: (state) => state.outputName,
    loadedFiles: (state) => state.loadedFiles,
    otherFiles: (state) => state.otherFiles,
    projectIsUndefined: (state) => Object.keys(state.links.links).length === 0,
    projectIsEmpty: (state) => {
      return (state.links.links.features.length === 0 &&
              state.rlinks.rlinks.features.length === 0)
    },
    availableLayers: (state) => state.availableLayers,
    mapStyle: (state) => {
      if (state.darkMode) {
        return 'mapbox://styles/mapbox/dark-v11?optimize=true'
      } else {
        return 'mapbox://styles/mapbox/light-v11?optimize=true'
      }
    },

  },
})
