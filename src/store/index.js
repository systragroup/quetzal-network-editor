import { defineStore } from 'pinia'
import JSZip from 'jszip'
import saveAs from 'file-saver'
import s3 from '../AWSClient'
import { toRaw } from 'vue'
import { useLinksStore } from './links'
import { userLinksStore } from './rlinks'
import { useODStore } from './od'
import { useRunStore } from './run'
import { useOSMStore } from './OSMImporter'
import { useGTFSStore } from './GTFSImporter'

import { stylesSerializer } from '../components/utils/serializer.js'
import { useUserStore } from './user.js'
import { cloneDeep } from 'lodash'

import geojson from '@constants/geojson'

const $gettext = s => s

const defaultAttributesChoices = { pt: {}, road: { oneway: ['0', '1'] } }

export const useIndexStore = defineStore('store', {

  state: () => ({
    notification: { autoClose: true },
    alert: {},
    darkMode: false,
    loading: false,
    showLeftPanel: true,
    anchorMode: false,
    linksPopupContent: ['trip_id'],
    roadsPopupContent: ['highway'],
    cyclewayMode: false,
    outputName: 'output',
    mapCenter: [-73.570337, 45.498310],
    mapStyle: 'mapbox://styles/mapbox/light-v11',
    mapZoom: 11,
    importPoly: null,
    visibleRasters: [], // list of rasterFiles path.
    styles: [], // list of styling for results [{name,layer, displaySettings:{...}}, ...]
    otherFiles: [], // [{path, content}]
    attributesChoices: defaultAttributesChoices, // { pt: {}, road: { oneway: ['0', '1'] } }
  }),

  actions: {
    changeNotification (payload) {
      this.notification = payload
    },
    changeAlert (payload) {
      /// payload {name,message}, or just alert
      this.alert = payload
    },
    changeDarkMode (payload) {
      const links = useLinksStore()
      const rlinks = userLinksStore()
      this.darkMode = payload
      rlinks.rlinksDefaultColor = this.darkMode ? '2196F3' : '7EBAAC' //  its the primary color.
      links.linksDefaultColor = this.darkMode ? '2196F3' : 'B5E0D6' //  its the primary color.
      this.mapStyle = this.darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'
    },
    changeMapStyle (payload) {
      this.mapStyle = payload
    },
    changeLoading (payload) {
      this.loading = payload
    },
    changeLeftPanel () {
      this.showLeftPanel = !this.showLeftPanel
    },

    saveMapPosition (payload) {
      this.mapCenter = payload.mapCenter
      this.mapZoom = payload.mapZoom
    },
    setAnchorMode (payload) {
      this.anchorMode = payload
    },
    changeAnchorMode () {
      this.anchorMode = !this.anchorMode
    },
    changeCyclewayMode () {
      this.cyclewayMode = !this.cyclewayMode
    },

    loadFiles (payload) {
      // payload: res.push({ path: inputs/pt/links.geojson, content: Array() || null })
      const linksStore = useLinksStore()
      const rlinksStore = userLinksStore()
      const ODStore = useODStore()
      const runStore = useRunStore()
      try {
        let otherFiles = []
        let outputFiles = []
        const ptFiles = payload.filter(el => el.path.startsWith('inputs/pt/') && el.path.endsWith('.geojson'))
        otherFiles = payload.filter(el => !ptFiles.includes(el))

        const roadFiles = otherFiles.filter(el => el.path.startsWith('inputs/road/') && el.path.endsWith('.geojson'))
        otherFiles = otherFiles.filter(el => !roadFiles.includes(el))

        const ODFiles = otherFiles.filter(el => el.path.startsWith('inputs/od/') && el.path.endsWith('.geojson'))
        otherFiles = otherFiles.filter(el => !ODFiles.includes(el))

        const paramFile = otherFiles.filter(el => el.path === 'inputs/params.json')[0]
        otherFiles = otherFiles.filter(el => el !== paramFile)

        const stylesFile = otherFiles.filter(el => el.path === 'styles.json')[0]
        otherFiles = otherFiles.filter(el => el !== stylesFile)

        const attributesChoicesFile = otherFiles.filter(el => el.path === 'attributesChoices.json')[0]
        otherFiles = otherFiles.filter(el => el !== attributesChoicesFile)

        const inputFiles = otherFiles.filter(el => el.path.startsWith('inputs/'))
        otherFiles = otherFiles.filter(el => !inputFiles.includes(el))

        outputFiles = otherFiles.filter(el => el.path.startsWith('outputs/'))
        otherFiles = otherFiles.filter(el => !outputFiles.includes(el))
        // at this point. nothing is used in otherFiles.

        // PT files should be in pair of 2 (links and nodes)
        if (ptFiles.length !== 2 && ptFiles.length !== 0) {
          const err = new Error($gettext('Need the same number of links and nodes files.'))
          err.name = 'ImportError'
          throw err
        }
        // road files should be in pair of 2 (links and nodes)
        if (roadFiles.length !== 2 && roadFiles.length !== 0) {
          const err = new Error($gettext('Need the same number of road_links and road_nodes files.'))
          err.name = 'ImportError'
          throw err
        }
        linksStore.loadPTFiles(ptFiles)
        rlinksStore.loadRoadFiles(roadFiles)
        ODStore.loadODFiles(ODFiles)
        if (paramFile) runStore.getLocalParameters(paramFile.content)
        if (attributesChoicesFile) { this.loadAttributesChoices(attributesChoicesFile.content) }
        if (stylesFile) { this.loadStyles(stylesFile.content) }

        this.loadOtherFiles(inputFiles)
        this.loadOtherFiles(outputFiles)
      } catch (err) {
        this.changeAlert(err)
      }
    },

    loadOtherFiles (payload) {
      // payload = [{path, content}]. transform to [{path,content,name,extension}]
      // if a file is updated with the same path (already exist). remove it
      const newPaths = payload.map(file => file.path)
      this.otherFiles = this.otherFiles.filter(file => !newPaths.includes(file.path))
      // push files
      for (const file of payload) {
        const extension = file.path.split('.').slice(-1)[0]
        const name = file.path.split('.').slice(-2)[0]
        this.otherFiles.push({ ...file, name, extension })
      }
    },
    deleteOutputs () {
      this.otherFiles = this.otherFiles.filter(file => !file.path.startsWith('outputs/'))
    },
    deleteotherFiles (paths) {
      // list of paths
      this.otherFiles = this.otherFiles.filter(file => !paths.includes(file.path))
    },

    async getOtherFile (name, extension) {
      const files = this.otherFiles.filter(file => file.name === name)
      const file = files.filter(file => file.extension === extension)[0]
      // if its null. fetch it!
      if (!file) { return null }
      if (!file.content) {
        this.changeLoading(true)
        const userStore = useUserStore()
        file.content = await s3.readJson(userStore.model, userStore.scenario + '/' + file.path)
        this.changeLoading(false)
      }
      return file.content
    },

    loadAttributesChoices (payload) {
      const links = useLinksStore()
      const rlinks = userLinksStore()
      // eslint-disable-next-line no-return-assign
      Object.keys(payload.pt).forEach(key => this.attributesChoices.pt[key] = payload.pt[key])
      links.loadLinksAttributesChoices(payload.pt)
      // eslint-disable-next-line no-return-assign
      Object.keys(payload.road).forEach(key => this.attributesChoices.road[key] = payload.road[key])
      rlinks.loadrLinksAttributesChoices(payload.road)
    },
    setVisibleRasters (payload) {
      // payload.forEach(el => arr.push({ item: el }))
      // this.visibleRasters = new Set(payload)
      this.visibleRasters = payload
    },

    initLinks () {
      const links = useLinksStore()
      links.initLinks()
      links.loadLinks(geojson)
      links.loadNodes(geojson)
    },

    initrLinks () {
      const rlinks = userLinksStore()
      rlinks.initrLinks()
      rlinks.loadrLinks(geojson)
      rlinks.loadrNodes(geojson)
    },
    initNetworks () {
      const od = useODStore()
      this.initLinks()
      this.initrLinks()
      od.loadLayer(geojson)
      this.visibleRasters = []
      this.styles = []
      this.attributesChoices = structuredClone(toRaw(defaultAttributesChoices))
      this.loadAttributesChoices(defaultAttributesChoices)
      this.otherFiles = []
      this.cyclewayMode = false

      this.initOtherStores()
    },

    initOtherStores() {
      const runStore = useRunStore()
      const runOSMStore = useOSMStore()
      const runGTFSStore = useGTFSStore()
      runStore.cleanRun()
      runOSMStore.cleanRun()
      runGTFSStore.cleanRun()
    },

    applySettings (payload) {
      const rlinksStore = userLinksStore()
      rlinksStore.roadSpeed = Number(payload.roadSpeed)
      this.linksPopupContent = payload.linksPopupContent
      this.roadsPopupContent = payload.roadsPopupContent
      rlinksStore.defaultHighway = payload.defaultHighway
      this.outputName = payload.outputName
    },
    changeOutputName (payload) { this.outputName = payload },

    loadStyles (payload) {
      const json = stylesSerializer(payload)
      this.styles = json
    },

    addStyle (payload) {
      // payload: styling for results {name,layer, displaySettings:{...}}
      const names = this.styles.map(el => el.name)
      const idx = names.indexOf(payload.name)
      if (idx !== -1) {
        this.styles[idx] = payload
      } else {
        this.styles.push(payload)
      }
    },
    deleteStyle (payload) {
      // payload = name of the preset to delete
      this.styles = this.styles.filter(el => el.name !== payload)
    },
    saveImportPoly (payload) {
      this.importPoly = payload
    },
    async exportFile (path = '') {
      if (path === 'styles.json') {
        if (this.styles.length > 0) {
          const blob = new Blob([JSON.stringify(this.styles)], { type: 'application/json' })
          saveAs(blob, path)
        }
      }
    },

    async exportFiles (payload = 'all') {
      const linksStore = useLinksStore()
      const rlinksStore = userLinksStore()
      const ODStore = useODStore()
      const runStore = useRunStore()
      const userStore = useUserStore()
      const zip = new JSZip()
      let links = ''
      let nodes = ''
      let rlinks = ''
      let rnodes = ''
      let od = ''
      // export only visible line (line selected)
      linksStore.applyPropertiesTypes(linksStore.links)
      if (payload !== 'all') {
        const tempLinks = cloneDeep(linksStore.links)
        tempLinks.features = tempLinks.features.filter(
          link => linksStore.selectedTrips.includes(link.properties.trip_id))
        links = JSON.stringify(tempLinks)
        // delete every every nodes not in links
        const a = tempLinks.features.map(item => item.properties.a)
        const b = tempLinks.features.map(item => item.properties.b)
        const nodesInLinks = Array.from(new Set([...a, ...b]))
        const tempNodes = cloneDeep(linksStore.nodes)
        tempNodes.features = tempNodes.features.filter(node => nodesInLinks.includes(node.properties.index))
        nodes = JSON.stringify(tempNodes)

        rlinks = JSON.stringify(rlinksStore.visiblerLinks)
        rnodes = JSON.stringify(rlinksStore.visiblerNodes)
        od = JSON.stringify(ODStore.visibleLayer)
      // export everything
      } else {
        links = JSON.stringify(linksStore.links)
        nodes = JSON.stringify(linksStore.nodes)
        rlinks = JSON.stringify(rlinksStore.rlinks)
        rnodes = JSON.stringify(rlinksStore.rnodes)
        od = JSON.stringify(ODStore.layer)
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
        if (!runStore.parametersIsEmpty) {
          const blob = new Blob([JSON.stringify(runStore.parameters)], { type: 'application/json' })
          zip.file('inputs/params.json', blob)
        }
        if (this.styles.length > 0) {
          const blob = new Blob([JSON.stringify(this.styles)], { type: 'application/json' })
          zip.file('styles.json', blob)
        }
        if (JSON.stringify(this.attributesChoices) !== JSON.stringify(defaultAttributesChoices)) {
          const blob = new Blob([JSON.stringify(this.attributesChoices)], { type: 'application/json' })
          zip.file('attributesChoices.json', blob)
        }

        for (const file of this.otherFiles) {
          // if others file loaded from S3 (they are not loaded yet. need to download them.)
          if (file.content == null && userStore.model !== null) {
            file.content = await s3.readBytes(userStore.model, userStore.scenario + '/' + file.path)
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
        .then((content) => {
          // see FileSaver.js
          saveAs(content, `${this.outputName}.zip`)
        })
    },

    async exportToS3 (payload) {
      // payload = 'inputs'. only export inputs
      // else no payload to export all.
      const linksStore = useLinksStore()
      const rlinksStore = userLinksStore()
      const ODStore = useODStore()
      const runStore = useRunStore()
      const userStore = useUserStore()
      linksStore.applyPropertiesTypes(linksStore.links)
      const scen = userStore.scenario + '/'
      const bucket = userStore.model
      const inputFolder = scen + 'inputs/'
      const ptFolder = inputFolder + 'pt/'
      const roadFolder = inputFolder + 'road/'
      const odFolder = inputFolder + 'od/'
      const paths = {
        links: ptFolder + 'links.geojson',
        nodes: ptFolder + 'nodes.geojson',
        rlinks: roadFolder + 'road_links.geojson',
        rnodes: roadFolder + 'road_nodes.geojson',
        od: odFolder + 'od.geojson',
        params: scen + 'inputs/params.json',
        styles: scen + 'styles.json',
        attributesChoices: scen + 'attributesChoices.json',
      }
      // save params
      if (runStore.parameters.length > 0) {
        await s3.putObject(bucket, paths.params, JSON.stringify(runStore.parameters))
      }
      // save styles if changed
      if (this.styles.length > 0) {
        await s3.putObject(bucket, paths.styles, JSON.stringify(this.styles))
      }
      // save attributes choices if changed
      if (JSON.stringify(this.attributesChoices) !== JSON.stringify(defaultAttributesChoices)) {
        await s3.putObject(bucket, paths.attributesChoices, JSON.stringify(this.attributesChoices))
      }
      // save PT
      if (linksStore.links.features.length > 0) {
        await s3.putObject(bucket, paths.links, JSON.stringify(linksStore.links))
        await s3.putObject(bucket, paths.nodes, JSON.stringify(linksStore.nodes))
      } else {
        // if its deleted in quenedi. delete it on s3. function works with nothing to delete too.
        s3.deleteFolder(bucket, ptFolder)
      }
      // save Roads
      if (rlinksStore.rlinks.features.length > 0) {
        await s3.putObject(bucket, paths.rlinks, JSON.stringify(rlinksStore.rlinks))
        await s3.putObject(bucket, paths.rnodes, JSON.stringify(rlinksStore.rnodes))
      } else {
        // if its deleted in quenedi. delete it on s3. function works with nothing to delete too.
        s3.deleteFolder(bucket, roadFolder)
      }
      // save ods
      if (!ODStore.layerIsEmpty) {
        await s3.putObject(bucket, paths.od, JSON.stringify(ODStore.layer))
      } else {
        // if its deleted in quenedi. delete it on s3. function works with nothing to delete too.
        s3.deleteFolder(bucket, odFolder)
      }

      // delete otherFiles (if a otherFiles is on S3 but not in memory (was deleted locally))
      // delete it on s3 when we save.
      let filesOnCloud = await s3.listFiles(bucket, scen)
      const filesToExcludes = Object.values(paths) // list of all files (that are not others.)
      filesOnCloud = filesOnCloud.filter(path => !filesToExcludes.includes(path))
      filesOnCloud = filesOnCloud.map(file => file.slice(scen.length)) // remove scen name from file)
      filesOnCloud = filesOnCloud.filter(path => path.startsWith('outputs/') || path.startsWith('inputs/'))
      const localOtherFiles = this.otherFiles.map(el => el.path)
      for (const file of filesOnCloud) {
        if (!localOtherFiles.includes(file)) {
          await s3.deleteObject(bucket, scen + file)
        }
      }

      // save others files
      // if payload === inputs. only export inputs/ files.
      let otherFiles = this.otherFiles
      if (payload === 'inputs') {
        otherFiles = otherFiles.filter(file => !file.path.startsWith('outputs/'))
      }
      for (const file of otherFiles) {
        // if others file loaded from S3 )
        if (file.content == null) {
          // pass
        } else if (file.content instanceof Uint8Array) {
          await s3.putObject(bucket, scen + file.path, file.content)
        } else {
          await s3.putObject(bucket, scen + file.path, JSON.stringify(file.content))
        }
      }
    },
    async deleteOutputsOnS3 () {
      const userStore = useUserStore()
      await s3.deleteFolder(userStore.model, userStore.scenario + '/outputs/')
    },

  },
  getters: {
    projectIsUndefined: () => {
      const links = useLinksStore()
      return Object.keys(links.links).length === 0
    },
    projectIsEmpty: (state) => {
      const links = useLinksStore()
      const rlinks = userLinksStore()
      const od = useODStore()
      const runStore = useRunStore()
      return (links.links.features.length === 0
        && rlinks.rlinks.features.length === 0
        && od.layer.features.length === 0
        && state.otherFiles.length === 0
        && runStore.parameters.length === 0
        && state.styles.length === 0)
    },
    availableLayers: (state) => {
      // do not return empty links or rlinks or OD as available.
      const links = useLinksStore()
      const rlinks = userLinksStore()
      const od = useODStore()
      const availableLayers = []
      if (!links.linksIsEmpty) {
        availableLayers.push(...['links', 'nodes'])
      }
      if (!rlinks.rlinksIsEmpty) {
        availableLayers.push(...['rlinks', 'rnodes'])
      }
      if (!od.layerIsEmpty === 0) {
        availableLayers.push('od')
      }
      state.otherFiles.filter(file => file.extension === 'geojson').forEach(file => {
        availableLayers.push(file.name)
      })

      // for now. remove inputs as they are not read. (need to fetch them.)
      return availableLayers.filter(name => !name.startsWith('inputs/'))
    },

  },
})
