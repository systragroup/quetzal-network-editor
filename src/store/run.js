import { quetzalClient } from '@src/axiosClient.js'
import { paramsSerializer } from '@src/components/utils/serializer.js'
import s3 from '@src/AWSClient'
import { defineStore } from 'pinia'
import { useIndexStore } from './index'
import { useUserStore } from './user'
import audioFile from '@static/samsung-washing-machine-melody-made-with-Voicemod-technology.mp3'
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
    hasLogs: false,
    logs: '',
    endSignal: true,
  }),
  actions: {

    cleanRun () {
      this.steps = [{ name: 'Loading Steps...', tasks: ['Loading Steps...'] }]
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
      this.steps.splice(0, 0, { name: 'Saving Networks', tasks: ['Saving Networks'] })
      this.steps.push({ name: 'Loading Results', tasks: ['Loading Results'] })
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
      this.checkLogs()
    },
    changeRunning (payload) {
      this.running = payload
    },
    succeedExecution () {
      const store = useIndexStore()
      this.running = false
      this.currentStep = this.steps.length + 1
      this.executionArn = ''
      this.checkLogs()
      this.playAudio()

      store.changeNotification(
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
    },
    updateCurrentStep (payload) {
      // payload contain an order list of all step. first one current. all other one are done (or parallel)
      const currentStep = payload[0]
      const stepNames = this.steps.map(a => a.tasks) // for parallel tasks. we have a list for a step.
      const index = stepNames.map(task => task.includes(currentStep)).indexOf(true)
      this.currentStep = index + 1
    },
    getLocalParameters (payload) {
      payload = paramsSerializer(payload)
      this.parameters = payload
    },
    setSelectedStepFunction (payload) {
      this.selectedStepFunction = payload
    },
    async getParameters () {
      // only for the reset button.
      const store = useIndexStore()
      const userStore = useUserStore()
      try {
        const model = userStore.model
        const path = userStore.scenario + '/inputs/params.json'
        const params = await s3.readJson(model, path)
        this.parameters = params
      } catch (err) {
        store.changeAlert(err)
      }
    },
    async checkLogs() {
      const userStore = useUserStore()
      const model = userStore.model
      let logsFiles = await s3.listFiles(model, userStore.scenario + '/logs/')
      logsFiles = logsFiles.filter(name => name.endsWith('.txt'))
      this.hasLogs = logsFiles.length > 0
    },

    async getLogs () {
      // get logs in log/{logs}.txt
      // return this.logs = [{name,text},..] where text is the log.
      const store = useIndexStore()
      const userStore = useUserStore()
      try {
        const model = userStore.model
        let logsFiles = await s3.listFilesWithTime(model, userStore.scenario + '/logs/')
        logsFiles = logsFiles.filter(file => file.name.endsWith('.txt'))
        const logs = []
        for (const file of logsFiles) {
          const bytes = await s3.readBytes(model, file.name)
          logs.push({ name: file.name, text: new TextDecoder().decode(bytes), time: file.time })
        }
        this.logs = logs
      } catch (err) {
        store.changeAlert(err)
      }
    },

    async downloadLogs() {
      const userStore = useUserStore()
      const bucket = userStore.model
      await s3.downloadFolder(bucket, userStore.scenario + '/logs/', 'logs.zip')
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
        res.push({ path: name, content: null })
      }
      if (res.length > 0) {
        // load new Results
        // delete outputs
        const store = useIndexStore()
        store.loadOtherFiles(res)
      }
    },

    async getSteps () {
      const userStore = useUserStore()
      const store = useIndexStore()

      try {
        let data = { stateMachineArn: this.stateMachineArnBase + userStore.model }
        const response = await quetzalClient.client.post('/model/describe',
          data = JSON.stringify(data))
        const def = JSON.parse(response.data.definition)

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

        const steps = []
        let next = def.StartAt
        while (true) {
        // if there is a choice
          if (def.States[next].Type === 'Choice') {
            next = def.States[next].Next
          }
          if (def.States[next].Type === 'Parallel') {
            let branches = def.States[next].Branches.map(el => el.States).map(el => Object.keys(el))
            branches = branches[0].map((col, i) => branches.map(row => row[i]))
            for (const ptasks of branches) {
              steps.push({ name: ptasks.join(' | '), tasks: ptasks })
            }
          } else {
            steps.push({ name: next, tasks: [next] })
          }
          if (def.States[next].Next === undefined) break
          next = def.States[next].Next
        }
        this.setSteps(steps)
      } catch (err) {
        store.changeAlert(err)
      }
      this.checkLogs()
    },

    async GetRunningExecution() {
      // get Running model (on another pc start polling it if there is one)
      // return true if there is a model running (usefull to check before running.)
      try {
        const userStore = useUserStore()
        const stateMachineArn = this.stateMachineArnBase + userStore.model
        const scen = userStore.scenario
        if (!this.running) {
          const resp = await quetzalClient.client.post(`model/running/${stateMachineArn}/${scen}/`)
          if (resp.data !== '') {
            this.initExecution()
            this.executionArn = resp.data
            this.getHistory()
            this.pollExecution()
            return true
          } else { return false }
        } else { return false }
      } catch (err) { return false }
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
      quetzalClient.client.post('/model/start',
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
      const intervalId = setInterval(async () => {
        let data = { executionArn: this.executionArn }
        quetzalClient.client.post('/execution/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.status = response.data.status
            console.log(this.status)
            if (this.status === 'SUCCEEDED') {
              this.getOutputs().then(
                () => {
                  this.succeedExecution()
                  clearInterval(intervalId)
                },
              ).catch(err => alert(err))
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.status)) {
              try {
                this.terminateExecution(JSON.parse(response.data.cause))
              } catch (err) {
                this.terminateExecution({ error: response.data.cause })
              }

              clearInterval(intervalId)
            } else if (this.status === undefined) {
              clearInterval(intervalId)
            }
          }).catch(
          err => {
            console.log(err)
            clearInterval(intervalId)
            const store = useIndexStore()
            store.changeAlert(err)
            this.running = false
          })
        this.getHistory()
      }, 5000)
    },

    async getHistory () {
      try {
        let data = { executionArn: this.executionArn, includeExecutionData: false, reverseOrder: true }
        const response = await quetzalClient.client.post('/execution/history', data = JSON.stringify(data))
        const arr = []
        for (const event of response.data.events) {
          if (['TaskStateEntered'].includes(event.type)) {
            arr.push(event.stateEnteredEventDetails.name)
          }
        }
        this.updateCurrentStep(arr)
      } catch (err) { console.log(err) }
    },

    stopExecution () {
      let data = { executionArn: this.executionArn }
      quetzalClient.client.post('/execution/abort',
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

    changeEndSignal(payload) {
      this.endSignal = payload
    },

    playAudio() {
      if (this.endSignal) {
        const audio = new Audio(audioFile)
        audio.play()
        // Stop the audio after 2 seconds
        setTimeout(function () {
          audio.pause()
          audio.currentTime = 0
        }, 5000)
      }
    },
  },
  getters: {
    parametersIsEmpty: (state) => state.parameters.length === 0,
    availableModels: (state) => new Set(state.parameters.map(param => param.model)),

  },
})
