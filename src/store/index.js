import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
import rlinksModule from './rlinks.js'
import odModule from './od.js'
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
const $gettext = s => s

export const store = new Vuex.Store({
  modules: {
    user: userModule,
    links: linksModule,
    rlinks: rlinksModule,
    od: odModule,
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
    cyclewayMode: false,
    outputName: 'output',
    mapCenter: [-73.570337, 45.498310],
    mapZoom: 11,
    availableLayers: ['links', 'rlinks', 'od', 'nodes', 'rnodes'],
    rasterFiles: [], // [{path, type}]
    visibleRasters: [], // list of rasterFiles path.
    otherFiles: [], // [{path, content}]

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
    changeCyclewayMode (state, payload) {
      state.cyclewayMode = !state.cyclewayMode
    },

    loadFiles (state, payload) {
      // payload: res.push({ path: inputs/pt/links.geojson, content: Array() | null })
      try {
        let otherFiles = []
        let outputFiles = []

        const ptFiles = payload.filter(el => el.path.startsWith('inputs/pt/') && el.path.endsWith('.geojson'))
        otherFiles = payload.filter(el => !ptFiles.includes(el))

        const roadFiles = otherFiles.filter(el => el.path.startsWith('inputs/road/') && el.path.endsWith('.geojson'))
        otherFiles = otherFiles.filter(el => !roadFiles.includes(el))

        const rasterFiles = otherFiles.filter(el => el.path.startsWith('inputs/raster/') && el.path.endsWith('.geojson'))
        otherFiles = otherFiles.filter(el => !rasterFiles.includes(el))

        const paramFile = otherFiles.filter(el => el.path === 'inputs/params.json')[0]
        otherFiles = otherFiles.filter(el => el !== paramFile)

        const ODFiles = otherFiles.filter(el => el.path.startsWith('inputs/od/') && el.path.endsWith('.geojson'))
        otherFiles = otherFiles.filter(el => !ODFiles.includes(el))

        const inputFiles = otherFiles.filter(el => el.path.startsWith('inputs/'))
        otherFiles = otherFiles.filter(el => !inputFiles.includes(el))

        outputFiles = otherFiles.filter(el => el.path.startsWith('outputs/'))
        otherFiles = otherFiles.filter(el => !outputFiles.includes(el))

        // PT files should be in pair of 2 (links and nodes)
        if (ptFiles.length % 2 !== 0) {
          const err = new Error($gettext('Need the same number of links and nodes files.'))
          err.name = 'ImportError'
          throw err
        }
        // road files should be in pair of 2 (links and nodes)
        if (roadFiles.length % 2 !== 0) {
          const err = new Error($gettext('Need the same number of road_links and road_nodes files.'))
          err.name = 'ImportError'
          throw err
        }

        this.commit('loadPTFiles', ptFiles)
        this.commit('loadRoadFiles', roadFiles)
        this.commit('loadRasterFiles', rasterFiles)
        this.commit('od/loadODFiles', ODFiles)
        if (paramFile) this.commit('run/getLocalParameters', paramFile.content)

        this.commit('loadOtherFiles', inputFiles)

        // get outputs geojson files and create Layer with them.
        const layerFiles = outputFiles.filter(el => el.path.endsWith('.geojson'))
        outputFiles = outputFiles.filter(el => !layerFiles.includes(el))
        this.commit('loadLayers', layerFiles)

        // get JSON files with the same name as Modules (they are matrix)
        const matrixFiles = outputFiles.filter(el => el.path.endsWith('.json') &&
        state.availableLayers.includes(el.path.slice(0, -5)),
        )
        outputFiles = outputFiles.filter(el => !matrixFiles.includes(el))

        this.commit('loadMatrix', matrixFiles)

        // load the rest
        this.commit('loadOtherFiles', outputFiles)
        this.commit('changeNotification',
          { text: $gettext('File(s) added'), autoClose: true, color: 'success' })
      } catch (err) {
        this.commit('changeAlert', err)
      }
    },

    loadOtherFiles (state, payload) {
      // payload = [{path, content, type}]
      // if a file is updated with the same path (already exist). remove it
      const newPaths = payload.map(file => file.path)
      state.otherFiles = state.otherFiles.filter(file => !newPaths.includes(file.path))
      // push files
      payload.forEach(file => state.otherFiles.push(file))
    },

    loadRasterFiles (state, payload) {
      // payload = { path: , content:}
      for (const file of payload) {
        const type = file.content.features[0].geometry.type
        state.rasterFiles.push({ path: file.path, type: type })
      }
    },
    setVisibleRasters (state, payload) {
      state.visibleRasters = payload
    },

    loadLayers (state, payload) {
      payload.forEach(
        file => {
          const fileName = file.path.slice(0, -8) // remove .geojson
          // let matData = payload.files.filter(json => json?.fileName.slice(0, -5) === fileName)[0]?.data
          // if matDataExist does not exist, we want to ignore index as they are only needed for a OD mat.
          file.content = serializer(file.content, file.path, null, false)

          this.commit('createLayer', {
            fileName: fileName,
            data: file.content,
          })
        })
    },
    loadMatrix (state, payload) {
      // payload : [{path,content}]
      payload.forEach(
        file => {
          const moduleName = file.path.slice(0, -5)
          this.commit(`${moduleName}/addMatrix`, file.content)
        },
      )
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
      this.commit('od/loadLayer', linksBase)
      state.visibleRasters = []
      state.rasterFiles = []
      state.otherFiles = []
      state.cyclewayMode = false
    },
    unloadLayers (state) {
      const moduleToDelete = Object.keys(this._modules.root._children).filter(
        x => !['links', 'rlinks', 'od', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
      moduleToDelete.forEach(moduleName => this.unregisterModule(moduleName))
      state.availableLayers = ['links', 'rlinks', 'od', 'nodes', 'rnodes']
    },
    applySettings (state, payload) {
      state.links.linkSpeed = Number(payload.linkSpeed)
      state.rlinks.roadSpeed = Number(payload.roadSpeed)
      state.linksPopupContent = payload.linksPopupContent
      state.roadsPopupContent = payload.roadsPopupContent
      state.rlinks.defaultHighway = payload.defaultHighway
      state.outputName = payload.outputName
    },

  },
  actions: {
    async exportFiles ({ state, commit }, payload = 'all') {
      const zip = new JSZip()
      let links = ''
      let nodes = ''
      let rlinks = ''
      let rnodes = ''
      let od = ''
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
        od = JSON.stringify(this.getters['od/visibleLayer'])
      // export everything
      } else {
        links = JSON.stringify(state.links.links)
        nodes = JSON.stringify(state.links.nodes)
        rlinks = JSON.stringify(state.rlinks.rlinks)
        rnodes = JSON.stringify(state.rlinks.rnodes)
        od = JSON.stringify(this.getters['od/layer'])
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
      if (JSON.parse(od).features.length > 0) {
        const blob = new Blob([od], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('inputs/od/od.geojson', blob)
      }
      if (payload === 'all') {
        if (!this.getters['run/parametersIsEmpty']) {
          const blob = new Blob([JSON.stringify(this.getters['run/parameters'])], { type: 'application/json' })
          zip.file('inputs/params.json', blob)
        }
        const staticLayers = Object.keys(this._modules.root._children).filter(
          x => !['links', 'rlinks', 'od', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
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
          if (file.content == null && state.user.model !== null) {
            file.content = await s3.readBytes(state.user.model, state.user.scenario + '/' + file.path)
          }
          if (file.content instanceof Uint8Array) {
            const blob = new Blob([file.content]) // { type: 'text/csv' }
            zip.file(file.path, blob)
          } else {
            const blob = new Blob([JSON.stringify(file.content)], { type: 'application/json' })
            zip.file(file.path, blob)
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
        od: scen + 'inputs/od/od.geojson',
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
      // save ods
      if (!this.getters['od/layerIsEmpty']) {
        await s3.putObject(bucket, paths.od, JSON.stringify(this.getters['od/layer']))
      }
      // save Static Layers
      const staticLayers = Object.keys(this._modules.root._children).filter(
        x => !['links', 'rlinks', 'od', 'results', 'run', 'user', 'runMRC', 'runOSM'].includes(x))
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
        if (file.content == null) {
          // pass
        } else if (file.content instanceof Uint8Array) {
          await s3.putObject(bucket, scen + file.path, file.content)
        } else {
          await s3.putObject(bucket, scen + file.path, JSON.stringify(file.content))
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
    cyclewayMode: (state) => state.cyclewayMode,
    outputName: (state) => state.outputName,
    rasterFiles: (state) => state.rasterFiles,
    visibleRasters: (state) => state.visibleRasters,
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
