import s3 from '@src/AWSClient'
import { quetzalClient } from '@src/axiosClient.js'
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import router from '@src/router/index'
import { useIndexStore } from './index'
import { userLinksStore } from './rlinks'
import { highwayColor, highwayWidth } from '@constants/highway.js'
const $gettext = s => s

export const useOSMStore = defineStore('runOSM', {
  state: () => ({
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-osm-api',
    bucket: 'quetzal-api-bucket',
    callID: '',
    status: '',
    timer: 0,
    running: false,
    executionArn: '',
    error: false,
    errorMessage: '',

    tags: ['highway', 'maxspeed', 'lanes', 'name', 'oneway', 'surface'],
    parameters: {
      extendedCycleway: false,
      highway: [
        'motorway',
        'motorway_link',
        'trunk',
        'trunk_link',
        'primary',
        'primary_link',
      ],
    },

    colorDict: highwayColor,
    widthDict: highwayWidth,
  }),
  actions: {

    cleanRun () {
      this.running = false
      this.executionArn = ''
      this.error = false
    },
    setCallID () { this.callID = uuid() },

    terminateExecution (payload) {
      this.running = false
      this.error = true
      this.errorMessage = payload
      this.executionArn = ''
    },
    changeRunning (payload) {
      this.running = payload
    },
    saveParams (payload) {
      // eslint-disable-next-line no-return-assign
      Object.keys(payload).forEach(key => this.parameters[key] = payload[key])
    },
    succeedExecution () {
      this.running = false
      this.executionArn = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('OSM network imported successfully!'), autoClose: false, color: 'success' })
    },

    startExecution (payload) {
      this.running = true
      this.error = false
      let input = ''
      if (payload.method === 'bbox') {
        input = JSON.stringify({
          bbox: payload.coords,
          highway: this.parameters.highway,
          callID: this.callID,
          elevation: true,
          extended_cycleway: this.parameters.extendedCycleway,
        })
      } else {
        input = JSON.stringify({
          poly: payload.coords,
          highway: this.parameters.highway,
          callID: this.callID,
          elevation: true,
          extended_cycleway: this.parameters.extendedCycleway,
        })
      }
      let data = {
        input,
        name: this.callID,
        stateMachineArn: this.stateMachineArn,
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          this.executionArn = response.data.executionArn
          this.pollExecution()
        }).catch(err => {
        const store = useIndexStore()
        store.changeAlert(err)
        this.running = false
        this.status = 'FAILED'
      })
    },
    async pollExecution () {
      const intervalId = setInterval(() => {
        let data = { executionArn: this.executionArn }
        this.timer = this.timer - 2
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          async response => {
            this.status = response.data.status
            console.log(this.status)
            if (this.status === 'SUCCEEDED') {
              clearInterval(intervalId)
              await this.downloadOSMFromS3()
              this.succeedExecution()
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              this.terminateExecution(JSON.parse(response.data.cause))
              clearInterval(intervalId)
            }
          }).catch(err => {
          const store = useIndexStore()
          store.changeAlert(err)
        })
      }, 2000)
    },
    stopExecution () {
      let data = { executionArn: this.executionArn }
      quetzalClient.client.post('/abort',
        data = JSON.stringify(data),
      ).then(
        response => {
          this.terminateExecution(response.data)
          // Maybe we sould wait for back to say that execution is terminated (but the wait is awkward)
        }).catch(
        err => {
          const store = useIndexStore()
          store.changeAlert(err)
        })
    },
    async downloadOSMFromS3 () {
      function applyDict (links, colorDict, widthDict) {
        // 00BCD4
        Object.keys(colorDict).forEach(highway => {
          links.features.filter(link => link.properties.highway === highway).forEach(
            link => {
              link.properties.route_width = widthDict[highway]
              link.properties.route_color = colorDict[highway]
            })
        })
        return links
      }

      let rlinks = await s3.readJson(this.bucket, this.callID.concat('/links.geojson'))
      rlinks = applyDict(rlinks, this.colorDict, this.widthDict)
      const rlinksStore = userLinksStore()
      rlinksStore.appendNewrLinks(rlinks)
      const rnodes = await s3.readJson(this.bucket, this.callID.concat('/nodes.geojson'))
      rlinksStore.appendNewrNodes(rnodes)
      router.push('/Home').catch(() => {})
    },
  },
  getters: {
    highway: (state) => state.parameters.highway,
    extendedCycleway: (state) => state.parameters.extendedCycleway,
  },
})
