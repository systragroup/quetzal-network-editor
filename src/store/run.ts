import { defineStore } from 'pinia'

import { paramsSerializer } from '@src/utils/serializer'
import s3 from '@src/AWSClient'
import { useIndexStore } from './index'
import { useUserStore } from './user'
// import audioFile from '@static/samsung-washing-machine-melody-made-with-Voicemod-technology.mp3'
import { useClient } from '@src/axiosClient.js'
const { quetzalClient } = useClient()
import { computed, ref, toRaw, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import { CategoryParam, Params, RunLog, Step } from '@src/types/typesStore'
import { StepFunctionDefinition } from '@src/types/stepFunction'
import { useGettext } from 'vue3-gettext'
import { RunInputs } from '@src/types/api'
import { includesOrEqual } from '@src/utils/utils'

export const useRunStore = defineStore('runStore', () => {
  const { $gettext } = useGettext()

  const userStore = useUserStore()
  const model = computed(() => userStore.model)
  const stateMachineArn = computed(() => `arn:aws:states:ca-central-1:142023388927:stateMachine:${model.value}`)
  const steps = ref<Step[]>([{ name: 'Loading Steps...', tasks: ['Loading Steps...'] }])
  const selectedStepFunction = ref<string>('default') // default or comparision,
  const avalaibleStepFunctions = ref<string[]>(['default'])
  const executionArn = ref<string>('')
  const currentStep = ref<number>(0)
  const parameters = ref<Params>([])
  const hasLogs = ref<boolean>(false)
  const logs = ref<RunLog[]>([])
  const endSignal = ref<boolean>(true)

  const { error, running, errorMessage, status, history,
    startExecution, stopExecution, cleanRun, pollExecution, getHistory } = useAPI({ withHistory: true })

  watch(history, (arr) => updateCurrentStep(arr))

  function updateCurrentStep (payload: string[]) {
    // payload contain an order list of all step. first one current. all other one are done (or parallel)
    const step = payload[0]
    const stepNames = steps.value.map(a => a.tasks) // for parallel tasks. we have a list for a step.
    const index = stepNames.map(task => task.includes(step)).indexOf(true)
    currentStep.value = index + 1
    console.log(currentStep.value)
  }

  function initExecution () {
    error.value = false
    running.value = true
    currentStep.value = 1
  }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      currentStep.value = steps.value.length + 1 // put to last step (download results)
      getOutputs()
      checkLogs()
      // playAudio()
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
      running.value = false
    }
  })

  function start() {
    const userStore = useUserStore()
    // from filteredParams (selected model). create a nested dict {catName: {paramName: value} }
    const paramsDict = filteredParameters.value.reduce((acc: Record<string, Record<string, any>>, category) => {
      const cat = category.category
      acc[cat] = category.params.reduce((paramAcc: Record<string, any>, param) => {
        paramAcc[param.name] = toRaw(param.value)
        return paramAcc
      }, {})
      return acc
    }, {})

    const inputs: RunInputs = {
      authorization: userStore.idToken,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      scenario_path_S3: userStore.scenario + '/',
      variants: ['AM', 'PM'],
      launcher_arg: {
        training_folder: '/tmp',
        params: paramsDict,
      },
      metadata: {
        user_email: userStore.cognitoInfo?.email,
      },
    }
    startExecution(stateMachineArn.value, inputs)
  }

  //
  // IO (parameters, outputs, StepsFunctionDefinition)
  //

  function loadParameters (payload: Params) {
    payload = paramsSerializer(payload)
    parameters.value = payload
  }

  async function resetParameters () {
    // only for the reset button.
    const store = useIndexStore()
    const userStore = useUserStore()
    try {
      const model = userStore.model
      const path = userStore.scenario + '/inputs/params.json'
      const params = await s3.readJson(model, path)
      parameters.value = params
    } catch (err) {
      store.changeAlert(err)
    }
  }

  async function getOutputs () {
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
  }

  async function getSteps () {
    const store = useIndexStore()
    try {
      let data = { stateMachineArn: stateMachineArn.value }
      const response = await quetzalClient.post('/describe/model', JSON.stringify(data))
      const def = JSON.parse(response.data.definition) as StepFunctionDefinition
      console.log(def)

      // check if there is a choice in the definition => avalaibleStepFunctions
      Object.keys(def.States).forEach((key) => {
        if (def.States[key].Type === 'Choice') {
        // could be a list of choices
          avalaibleStepFunctions.value = ['default', ...def.States[key].Choices.map(el => el.StringEquals)]
          if (selectedStepFunction.value === 'default') {
            def.States[key].Next = def.States[key].Default
          } else {
            // if not default. select the one in the list
            const choices = def.States[key].Choices
            def.States[key].Next = choices.filter(el => el.StringEquals === selectedStepFunction.value)[0].Next
          }
        }
      })
      // if there is a choice

      const stepsArr: Step[] = []
      let key = def.StartAt
      while (true) {
      // if there is a choice
        let state = def.States[key]
        if (state.Type === 'Choice') {
          key = state.Next
          state = def.States[key]
        }
        if (state.Type === 'Parallel') {
          let branches = state.Branches.map(el => el.States).map(el => Object.keys(el))
          branches = branches[0].map((col, i) => branches.map(row => row[i]))
          for (const ptasks of branches) {
            stepsArr.push({ name: ptasks.join(' | '), tasks: ptasks })
          }
        } else if (state.Type === 'Task') {
          stepsArr.push({ name: key, tasks: [key] })
        }
        // add Map Here
        if (state.Next === undefined) break
        key = state.Next
      }
      // set steps. add saving and loading Step
      steps.value = stepsArr
      steps.value.splice(0, 0, { name: 'Saving Networks', tasks: ['Saving Networks'] })
      steps.value.push({ name: 'Loading Results', tasks: ['Loading Results'] })
    } catch (err) {
      store.changeAlert(err)
    }
    checkLogs()
  }

  // Check if its already running in the cloud

  async function getRunningExecution() {
    // get Running model (on another pc start polling it if there is one)
    // return true if there is a model running (usefull to check before running.)
    try {
      const userStore = useUserStore()
      const scen = userStore.scenario
      if (!running.value) {
        const resp = await quetzalClient.post(`model/running/${stateMachineArn.value}/${scen}/`)
        if (resp.data !== '') {
          initExecution()
          executionArn.value = resp.data
          getHistory()
          pollExecution()
          return true
        } else { return false }
      } else { return false }
    } catch { return false }
  }

  // Logs

  async function checkLogs() {
    const userStore = useUserStore()
    const model = userStore.model
    const logsFiles = await s3.listFiles(model, userStore.scenario + '/logs/')
    const filtered = logsFiles.filter(name => name.endsWith('.txt'))
    hasLogs.value = filtered.length > 0
  }

  async function getLogs () {
    // get logs in log/{logs}.txt
    const store = useIndexStore()
    const userStore = useUserStore()
    try {
      const model = userStore.model
      logs.value = await s3.getSimulationLogs(model, userStore.scenario)
    } catch (err) {
      store.changeAlert(err)
    }
  }

  async function downloadLogs() {
    const userStore = useUserStore()
    const bucket = userStore.model
    await s3.downloadFolder(bucket, userStore.scenario + '/logs/', 'logs.zip')
  }

  // audio

  function changeEndSignal(val: boolean) {
    endSignal.value = val
  }

  // function playAudio() {
  //   if (endSignal.value) {
  //     const audio = new Audio(audioFile)
  //     audio.play()
  //     // Stop the audio after 2 seconds
  //     setTimeout(function () {
  //       audio.pause()
  //       audio.currentTime = 0
  //     }, 5000)
  //   }
  // }

  const parametersIsEmpty = computed(() => parameters.value.length === 0)
  const availableModels = computed(() => new Set(parameters.value.flatMap(param => param.model)))

  const filteredParameters = computed(() => {
    return parameters.value.filter(param =>
      (Object.keys(param).includes('category')
      && includesOrEqual(param.model, selectedStepFunction.value))) as CategoryParam[]
  })

  return {
    stateMachineArn,
    selectedStepFunction,
    avalaibleStepFunctions,
    executionArn,
    currentStep,
    parameters,
    hasLogs,
    steps,
    logs,
    endSignal,
    availableModels,
    parametersIsEmpty,
    filteredParameters,
    start,
    initExecution,
    changeEndSignal,
    loadParameters,
    resetParameters,
    getLogs,
    downloadLogs,
    getOutputs,
    getSteps,
    getRunningExecution,
    error,
    running,
    errorMessage,
    status,
    startExecution,
    stopExecution,
    cleanRun,

  }
})
