import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
import rlinksModule from './rlinks.js'
import resultsModule from './results.js'
import layerModule from './layer.js'
import runModule from './run.js'
import userModule from './user.js'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import s3 from '../AWSClient'

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
  },

  state: {
    notification: {},
    darkMode: false,
    loading: false,
    anchorMode: false,
    showLeftPanel: true,
    windowHeight: 0,
    linksPopupContent: ['trip_id'],
    roadsPopupContent: ['highway'],
    outputName: 'output',
    mapCenter: [-73.570337, 45.498310],
    mapZoom: 11,
    availableLayers: ['links', 'rlinks', 'nodes', 'rnodes'],

  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
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
    applySettings (state, payload) {
      state.links.linkSpeed = Number(payload.linkSpeed)
      state.rlinks.roadSpeed = Number(payload.roadSpeed)
      state.linksPopupContent = payload.linksPopupContent
      state.roadsPopupContent = payload.roadsPopupContent
      state.rlinks.defaultHighway = payload.defaultHighway
      state.outputName = payload.outputName
    },

    loadLayer (state, payload) {
      const moduleName = payload.fileName // todo: check if name exist Object.keys(this._modules.root._children)
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
    },
    unloadLayers (state) {
      const moduleToDelete = Object.keys(this._modules.root._children).filter(
        x => !['links', 'rlinks', 'results', 'run', 'user'].includes(x))
      moduleToDelete.forEach(moduleName => this.unregisterModule(moduleName))
      state.availableLayers = ['links', 'rlinks', 'nodes', 'rnodes']
    },

    exportFiles (state, payload = 'all') {
      const zip = new JSZip()
      const inputs = zip.folder('inputs') // create a folder for the files.
      const outputs = zip.folder('outputs') // create a folder for the files.
      let links = ''
      let nodes = ''
      let rlinks = ''
      let rnodes = ''
      // export only visible line (line selected)
      this.commit('applyPropertiesTypes')
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
        // eslint-disable-next-line no-var
        var blob = new Blob([links], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        inputs.file('links.geojson', blob)
        // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([nodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        inputs.file('nodes.geojson', blob)
      }
      if (JSON.parse(rlinks).features.length > 0) {
      // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([rlinks], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        inputs.file('road_links.geojson', blob)
        // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([rnodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        inputs.file('road_nodes.geojson', blob)
      }
      if (payload === 'all') {
        if (this.getters['run/parameters'].length > 0) {
          const blob = new Blob([JSON.stringify(this.getters['run/parameters'])], { type: 'application/json' })
          inputs.file('params.json', blob)
        }
        const staticLayers = Object.keys(this._modules.root._children).filter(
          x => !['links', 'rlinks', 'results', 'run', 'user'].includes(x))
        staticLayers.forEach(layer => {
          const blob = new Blob([JSON.stringify(this.getters[`${layer}/layer`])], { type: 'application/json' })
          const name = layer.split('/').slice(-1)[0] + '.geojson'
          // const name = layer.replace('/', '_') + '.geojson'
          outputs.file(name, blob)
          if (this.getters[`${layer}/mat`]) {
            const blob = new Blob([JSON.stringify(this.getters[`${layer}/mat`])], { type: 'application/json' })
            const name = layer.split('/').slice(-1)[0] + '.json'
            outputs.file(name, blob)
          }
        })
      }

      zip.generateAsync({ type: 'blob' })
        .then(function (content) {
          // see FileSaver.js
          saveAs(content, state.outputName + '.zip')
        })
    },
  },
  actions: {
    async exportToS3 ({ state, commit }, payload) {
      if (payload !== 'saveOnly') {
        commit('run/changeRunning', true)
      }
      this.commit('applyPropertiesTypes')
      const scen = state.user.scenario + '/'
      const bucket = state.user.model
      const networkPaths = state.user.config.network_paths
      const paramsPath = state.user.config.parameters_path
      if (state.run.parameters.length > 0) {
        await s3.putObject(bucket, scen + paramsPath, JSON.stringify(state.run.parameters))
      }
      if (state.links.links.features.length > 0) {
        await s3.putObject(bucket, scen + networkPaths.links, JSON.stringify(state.links.links))
        await s3.putObject(bucket, scen + networkPaths.nodes, JSON.stringify(state.links.nodes))
      }
      if (state.rlinks.rlinks.features.length > 0) {
        await s3.putObject(bucket, scen + networkPaths.rlinks, JSON.stringify(state.rlinks.rlinks))
        await s3.putObject(bucket, scen + networkPaths.rnodes, JSON.stringify(state.rlinks.rnodes))
      }
      // console.log(res)
      // commit('setScenariosList', res)
    },
  },
  getters: {
    notification: (state) => state.notification,
    loading: (state) => state.loading,
    mapCenter: (state) => state.mapCenter,
    mapZoom: (state) => state.mapZoom,
    windowHeight: (state) => state.windowHeight,
    anchorMode: (state) => state.anchorMode,
    showLeftPanel: (state) => state.showLeftPanel,
    linksPopupContent: (state) => state.linksPopupContent,
    roadsPopupContent: (state) => state.roadsPopupContent,
    outputName: (state) => state.outputName,
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
