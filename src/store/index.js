import Vue from 'vue'
import Vuex from 'vuex'
import linksModule from './links.js'
import llinksModule from './llinks.js'
import rlinksModule from './rlinks.js'
import resultsModule from './results.js'
import JSZip from 'jszip'
import saveAs from 'file-saver'
Vue.use(Vuex)

export const store = new Vuex.Store({
  modules: {
    links: linksModule,
    rlinks: rlinksModule,
    llinks: llinksModule,
    results: resultsModule,
  },

  state: {
    notification: {},
    loading: false,
    anchorMode: false,
    showLeftPanel: true,
    windowHeight: 0,
    linksPopupContent: 'trip_id',
    roadsPopupContent: 'highway',
    outputName: 'output',
    mapStyle: 'mapbox://styles/mapbox/light-v9?optimize=true',

  },
  mutations: {
    changeNotification (state, payload) {
      state.notification = payload
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
    changeMapStyle (state, payload) {
      if (payload) {
        state.mapStyle = 'mapbox://styles/mapbox/dark-v9?optimize=true'
      } else {
        state.mapStyle = 'mapbox://styles/mapbox/light-v9?optimize=true'
      }
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
    exportFiles (state, payload = 'all') {
      const zip = new JSZip()
      // const folder = zip.folder('output') // create a folder for the files.
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
        zip.file('links.geojson', blob)
        // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([nodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('nodes.geojson', blob)
      }
      if (JSON.parse(rlinks).features.length > 0) {
      // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([rlinks], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('road_links.geojson', blob)
        // eslint-disable-next-line no-var, no-redeclare
        var blob = new Blob([rnodes], { type: 'application/json' })
        // use folder.file if you want to add it to a folder
        zip.file('road_nodes.geojson', blob)
      }
      zip.generateAsync({ type: 'blob' })
        .then(function (content) {
          // see FileSaver.js
          saveAs(content, state.outputName + '.zip')
        })
    },
  },
  getters: {

    notification: (state) => state.notification,
    loading: (state) => state.loading,
    windowHeight: (state) => state.windowHeight,
    mapStyle: (state) => state.mapStyle,
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
    availableLayers: (state) => { return ['links', 'rlinks', 'llinks'] },

  },
})
