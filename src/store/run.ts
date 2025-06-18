import { defineStore, acceptHMRUpdate } from 'pinia'

import { paramsSerializer } from '@src/utils/serializer'
import s3 from '@src/AWSClient'
import { useIndexStore } from './index'
import { useUserStore } from './user'
import { useClient } from '@src/axiosClient.js'
const { quetzalClient } = useClient()
import { computed, ref, toRaw, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import { CategoryParam, Params, ParamsInfo, ParamsVariants, RunLog, Step } from '@src/types/typesStore'
import { StepFunctionDefinition } from '@src/types/stepFunction'
import { useGettext } from 'vue3-gettext'
import { RunInputs } from '@src/types/api'
import { includesOrEqual } from '@src/utils/utils'

export const useRunStore = defineStore('runStore', () => {
  const { $gettext } = useGettext()
  const userStore = useUserStore()
  const model = computed(() => userStore.model)
  const stateMachineArn = computed(() => `arn:aws:states:ca-central-1:142023388927:stateMachine:${model.value}`)
  const modelTag = ref<string>('')
  const avalaibleStepFunctions = ref<string[]>(['default'])
  const selectedStepFunction = ref<string>('default') // default or comparision,

  const currentStep = ref<number>(0)
  const steps = ref<Step[]>([{ name: 'Loading Steps...', tasks: ['Loading Steps...'] }])

  const parameters = ref<Params>([])

  const hasLogs = ref<boolean>(false)
  const logs = ref<RunLog[]>([])

  const { error, errorMessage, status, history,
    startExecution, stopExecution, cleanRun: clean, getRunningExecution } = useAPI({ withHistory: true })

  function cleanRun() {
    currentStep.value = 0
    clean()
  }

  // get model_tag

  async function getModelTag() {
    const response = await quetzalClient.get(`/model/version/${model.value}/`)
    modelTag.value = response.data
  }

  // Steps

  async function getSteps () {
    const store = useIndexStore()
    try {
      let data = { stateMachineArn: stateMachineArn.value }
      const response = await quetzalClient.post('/describe/model', JSON.stringify(data))
      const def = JSON.parse(response.data.definition) as StepFunctionDefinition

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
      function flattenDef(def: StepFunctionDefinition) {
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
          } else if (state.Type === 'Map') {
            const mapSteps = flattenDef(state.Iterator)
            mapSteps.forEach(el => el.name = `${el.name} (parallel)`)
            stepsArr.push(...mapSteps)
          }
          else if (state.Type === 'Task') {
            stepsArr.push({ name: key, tasks: [key] })
          }
          // add Map Here
          if (state.Next === undefined) break
          key = state.Next
        }
        return stepsArr
      }
      const stepsArr = flattenDef(def)
      // set steps. add saving and loading Step
      steps.value = stepsArr
      steps.value.splice(0, 0, { name: 'Saving Networks', tasks: ['Saving Networks'] })
      steps.value.push({ name: 'Loading Results', tasks: ['Loading Results'] })
    } catch (err) {
      store.changeAlert(err)
    }
    checkLogs()
  }

  // on polling. Get current step
  watch(history, (arr) => updateCurrentStep(arr))

  function updateCurrentStep (payload: string[]) {
    // payload contain an order list of all step. first one current. all other one are done (or parallel)
    const step = payload[0]
    const stepNames = steps.value.map(a => a.tasks) // for parallel tasks. we have a list for a step.
    const index = stepNames.map(task => task.includes(step)).indexOf(true)
    currentStep.value = index + 1
  }

  // start a simulation

  const running = computed(() => ['RUNNING', 'SUCCEEDED'].includes(status.value))

  function initExecution () {
    error.value = false
    status.value = 'RUNNING'
    currentStep.value = 1
  }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      currentStep.value = steps.value.length + 1 // put to last step (download results)
      getOutputs()
      checkLogs()
      // playAudio()
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
      status.value = 'FINISHED'
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

    const selectedVariants = variants.value?.variants || []

    const inputs: RunInputs = {
      authorization: userStore.idToken,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      scenario_path_S3: userStore.scenario + '/',
      variants: selectedVariants,
      choice: selectedStepFunction.value,
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

  // check if already running from another computer
  const scenario = computed(() => userStore.scenario)
  async function checkRunningExecution() {
    if (scenario.value) {
      return await getRunningExecution(stateMachineArn.value, scenario.value)
    } else return false
  }

  async function getOutputs () {
    const userStore = useUserStore()
    const store = useIndexStore()
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
      store.loadOtherFiles(res)
    }
    const info = await s3.readInfo(model, scen)
    store.projectInfo.model_tag = info.model_tag
  }

  // parameters

  const parametersIsEmpty = computed(() => parameters.value.length === 0)

  const availableModels = computed(() => new Set(parameters.value.flatMap(param => param.model)))

  const filteredParameters = computed(() => {
    return parameters.value.filter(param =>
      (Object.keys(param).includes('category')
      && includesOrEqual(param.model, selectedStepFunction.value))) as CategoryParam[]
  })

  const selectedInfo = computed(() => {
    let infoArr = parameters.value.filter(param =>
      (Object.keys(param).includes('info')
      && !Object.keys(param).includes('category')
      && includesOrEqual(param.model, selectedStepFunction.value))) as ParamsInfo[]
    return infoArr[0]?.info
  })

  const variants = computed(() => {
    let paramVariants = parameters.value.filter(param =>
      (Object.keys(param).includes('variants')
      && includesOrEqual(param.model, selectedStepFunction.value)))[0] as ParamsVariants | undefined
    return paramVariants
  })

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
      logs.value = await s3.getSimulationLogs(model, userStore.scenario) as RunLog[]
    } catch (err) {
      store.changeAlert(err)
    }
  }

  async function downloadLogs() {
    const userStore = useUserStore()
    const bucket = userStore.model
    await s3.downloadFolder(bucket, userStore.scenario + '/logs/', 'logs.zip')
  }

  return {
    selectedStepFunction,
    avalaibleStepFunctions,
    modelTag,
    currentStep,
    parameters,
    hasLogs,
    steps,
    logs,
    availableModels,
    parametersIsEmpty,
    filteredParameters,
    selectedInfo,
    variants,
    start,
    initExecution,
    loadParameters,
    resetParameters,
    getLogs,
    downloadLogs,
    getOutputs,
    getModelTag,
    getSteps,
    checkRunningExecution,
    error,
    running,
    errorMessage,
    status,
    startExecution,
    stopExecution,
    cleanRun,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRunStore, import.meta.hot))
}
