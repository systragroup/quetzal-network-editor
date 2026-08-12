import { computed, ref } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useClient } from '@src/axiosClient.js'
import { ErrorMessage, Infra, PollPayload, RunPayload, RunPayloadWithMetaData, Status, StopPayload } from '@src/types/api'
const { quetzalClient } = useClient()

const baseStatus = (): Status => { return {
  status: 'UNKNOWN',
  step_status: undefined,
} }

export function useAPI () {
  const infra = ref<Infra>('lambda')
  const status = ref<Status>(baseStatus())
  const jobId = ref<string>('')
  const error = ref<boolean>(false)
  const errorMessage = ref<ErrorMessage>({})
  const timer = ref<number>(0)
  const pollFreq: number = 4000

  const running = computed(() => ['PREPARING', 'RUNNING', 'STOPPING'].includes(status.value.status))

  function cleanRun () {
    status.value = baseStatus()
    jobId.value = ''
    error.value = false
    errorMessage.value = {}
    timer.value = 0
  }

  function terminateExecution (payload: string | boolean) {
    error.value = true
    timer.value = 0
    jobId.value = ''
    if (typeof payload === 'boolean') return

    try {
      errorMessage.value = JSON.parse(payload)
    } catch {
      errorMessage.value = { error: payload }
    }
  }

  function succeedExecution () {
    jobId.value = ''
  }
  function initExecution () {
    error.value = false
    status.value.status = 'PREPARING'
  }

  async function startExecution (functionName: string, payload: RunPayload) {
    const userStore = useUserStore()
    error.value = false
    const scenario = payload.scenario_path
    const input: RunPayloadWithMetaData = {
      ...payload,
      metadata: { user_email: userStore.cognitoInfo?.email },
    }

    try {
      const response = await quetzalClient.post<string>(`run/${functionName}/${infra.value}`, input)
      jobId.value = response.data
      pollExecution(functionName, scenario)
    } catch (err: unknown) {
      const store = useIndexStore()
      store.changeAlert(err)
      status.value.status = 'FAILED'
    }
  }

  function pollExecution (functionName: string, scenario: string) {
    const intervalId = setInterval(async () => {
      timer.value = timer.value - pollFreq / 1000
      try {
        const payload: PollPayload = {
          scenario_path: scenario,
          job_id: jobId.value,
        }
        const response = await quetzalClient.post<Status>(`run/${functionName}/${infra.value}/status`, payload)
        status.value = response.data
        console.log(status.value.status)
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
      const payload: StopPayload = { job_id: jobId.value }
      await quetzalClient.post<boolean>(`run/${functionName}/${infra.value}/stop`, payload)
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
        const scen = scenario.replace(/\/+$/, '') // make sure there is no trailling slash
        const resp = await quetzalClient.get(`run/${functionName}/${infra.value}/job_id/${scen}`)
        if (resp.data !== '') {
          cleanRun()
          jobId.value = resp.data
          status.value.status = 'RUNNING'
          pollExecution(functionName, scenario)
          return true
        } else { return false }
      } else { return false }
    } catch { return false }
  }

  async function getFunctionInfra(functionName: string) {
    const resp = await quetzalClient.get(`/run/${functionName}/infra`)
    infra.value = resp.data
  }

  async function getFunctionTag(functionName: string) {
    const resp = await quetzalClient.get(`run/${functionName}/${infra.value}/tag`)
    return resp.data
  }

  async function getStepsDefinition(functionName: string) {
    const resp = await quetzalClient.get(`run/${functionName}/${infra.value}/steps`)
    return resp.data
  }

  return {
    running,
    error,
    status,
    errorMessage,
    timer,
    initExecution,
    startExecution,
    cleanRun,
    stopExecution,
    pollExecution,
    getRunningExecution,
    getFunctionTag,
    getStepsDefinition,
    getFunctionInfra,

  }
}
