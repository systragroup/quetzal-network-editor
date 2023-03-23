import { quetzalClient } from '@src/axiosClient.js'

export default {
  namespaced: true,
  state: {
    stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-paris',
    steps: [{ name: 'Loading Steps...' }],
    running: false,
    executionArn: '',
    currentStep: 0,
    error: false,
    synchronized: true,
  },
  mutations: {
    setSteps (state, payload) {
      state.steps = payload
    },
    startExecution (state, payload) {
      state.error = false
      state.running = true
      state.currentStep = 1
      state.executionArn = payload.executionArn
    },
    terminateExecution (state) {
      state.running = false
      state.error = true
      state.executionArn = ''
    },
    changeRunning (state, payload) {
      state.running = payload
    },
    succeedExecution (state) {
      state.running = false
      state.currentStep = state.steps.length + 1
      state.executionArn = ''
    },
    updateCurrentStep (state, payload) {
      const stepNames = state.steps.map(a => a.name)
      state.currentStep = stepNames.indexOf(payload.name) + 1
    },
  },
  actions: {
    getSteps ({ state, commit }) {
      let data = { stateMachineArn: state.stateMachineArn }
      quetzalClient.client.post('/describe/model',
        data = JSON.stringify(data),
      ).then(
        response => {
          const def = JSON.parse(response.data.definition)
          const steps = [{ name: def.StartAt }]
          let next = def.States[def.StartAt].Next
          while (true) {
            steps.push({ name: next })
            if (def.States[next].Next === undefined) break
            next = def.States[next].Next
          }
          commit('setSteps', steps)
        }).catch(
        err => {
          console.log(err)
        })
    },
    startExecution ({ state, commit, dispatch }) {
      let data = {
        // eslint-disable-next-line no-useless-escape
        input: JSON.stringify({
          scenario_path_S3: 'base/',
          launcher_arg: {
            scenario: 'base',
            training_folder: '/tmp',
          },
        }),
        stateMachineArn: state.stateMachineArn,
      }
      quetzalClient.client.post('',
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
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.status = response.data.status
            if (this.status === 'SUCCEEDED') {
              commit('succeedExecution')
              clearInterval(intervalId)
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              commit('terminateExecution')
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            console.log(err)
          })
        data = { executionArn: state.executionArn, includeExecutionData: false, reverseOrder: true }
        quetzalClient.client.post('/history',
          data = JSON.stringify(data),
        ).then(
          response => {
            for (const e in response.data.events) {
              const event = response.data.events[e]
              if (event.type === 'TaskStateEntered') {
                commit('updateCurrentStep', event.stateEnteredEventDetails)
                break
              }
            }
          }).catch(
          err => {
            console.log(err)
          })
      }, 5000)
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
          console.log(err)
        })
    },
  },
  getters: {
    steps: (state) => state.steps,
    running: (state) => state.running,
    currentStep: (state) => state.currentStep,
    executionArn: (state) => state.executionArn,
    error: (state) => state.error,
    synchronized: (state) => state.synchronized,
  },
}
