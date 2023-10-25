import s3 from '@src/AWSClient'
import { quetzalClient } from '@src/axiosClient.js'
import { v4 as uuid } from 'uuid'
import router from '../../router'

const $gettext = s => s

export default {
  namespaced: true,
  state: {
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-gtfs-api',
    bucket: 'quetzal-api-bucket',
    callID: uuid(),
    status: '',
    running: false,
    executionArn: '',
    error: false,
    errorMessage: '',
    UploadedGTFS: [],

  },
  mutations: {
    cleanRun (state) {
      state.running = false
      state.executionArn = ''
      state.error = false
      this.commit('setCallID')
    },
    setCallID (state) {
      state.callID = uuid()
      state.UploadedGTFS = []
    },

    terminateExecution (state, payload) {
      state.running = false
      state.error = true
      state.errorMessage = payload
      state.executionArn = ''
      this.commit('setCallID')
    },
    changeRunning (state, payload) {
      state.running = payload
    },
    addGTFS (state, payload) {
      const nameList = state.UploadedGTFS.map(el => el?.name)
      if (!nameList.includes(payload.name)) {
        state.UploadedGTFS.push(payload)
      }
    },
    updateProgress (state, payload) {
      state.UploadedGTFS.filter(el => el.name === payload.name)[0].progress = payload.progress
    },
    succeedExecution (state) {
      state.running = false
      state.executionArn = ''
      this.commit('changeNotification',
        { text: $gettext('gtfs imported successfully!'), autoClose: false, color: 'success' })
    },

  },
  actions: {

    async addGTFS ({ state, commit }, payload) {
      commit('addGTFS', payload.info)
      const upload = s3.uploadObject(state.bucket, state.callID + '/' + payload.info.name, payload.content)
      upload.on('httpUploadProgress', (progress) => {
        const percent = Math.round(progress.loaded / progress.total * 100)
        commit('updateProgress', { name: payload.info.name, progress: percent })
      })
      upload.promise()
    },

    startExecution ({ state, commit, dispatch }, payload) {
      state.running = true
      state.error = false
      const input = JSON.stringify({
        callID: state.callID,
        files: payload.files,
        start_time: payload.start_time,
        end_time: payload.end_time,
        dates: payload.dates,
      })

      let data = {
        input: input,
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
    async pollExecution ({ commit, state, dispatch }) {
      const intervalId = setInterval(() => {
        let data = { executionArn: state.executionArn }
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          async response => {
            state.status = response.data.status
            console.log(state.status)
            if (state.status === 'SUCCEEDED') {
              clearInterval(intervalId)
              await dispatch('downloadOSMFromS3')
              commit('succeedExecution')
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
    async downloadOSMFromS3 ({ state, commit }) {
      const links = await s3.readJson(state.bucket, state.callID.concat('/links.geojson'))
      commit('appendNewLinks', links, { root: true })
      const nodes = await s3.readJson(state.bucket, state.callID.concat('/nodes.geojson'))
      commit('appendNewNodes', nodes, { root: true })
      console.log('downloaded')
      router.push('/Home').catch(() => {})
    },
  },
  getters: {
    UploadedGTFS: (state) => state.UploadedGTFS,
    running: (state) => state.running,
    status: (state) => state.status,
    executionArn: (state) => state.executionArn,
    error: (state) => state.error,
    errorMessage: (state) => state.errorMessage,
    callID: (state) => state.callID,
    bucket: (state) => state.bucket,
  },
}
