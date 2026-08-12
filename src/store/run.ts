import { defineStore } from 'pinia'

import { paramsSerializer } from '@src/utils/serializer'
import s3 from '@src/AWSClient'
import { useIndexStore } from './index'
import { useUserStore } from './user'
import { computed, ref, toRaw, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import { CategoryParam, Params, ParamsInfo, ParamsVariants, RunLog, Step, StepPayload, StepsDefinition } from '@src/types/typesStore'
import { useGettext } from 'vue3-gettext'
import { RunPayload, StepStatus } from '@src/types/api'
import { includesOrEqual } from '@src/utils/utils'
import { cloneDeep } from 'lodash'

export const useRunStore = defineStore('runStore', () => {
  const { $gettext } = useGettext()
  const userStore = useUserStore()
  const model = computed(() => userStore.model!)
  const modelTag = ref<string>('')
  const avalaibleStepFunctions = ref<string[]>(['default'])
  const selectedStepFunction = ref<string>('default') // default or comparision,

  const stepsDefinition = ref<StepsDefinition>({})
  const steps = ref<Step[]>([])
  const currentStep = ref<number>(0)

  const stepsPayload = ref<StepPayload[]>([])

  const parameters = ref<Params>([])

  const hasLogs = ref<boolean>(false)
  const logs = ref<RunLog[]>([])

  const { error, errorMessage, status, running, startExecution, getFunctionInfra,
    stopExecution, cleanRun, getRunningExecution, getFunctionTag, getStepsDefinition } = useAPI()

  function reset() {
    modelTag.value = ''
    avalaibleStepFunctions.value = ['default']
    selectedStepFunction.value = 'default'
    stepsDefinition.value = {}
    steps.value = []
    currentStep.value = 0
    stepsPayload.value = []
    hasLogs.value = false
    logs.value = []
    parameters.value = []
    cleanRun()
  }

  async function getInfra() {
    await getFunctionInfra(model.value)
  }

  // get model_tag

  async function getModelTag() {
    modelTag.value = await getFunctionTag(model.value)
  }
  // Steps

  async function getSteps() {
    stepsDefinition.value = await getStepsDefinition(model.value)
    avalaibleStepFunctions.value = Object.keys(stepsDefinition.value)
    const selected = avalaibleStepFunctions.value.filter(name => availableModels.value.has(name))[0]
    selectedStepFunction.value = selected || 'default'
    setSteps()
  }

  async function loadModelSteps (payload: StepPayload[]) {
    // set steps. add saving and loading Step
    stepsPayload.value = payload
  }

  function setSteps() {
    steps.value = cloneDeep(stepsDefinition.value[selectedStepFunction.value])
    steps.value.splice(0, 0, { name: 'Saving Networks', tasks: ['Saving Networks'] })
    steps.value.push({ name: 'Loading Results', tasks: ['Loading Results'] })
  }

  // on polling. Get current step
  function updateCurrentStep (payload: StepStatus | undefined) {
    // payload contain an order list of all step. first one current. all other one are done (or parallel)
    if (!payload) return
    if (payload.step === '') return
    const stepNames = steps.value.map(a => a.tasks) // for parallel tasks. we have a list for a step.
    const index = stepNames.map(task => task.includes(payload.step)).indexOf(true)
    currentStep.value = index + 1
  }

  // start a simulation

  function initExecution () {
    error.value = false
    status.value.status = 'PREPARING'
    currentStep.value = 1
  }

  watch(status, async (val) => {
    updateCurrentStep(val.step_status)
    if (val.status === 'SUCCESS') {
      currentStep.value = steps.value.length + 1 // put to last step (download results)
      getOutputs()
      checkLogs()
      // playAudio()
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('simulation executed successfully!'), autoClose: false, color: 'success' })
      status.value.status = 'FINISHED'
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
    const filteredSteps = stepsPayload.value.filter(el => el.name === selectedStepFunction.value)[0]
    const selectedSteps = filteredSteps?.steps || undefined
    const inputs: RunPayload = {
      scenario_path: userStore.scenario + '/',
      steps: selectedSteps,
      variants: selectedVariants,
      choice: selectedStepFunction.value,
      params: paramsDict,

    }
    startExecution(model.value, inputs)
  }

  // check if already running from another computer
  const scenario = computed(() => userStore.scenario)
  async function checkRunningExecution() {
    if (scenario.value) {
      return await getRunningExecution(model.value, scenario.value)
    } else return false
  }

  async function getOutputs () {
    const userStore = useUserStore()
    const store = useIndexStore()
    const model = userStore.model
    const scen = userStore.scenario!
    const path = scen + '/outputs/'
    let filesList = await s3.listFiles(model, path)
    filesList = filesList.filter(name => !name.endsWith('/'))
    const res = []
    for (const file of filesList) {
      const name = file.slice(scen.length + 1) // remove scen name from file + 1 for '/'
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
    stepsPayload,
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
    loadModelSteps,
    checkRunningExecution,
    error,
    running,
    errorMessage,
    status,
    startExecution,
    stopExecution,
    reset,
    setSteps,
    getSteps,
    checkLogs,
    getInfra,
  }
})
