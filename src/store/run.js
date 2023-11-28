import { quetzalClient } from '@src/axiosClient.js'
import { paramsSerializer } from '@src/components/utils/serializer.js'
import s3 from '@src/AWSClient'
import { defineStore } from 'pinia'
import { useIndexStore } from './index'
import { useUserStore } from './user'

const $gettext = s => s

export const useRunStore = defineStore('run', {
  state: () => ({
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
  }),
  actions: {
    cleanRun () {
      this.steps = [{ name: 'Loading Steps...' }]
      this.selectedStepFunction = 'default'
      this.avalaibleStepFunctions = ['default']
      this.running = false
      this.executionArn = ''
      this.currentStep = 0
      this.error = false
      this.synchronized = true
      this.parameters = []
    },
    setSteps (payload) {
      this.steps = payload
      this.steps.splice(0, 0, { name: 'Saving Networks' })
      this.steps.push({ name: 'Loading Results' })
    },
    initExecution () {
      this.error = false
      this.running = true
      this.currentStep = 1
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
    succeedExecution () {
      const store = useIndexStore()
      this.running = false
      this.currentStep = this.steps.length + 1
      this.executionArn = ''
      store.changeNotification(
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
    },
    updateCurrentStep (payload) {
      const stepNames = this.steps.map(a => a.name)
      this.currentStep = stepNames.indexOf(payload.name) + 1
    },
    getLocalParameters (payload) {
      payload = paramsSerializer(payload)
      this.parameters = payload
    },
    setSelectedStepFunction (payload) {
      this.selectedStepFunction = payload
    },
    setAvalaibleStepFunctions (payload) {
      this.avalaibleStepFunctions = payload
    },
    async getParameters (payload) {
      // only for the reset button.
      const store = useIndexStore()
      try {
        const params = await s3.readJson(payload.model, payload.path)
        this.parameters = params
      } catch (err) {
        store.changeAlert(err)
      }
    },
    async getOutputs () {
      const userStore = useUserStore()
      const model = userStore.model
      const scen = userStore.scenario + '/'
      const path = scen + 'outputs/'
      let filesList = await s3.listFiles(model, path)
      filesList = filesList.filter(name => !name.endsWith('/'))
      const res = []
      for (const file of filesList) {
        const name = file.slice(scen.length) // remove scen name from file
        if (file.endsWith('.json') || file.endsWith('.geojson')) {
          const content = await s3.readJson(model, file)
          res.push({ path: name, content })
        } else {
          res.push({ path: name, content: null })
        }
      }

      if (res.length > 0) {
        // load new Results
        const store = useIndexStore()
        store.loadFiles(res)
      }
    },
    async getSteps () {
      const userStore = useUserStore()
      const store = useIndexStore()

      try {
        let data = { stateMachineArn: this.stateMachineArnBase + userStore.model }
        const response = await quetzalClient.client.post('/describe/model',
          data = JSON.stringify(data))
        const def = JSON.parse(response.data.definition)
        const firstStep = def.StartAt

        // check if there is a choice in the definition.
        // if So. Get all choices in this.availableStepFunctions
        // replace the Next of the choice step with the selected one.
        Object.keys(def.States).forEach((key) => {
          if (def.States[key].Type === 'Choice') {
          // could be a list of choices
            this.avalaibleStepFunctions = ['default', ...def.States[key].Choices.map(el => el.StringEquals)]
            if (this.selectedStepFunction === 'default') {
              def.States[key].Next = def.States[key].Default
            } else {
              // if not default. select the one in the list
              const choices = def.States[key].Choices
              def.States[key].Next = choices.filter(el => el.StringEquals === this.selectedStepFunction)[0].Next
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
        this.setSteps(steps)
      } catch (err) {
        store.changeAlert(err)
      }
    },
    startExecution (payload) {
      const userStore = useUserStore()
      const store = useIndexStore()
      const filteredParams = this.parameters.filter(param =>
        (Object.keys(param).includes('category')) && param.model === this.selectedStepFunction)
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
          authorization: userStore.idToken,
          choice: this.selectedStepFunction,
          scenario_path_S3: payload.scenario + '/',
          launcher_arg: {
            training_folder: '/tmp',
            params: paramsDict,
          },
          metadata: {
            user_email: userStore.cognitoInfo.email,
          },
        }),
        stateMachineArn: this.stateMachineArnBase + userStore.model,
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          this.executionArn = response.data.executionArn
          this.pollExecution()
        }).catch(
        err => {
          store.changeAlert(err)
        })
    },
    pollExecution () {
      const intervalId = setInterval(() => {
        let data = { executionArn: this.executionArn }
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.status = response.data.status
            if (this.status === 'SUCCEEDED') {
              this.getOutputs().then(
                () => {
                  this.succeedExecution()
                  clearInterval(intervalId)
                },
              ).catch(err => alert(err))
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              this.terminateExecution(JSON.parse(response.data.cause))
              clearInterval(intervalId)
            } else if (this.status === undefined) {
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            const store = useIndexStore()
            store.changeAlert(err)
            this.running = false
          })
        data = { executionArn: this.executionArn, includeExecutionData: false, reverseOrder: true }
        quetzalClient.client.post('/history',
          data = JSON.stringify(data),
        ).then(
          response => {
            for (const e in response.data.events) {
              const event = response.data.events[e]
              if (event.type === 'TaskStateEntered') {
                this.updateCurrentStep(event.stateEnteredEventDetails)
                break
              }
            }
          }).catch(
          err => {
            console.log(err)
          })
      }, 5000)
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
          console.log(err)
        })
    },
  },
  getters: {
    parametersIsEmpty: (state) => state.parameters.length === 0,
    availableModels: (state) => new Set(state.parameters.map(param => param.model)),

  },
})
