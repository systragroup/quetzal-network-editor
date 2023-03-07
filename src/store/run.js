import { axiosClient } from '@src/axiosClient.js'

export default {
  namespaced: true,
  state: {
    running: false,
    executionArn: '',
  },
  mutations: {
    startExecution (state, payload) {
      state.running = true
      state.executionArn = payload.executionArn
    },
    terminateExecution (state) {
      state.running = false
      state.executionArn = ''
    },
  },
  actions: {
    startExecution ({ commit, dispatch }) {
      let data = {
        input: '{\"launcher_arg\":{\"scenario\":\"base\", \"training_folder\":\"/tmp\"}}',
        stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-paris',
      }
      axiosClient.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          commit('startExecution', response.data)
          dispatch('pollExecution')
        }).catch(
        err => {
          console.log(err)
        })
    },
    pollExecution ({ commit, state }) {
      const intervalId = setInterval(() => {
        let data = { executionArn: state.executionArn }
        axiosClient.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.status = response.data.status
            if (this.status === 'SUCCEEDED') {
              commit('terminateExecution')
              clearInterval(intervalId)
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              commit('terminateExecution')
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            console.log(err)
          })
      }, 5000)
    },
  },
  getters: {
    running: (state) => state.running,
    executionArn: (state) => state.executionArn,
  },
}
