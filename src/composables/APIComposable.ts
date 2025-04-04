import { useIndexStore } from '@src/store/index'
import { ref } from 'vue'
import { useClient } from '@src/axiosClient.js'
import { ErrorMessage, RunInputs, RunPayload, Status } from '@src/types/api'
import { MatrixRoadCasterParams } from '@src/types/typesStore'
const { quetzalClient } = useClient()

export function useAPI () {
  const status = ref<Status>('')
  const running = ref<boolean>(false)
  const executionArn = ref<string>('')
  const error = ref<boolean>(false)
  const errorMessage = ref<ErrorMessage>({})
  const pollFreq: number = 4000
  const timer = ref<number>(0)

  function cleanRun () {
    running.value = false
    executionArn.value = ''
    error.value = false
  }
  function terminateExecution (payload: string) {
    running.value = false
    error.value = true
    timer.value = 0
    try {
      errorMessage.value = JSON.parse(payload)
    } catch {
      errorMessage.value = { error: payload }
    }
    executionArn.value = ''
  }

  function succeedExecution () {
    running.value = false
    executionArn.value = ''
  }

  async function startExecution (stateMachineArn: string, input: RunInputs | MatrixRoadCasterParams) {
    running.value = true
    error.value = false
    const data: RunPayload = {
      input: JSON.stringify(input),
      stateMachineArn: stateMachineArn,
    }

    try {
      const response = await quetzalClient.post('', data)
      executionArn.value = response.data.executionArn
      pollExecution()
    } catch (err: unknown) {
      const store = useIndexStore()
      store.changeAlert(err)
      running.value = false
      status.value = 'FAILED'
    }
  }

  function pollExecution () {
    const intervalId = setInterval(async () => {
      let data = { executionArn: executionArn.value }
      timer.value = timer.value - pollFreq / 1000
      try {
        const response = await quetzalClient.post('/describe', data)
        status.value = response.data.status
        console.log(status.value)
        if (status.value === 'SUCCEEDED') {
          succeedExecution()
          clearInterval(intervalId)
        } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(status.value)) {
          clearInterval(intervalId)
          terminateExecution(response.data.cause)
        }
        else if (status.value !== 'RUNNING') {
          clearInterval(intervalId)
        }
      } catch (err: unknown) {
        const store = useIndexStore()
        store.changeAlert(err)
      }
    }, pollFreq)
  }

  async function stopExecution () {
    let data = { executionArn: executionArn.value }
    try {
      const response = await quetzalClient.post('/abort', data)
      terminateExecution(response.data)
    } catch (err: unknown) {
      const store = useIndexStore()
      store.changeAlert(err)
    }
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
  }
}
