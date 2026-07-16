import { useIndexStore } from '@src/store/index'
import { ref } from 'vue'
import { useClient } from '@src/axiosClient.js'
import { ErrorMessage, RunPayload, Status } from '@src/types/api'
const { quetzalClient } = useClient()

const baseStatus = (): Status => { return {
  status: 'UNKNOWN',
  step_status: undefined,
} }

export function useAPI () {
  const status = ref<Status>(baseStatus())
  const running = ref<boolean>(false)
  const executionArn = ref<string>('')
  const error = ref<boolean>(false)
  const errorMessage = ref<ErrorMessage>({})
  const timer = ref<number>(0)
  const pollFreq: number = 4000

  function cleanRun () {
    status.value = baseStatus()
    running.value = false
    executionArn.value = ''
    error.value = false
    errorMessage.value = {}
    timer.value = 0
  }

  function terminateExecution (payload: string | boolean) {
    running.value = false
    error.value = true
    timer.value = 0
    executionArn.value = ''
    if (typeof payload === 'boolean') return

    try {
      errorMessage.value = JSON.parse(payload)
    } catch {
      errorMessage.value = { error: payload }
    }
  }

  function succeedExecution () {
    running.value = false
    executionArn.value = ''
  }

  // todo: runinputs or some Dict with callId.
  // type InputWithCallID = (OSMImporterParams) & { callID: string }
  // type Input = RunInputs | InputWithCallID

  async function startExecution (input: RunPayload) {
    running.value = true
    error.value = false
    const functionName = input.function_name
    const scenario = input.scenario_path

    try {
      const response = await quetzalClient.post<string>('run/', input)
      executionArn.value = response.data
      pollExecution(functionName, scenario)
    } catch (err: unknown) {
      const store = useIndexStore()
      store.changeAlert(err)
      running.value = false
      status.value.status = 'FAILED'
    }
  }

  function pollExecution (functionName: string, scenario: string) {
    const intervalId = setInterval(async () => {
      timer.value = timer.value - pollFreq / 1000
      try {
        const url = `/run/${functionName}/job_id/${executionArn.value}/scenario/${scenario}`
        const response = await quetzalClient.get<Status>(url)
        status.value = response.data
        console.log(status.value)
        if (status.value.status === 'SUCCESS') {
          succeedExecution()
          clearInterval(intervalId)
        } else if (['FAILED'].includes(status.value.status)) {
          clearInterval(intervalId)
          // response.data.cause
          terminateExecution(status.value.step_status?.error || '')
        }
      } catch (err: unknown) {
        const store = useIndexStore()
        store.changeAlert(err)
      }
    }, pollFreq)
  }

  async function stopExecution (functionName: string) {
    try {
      await quetzalClient.post<boolean>(`/run/${functionName}/job_id/${executionArn.value}/stop`)
    } catch (err: unknown) {
      const store = useIndexStore()
      store.changeAlert(err)
    }
  }

  async function getRunningExecution(functionName: string, scenario: string) {
    // get Running model (on another pc start polling it if there is one)
    // return true if there is a model running (usefull to check before running.)
    try {
      if (!running.value) {
        const resp = await quetzalClient.get(`run/${functionName}/scenario/${scenario}/`)
        if (resp.data !== '') {
          cleanRun()
          executionArn.value = resp.data
          status.value.status = 'RUNNING'
          running.value = true
          pollExecution(functionName, scenario)
          return true
        } else { return false }
      } else { return false }
    } catch { return false }
  }

  async function getFunctionTag(functionName: string) {
    const resp = await quetzalClient.get(`run/${functionName}/tag`)
    return resp.data
  }

  async function getStepsDefinition(functionName: string) {
    const resp = await quetzalClient.get(`run/${functionName}/steps/default`)
    return resp.data
  }

  return {
    running,
    error,
    status,
    errorMessage,
    timer,
    startExecution,
    cleanRun,
    stopExecution,
    pollExecution,
    getRunningExecution,
    getFunctionTag,
    getStepsDefinition,

  }
}
