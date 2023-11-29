import { quetzalClient } from '@src/axiosClient.js'
import { paramsSerializer } from '@src/components/utils/serializer.js'
import s3 from '@src/AWSClient'
const $gettext = s => s

export default {
  namespaced: true,
  state: {
    stateMachineArnBase: 'arn:aws:states:ca-central-1:142023388927:stateMachine:',
    steps: [{ name: 'Loading Steps...' }],
    selectedStepFunction: 'default', // default or comparision,
    avalaibleStepFunctions: ['default'],
    running: false,
    executionArn: '',
    currentStep: 0,
    error: false,
    errorMessage: '',
    synchronized: true,
    parameters: [],
  },
  mutations: {
    cleanRun (state) {
      state.steps = [{ name: 'Loading Steps...' }]
      state.selectedStepFunction = 'default'
      state.avalaibleStepFunctions = ['default']
      state.running = false
      state.executionArn = ''
      state.currentStep = 0
      state.error = false
      state.synchronized = true
      state.parameters = []
    },
    setSteps (state, payload) {
      state.steps = payload
      state.steps.splice(0, 0, { name: 'Saving Networks' })
      state.steps.push({ name: 'Loading Results' })
    },
    startExecution (state) {
      state.error = false
      state.running = true
      state.currentStep = 1
    },
    terminateExecution (state, payload) {
      state.running = false
      state.error = true
      state.errorMessage = payload
      state.executionArn = ''
    },
    changeRunning (state, payload) {
      state.running = payload
    },
    succeedExecution (state) {
      state.running = false
      state.currentStep = state.steps.length + 1
      state.executionArn = ''
      this.commit('changeNotification',
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
    },
    updateCurrentStep (state, payload) {
      const stepNames = state.steps.map(a => a.name)
      state.currentStep = stepNames.indexOf(payload.name) + 1
    },
    getLocalParameters (state, payload) {
      payload = paramsSerializer(payload)
      state.parameters = payload
    },
    setSelectedStepFunction (state, payload) {
      state.selectedStepFunction = payload
    },
    setAvalaibleStepFunctions (state, payload) {
      state.avalaibleStepFunctions = payload
    },
  },
  actions: {
    async getParameters ({ state, commit }, payload) {
      // only for the reset button.
      try {
        const params = await s3.readJson(payload.model, payload.path)
        state.parameters = params
      } catch (err) {
        commit('changeAlert', err, { root: true })
      }
    },
    async getOutputs (context) {
      const model = context.rootState.user.model
      const scen = context.rootState.user.scenario + '/'
      const path = scen + 'outputs/'
      let filesList = await s3.listFiles(model, path)
      filesList = filesList.filter(name => !name.endsWith('/'))
      const res = []
      for (const file of filesList) {
        const name = file.slice(scen.length) // remove scen name from file
        if (file.endsWith('.json') || file.endsWith('.geojson')) {
          const content = await s3.readJson(model, file)
          res.push({ path: name, content: content })
        } else {
          res.push({ path: name, content: null })
        }
      }

      if (res.length > 0) {
        // unload all results Layers
        context.commit('unloadLayers', {}, { root: true })
        context.commit('loadFiles', res, { root: true })
        // load new Results
      }
    },
    async getSteps ({ state, commit, rootState }) {
      try {
        let data = { stateMachineArn: state.stateMachineArnBase + rootState.user.model }
        const response = await quetzalClient.client.post('/describe/model',
          data = JSON.stringify(data))
        const def = JSON.parse(response.data.definition)
        const firstStep = def.StartAt

        // check if there is a choice in the definition.
        // if So. Get all choices in state.availableStepFunctions
        // replace the Next of the choice step with the selected one.
        Object.keys(def.States).forEach((key) => {
          if (def.States[key].Type === 'Choice') {
          // could be a list of choices
            state.avalaibleStepFunctions = ['default', ...def.States[key].Choices.map(el => el.StringEquals)]
            if (state.selectedStepFunction === 'default') {
              def.States[key].Next = def.States[key].Default
            } else {
            // if not default. select the one in the list
              const choices = def.States[key].Choices
              def.States[key].Next = choices.filter(el => el.StringEquals === state.selectedStepFunction)[0].Next
            }
          }
        })
        // if there is a choice

        // let next = def.States[firstStep].Next
        const steps = []
        let next = firstStep
        while (true) {
        // if there is a choice
          if (def.States[next].Type === 'Choice') {
            next = def.States[next].Next
          }
          steps.push({ name: next })
          if (def.States[next].Next === undefined) break
          next = def.States[next].Next
        }
        commit('setSteps', steps)
      } catch (err) {
        commit('changeAlert', err, { root: true })
      }
    },
    startExecution ({ state, commit, dispatch, rootState }, payload) {
      const filteredParams = state.parameters.filter(param =>
        (Object.keys(param).includes('category')) && param.model === state.selectedStepFunction)
      const paramsDict = filteredParams.reduce((acc, { category, params }) => {
        acc[category] = params.reduce((paramAcc, { name, value, type }) => {
          paramAcc[name] = type?.toLowerCase() === 'number' ? Number(value) : value
          return paramAcc
        }, {})
        return acc
      }, {})
      let data = {
        // eslint-disable-next-line no-useless-escape
        input: JSON.stringify({
          authorization: rootState.user.idToken,
          choice: state.selectedStepFunction,
          scenario_path_S3: payload.scenario + '/',
          launcher_arg: {
            training_folder: '/tmp',
            params: paramsDict,
          },
          metadata: {
            user_email: rootState.user.cognitoInfo.email,
          },
        }),
        stateMachineArn: state.stateMachineArnBase + rootState.user.model,
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          state.executionArn = response.data.executionArn
          dispatch('pollExecution')
        }).catch(
        err => {
          commit('changeAlert', err, { root: true })
        })
    },
    pollExecution ({ commit, state, dispatch }) {
      const intervalId = setInterval(() => {
        let data = { executionArn: state.executionArn }
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            state.status = response.data.status
            if (state.status === 'SUCCEEDED') {
              dispatch('getOutputs').then(
                () => {
                  commit('succeedExecution')
                  clearInterval(intervalId)
                },
              ).catch(err => alert(err))
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(state.status)) {
              commit('terminateExecution', JSON.parse(response.data.cause))
              clearInterval(intervalId)
            } else if (state.status === undefined) {
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            commit('changeAlert', err, { root: true })
            state.running = false
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
    avalaibleStepFunctions: (state) => state.avalaibleStepFunctions,
    selectedStepFunction: (state) => state.selectedStepFunction,
    running: (state) => state.running,
    currentStep: (state) => state.currentStep,
    executionArn: (state) => state.executionArn,
    error: (state) => state.error,
    errorMessage: (state) => state.errorMessage,
    synchronized: (state) => state.synchronized,
    parameters: (state) => state.parameters,
    parametersIsEmpty: (state) => state.parameters.length === 0,
    availableModels: (state) => new Set(state.parameters.map(param => param.model)),

  },
}
