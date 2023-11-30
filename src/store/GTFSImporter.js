import s3 from '@src/AWSClient'
import { quetzalClient } from '@src/axiosClient.js'
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { useIndexStore } from './index'
import { useLinksStore } from './links'

import router from '@src/router/index'

const $gettext = s => s

export const useGTFSStore = defineStore('runGTFS', {
  state: () => ({
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-gtfs-api',
    bucket: 'quetzal-api-bucket',
    callID: uuid(),
    status: '',
    running: false,
    executionArn: '',
    error: false,
    errorMessage: '',
    UploadedGTFS: [], // list of upploded gtfs (zip local)
    selectedGTFS: [], // list of index for web Importer
    parameters: {
      start_time: '6:00:00',
      end_time: '8:59:00',
      day: 'tuesday',
    },
    widthDict: {
      bus: 3,
      subway: 8,
      rail: 6,
      tram: 5,
    },

  }),
  actions: {

    cleanRun () {
      this.running = false
      this.executionArn = ''
      this.error = false
      this.UploadedGTFS = []
      this.selectedGTFS = []
      this.callID = uuid()
    },
    setCallID () {
      this.callID = uuid()
    },

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
      payload.forEach(param => this.parameters[param.name] = param.value)
    },
    saveSelectedGTFS (payload) {
      // for web importer
      this.selectedGTFS = payload
    },

    updateProgress (payload) {
      this.UploadedGTFS.filter(el => el.name === payload.name)[0].progress = payload.progress
    },
    succeedExecution () {
      const store = useIndexStore()
      this.running = false
      this.executionArn = ''
      store.changeNotification(
        { text: $gettext('gtfs imported successfully!'), autoClose: false, color: 'success' })
    },

    async addGTFS (payload) {
      const nameList = this.UploadedGTFS.map(el => el?.name)
      if (!nameList.includes(payload.info.name)) {
        this.UploadedGTFS.push(payload.info)
      }

      const upload = s3.uploadObject(this.bucket, this.callID + '/' + payload.info.name, payload.content)
      upload.on('httpUploadProgress', (progress) => {
        const percent = Math.round(progress.loaded / progress.total * 100)
        this.updateProgress({ name: payload.info.name, progress: percent })
      })
      upload.done()
    },

    startExecution (payload) {
      this.running = true
      this.error = false
      const input = JSON.stringify({
        callID: this.callID,
        files: payload.files,
        start_time: payload.start_time,
        end_time: payload.end_time,
        dates: payload.dates,
      })

      let data = {
        input,
        name: uuid(),
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
      const store = useIndexStore()
      let data = { executionArn: this.executionArn }
      quetzalClient.client.post('/abort',
        data = JSON.stringify(data),
      ).then(
        response => {
          this.terminateExecution(response.data)
          // Maybe we sould wait for back to say that execution is terminated (but the wait is awkward)
        }).catch(
        err => {
          store.changeAlert(err)
        })
    },
    async downloadOSMFromS3 () {
      const linksStore = useLinksStore()
      function applyDict (links, widthDict) {
        // 00BCD4
        Object.keys(widthDict).forEach(routeType => {
          links.features.filter(link => link.properties.route_type === routeType).forEach(
            link => {
              link.properties.route_width = widthDict[routeType]
            })
        })
        return links
      }

      let links = await s3.readJson(this.bucket, this.callID.concat('/links.geojson'))
      if (links.features.length > 0) {
        links = applyDict(links, this.widthDict)
      }
      linksStore.appendNewLinks(links)
      const nodes = await s3.readJson(this.bucket, this.callID.concat('/nodes.geojson'))
      linksStore.appendNewNodes(nodes)
      router.push('/Home').catch(() => {})
    },
  },
  getters: {

  },
})
