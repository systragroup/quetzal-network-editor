import { quetzalClient } from '@src/axiosClient.js'
import { defineStore } from 'pinia'
import { useIndexStore } from './index'

import s3 from '@src/AWSClient'
import { v4 as uuid } from 'uuid'

const $gettext = s => s

export const useMRCStore = defineStore('runMRC', {
  state: () => ({
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-matrixroadcaster-api',
    bucket: 'quetzal-api-bucket',
    callID: '',
    status: '',
    timer: 0,
    running: false,
    executionArn: '',
    error: false,
    errorMessage: '',
    parameters: {
      callID: 'test',
      num_zones: 100,
      train_size: 100,
      date_time: '2022-12-13T08:00:21-04:00',
      ff_time_col: 'time',
      max_speed: 100,
      num_cores: 1,
      num_random_od: 1,
      create_zone: true,
      hereApiKey: '',
    },
  }),

  actions: {

    cleanRun () {
      this.running = false
      this.executionArn = ''
      this.error = false
    },
    setCallID () { this.callID = uuid() },
    setParameters (payload) { this.parameters = payload },
    terminateExecution (payload) {
      this.running = false
      this.error = true
      this.errorMessage = payload
      this.executionArn = ''
    },
    changeRunning (payload) {
      this.running = payload
    },
    getApproxTimer (payload) {
      // payload is number of road links
      const numZones = this.parameters.num_zones
      const trainSize = this.parameters.train_size
      const numPlotOD = this.parameters.num_random_od
      // API call time (1.8sec per call), 15 iteration X number of links, loadning saving, plotting 15sec.
      this.timer = Math.min(numZones, trainSize) * 1.8 + payload * 0.002 + 15
      this.timer += 10 * numPlotOD // 10 sec per plots
    },
    succeedExecution () {
      this.running = false
      this.executionArn = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('Matrix Road Caster executed successfully!'), autoClose: false, color: 'success' })
    },

    async startExecution (payload) {
      this.getApproxTimer(payload.rlinks.features.length)
      this.setParameters(payload.parameters)
      console.log('exporting roads to s3')
      this.error = false
      this.running = true
      try {
        await s3.putObject(
          this.bucket,
          this.callID.concat('/road_links.geojson'),
          JSON.stringify(payload.rlinks))
        await s3.putObject(
          this.bucket,
          this.callID.concat('/road_nodes.geojson'),
          JSON.stringify(payload.rnodes))
      } catch (err) {
        const store = useIndexStore()
        store.changeAlert(err)
      }
      let data = {
        input: JSON.stringify(this.parameters),
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
    pollExecution () {
      const intervalId = setInterval(() => {
        let data = { executionArn: this.executionArn }
        this.timer = this.timer - 2
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.status = response.data.status
            console.log(this.status)
            if (this.status === 'SUCCEEDED') {
              this.succeedExecution()
              clearInterval(intervalId)
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
  },

})
