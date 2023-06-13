import { quetzalClient } from '@src/axiosClient.js'
import s3 from '@src/AWSClient'
import { classFile } from '@src/components/utils/utils.js'
const $gettext = s => s

export default {
  namespaced: true,
  state: {
    stateMachineArnBase: 'arn:aws:states:ca-central-1:142023388927:stateMachine:',
    steps: [{ name: 'Loading Steps...' }],
    running: false,
    executionArn: '',
    currentStep: 0,
    error: false,
    synchronized: true,
    parameters: [],
  },
  mutations: {
    cleanRun (state) {
      state.steps = [{ name: 'Loading Steps...' }]
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
      this.commit('changeNotification',
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
    },
    updateCurrentStep (state, payload) {
      const stepNames = state.steps.map(a => a.name)
      state.currentStep = stepNames.indexOf(payload.name) + 1
    },
    getLocalParameters (state, payload) {
      state.parameters = payload
    },
  },
  actions: {
    async getParameters ({ state, commit }, payload) {
      try {
        const params = await s3.readJson(payload.model, payload.path)
        state.parameters = params
      } catch (err) {
        commit('changeAlert', err, { root: true })
        state.parameters = []
      }
    },
    async getOutputs (context) {
      const model = context.rootState.user.model
      const scenario = context.rootState.user.scenario
      const path = scenario + '/' + context.rootState.user.config.output_paths
      let filesNames = await s3.listFiles(model, path)
      filesNames = filesNames.filter(name => name !== path)
      filesNames = filesNames.filter(name => !name.endsWith('.png'))
      const files = []
      for (const file of filesNames) {
        const content = await s3.readJson(model, file)
        const name = file.split('/').slice(1).join('/')
        files.push(classFile(name, content))
      }
      if (files.length > 0) {
        context.commit('unloadLayers', null, { root: true })
        files.filter(file => (['layerLinks', 'links', 'road_links'].includes(file.type))).forEach(
          file => {
            const data = file.data
            const fileName = file.fileName.slice(0, -8)
            let matData = files.filter(json => json.fileName.slice(0, -5) === fileName)[0]?.data
            matData = matData || {}
            const matDataExist = Object.keys(matData).length > 0
            if (!Object.keys(file.data.features[0].properties).includes('index') && matDataExist) {
              this.error($gettext(fileName + ' there is no index. Import aborted'))
              return
            }

            context.commit('loadLayer', {
              fileName: fileName,
              type: 'links',
              data: data,
              mat: matData,
            }, { root: true })
          })
        files.filter(file => (['layerNodes', 'nodes', 'road_nodes'].includes(file.type))).forEach(
          file => {
            const data = file.data
            const fileName = file.fileName.slice(0, -8)
            let matData = files.filter(json => json.fileName.slice(0, -5) === fileName)[0]?.data
            matData = matData || {}
            const matDataExist = Object.keys(matData).length > 0
            if (!Object.keys(file.data.features[0].properties).includes('index') && matDataExist) {
              this.error($gettext(fileName + ' there is no index. Import aborted'))
              return
            }
            context.commit('loadLayer', {
              fileName: fileName,
              type: 'nodes',
              data: data,
              mat: matData,
            }, { root: true })
          })
        // for zones. find the corresponding json file (mat) or nothing.
        files.filter(file => (file.type === 'zones')).forEach(
          file => {
            const zoneData = file.data
            const fileName = file.fileName.slice(0, -8)
            let matData = files.filter(json => json.fileName.slice(0, -5) === fileName)[0]?.data
            matData = matData || {}
            const matDataExist = Object.keys(matData).length > 0
            if (!Object.keys(file.data.features[0].properties).includes('index') && matDataExist) {
              this.error($gettext(fileName + ' there is no index. Import aborted'))
              return
            }
            context.commit('loadLayer', {
              fileName: fileName,
              type: 'zones',
              data: zoneData,
              mat: matData,
            }, { root: true })
          })
      }
    },
    getSteps ({ state, commit, rootState }) {
      let data = { stateMachineArn: state.stateMachineArnBase + rootState.user.model }
      quetzalClient.client.post('/describe/model',
        data = JSON.stringify(data),
      ).then(
        response => {
          const def = JSON.parse(response.data.definition)
          const steps = [{ name: def.StartAt }]
          if (def.States[def.StartAt].Next !== undefined) {
            let next = def.States[def.StartAt].Next
            while (true) {
              steps.push({ name: next })
              if (def.States[next].Next === undefined) break
              next = def.States[next].Next
            }
          }
          commit('setSteps', steps)
        }).catch(
        err => {
          commit('changeAlert', err, { root: true })
        })
    },
    startExecution ({ state, commit, dispatch, rootState }, payload) {
      const paramsDict = state.parameters.reduce((acc, { category, params }) => {
        acc[category] = params.reduce((paramAcc, { text, value }) => {
          paramAcc[text] = value
          return paramAcc
        }, {})
        return acc
      }, {})
      let data = {
        // eslint-disable-next-line no-useless-escape
        input: JSON.stringify({
          scenario_path_S3: payload.scenario + '/',
          launcher_arg: {
            scenario: 'base',
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
            this.status = response.data.status
            if (this.status === 'SUCCEEDED') {
              dispatch('getOutputs').then(
                () => {
                  commit('succeedExecution')
                  clearInterval(intervalId)
                },
              ).catch(err => alert(err))
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              commit('terminateExecution')
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            commit('changeAlert', err, { root: true })
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
    parameters: (state) => state.parameters,
  },
}
