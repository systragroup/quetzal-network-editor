import { quetzalClient } from '@src/axiosClient.js'
import s3 from '@src/AWSClient'
import { v4 as uuid } from 'uuid'

const $gettext = s => s

export default {
  namespaced: true,
  state: {
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:ML_MatrixRoadCaster',
    bucket: 'matrixroadcaster',
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
  },
  mutations: {
    cleanRun (state) {
      state.running = false
      state.executionArn = ''
      state.error = false
    },
    setCallID (state) { state.callID = uuid() },
    setParameters (state, payload) { state.parameters = payload },
    terminateExecution (state, payload) {
      state.running = false
      state.error = true
      state.errorMessage = payload
      state.executionArn = ''
    },
    changeRunning (state, payload) {
      state.running = payload
    },
    getApproxTimer (state, payload) {
      // payload is number of road links
      const numZones = state.parameters.num_zones
      const trainSize = state.parameters.train_size
      const numPlotOD = state.parameters.num_random_od
      // API call time (1.8sec per call), 15 iteration X number of links, loadning saving, plotting 15sec.
      state.timer = Math.min(numZones, trainSize) * 1.8 + payload * 0.002 + 15
      state.timer += 10 * numPlotOD // 10 sec per plots
    },
    succeedExecution (state) {
      state.running = false
      state.executionArn = ''
      this.commit('changeNotification',
        { text: $gettext('Matrix Road Caster executed successfully!'), autoClose: false, color: 'success' })
    },

  },
  actions: {
    async startExecution ({ state, commit, dispatch }, payload) {
      commit('getApproxTimer', payload.rlinks.features.length)
      commit('setParameters', payload.parameters)
      console.log('exporting roads to s3')
      state.error = false
      state.running = true
      try {
        await s3.putObject(
          state.bucket,
          state.callID.concat('/road_links.geojson'),
          JSON.stringify(payload.rlinks))
        await s3.putObject(
          state.bucket,
          state.callID.concat('/road_nodes.geojson'),
          JSON.stringify(payload.rnodes))
      } catch (err) { commit('changeAlert', err, { root: true }) }
      let data = {
        input: JSON.stringify(state.parameters),
        name: state.callID,
        stateMachineArn: state.stateMachineArn,
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          state.executionArn = response.data.executionArn
          dispatch('pollExecution')
        }).catch(err => {
        commit('changeAlert', err, { root: true })
        state.running = false
        state.status = 'FAILED'
      })
    },
    pollExecution ({ commit, state, dispatch }) {
      const intervalId = setInterval(() => {
        let data = { executionArn: state.executionArn }
        state.timer = state.timer - 2
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            state.status = response.data.status
            console.log(state.status)
            if (state.status === 'SUCCEEDED') {
              commit('succeedExecution')
              clearInterval(intervalId)
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(state.status)) {
              commit('terminateExecution', JSON.parse(response.data.cause))
              clearInterval(intervalId)
            }
          }).catch(err => { commit('changeAlert', err, { root: true }) })
      }, 2000)
    },
    stopExecution ({ state, commit }) {
      let data = { executionArn: state.executionArn }
      quetzalClient.client.post('/abort',
        data = JSON.stringify(data),
      ).then(
        response => {
          commit('terminateExecution', response.data)
          // Maybe we sould wait for back to say that execution is terminated (but the wait is awkward)
        }).catch(
        err => {
          commit('changeAlert', err, { root: true })
        })
    },
  },
  getters: {
    running: (state) => state.running,
    status: (state) => state.status,
    executionArn: (state) => state.executionArn,
    error: (state) => state.error,
    errorMessage: (state) => state.errorMessage,
    callID: (state) => state.callID,
    bucket: (state) => state.bucket,
    timer: (state) => state.timer,
    parameters: (state) => state.parameters,
  },
}
