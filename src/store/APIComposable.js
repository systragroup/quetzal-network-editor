import { useIndexStore } from '@src/store/index'
import { quetzalClient } from '@src/axiosClient.js'
import { ref } from 'vue'

export function useAPI (arn) {
  const stateMachineArn = ref(arn)
  const status = ref('')
  const running = ref(false)
  const executionArn = ref('')
  const error = ref(false)
  const errorMessage = ref('')

  function cleanRun () {
    running.value = false
    executionArn.value = ''
    error.value = false
  }
  function terminateExecution (payload) {
    running.value = false
    error.value = true
    errorMessage.value = payload
    executionArn.value = ''
  }

  function succeedExecution (message) {
    running.value = false
    executionArn.value = ''
    const store = useIndexStore()
    store.changeNotification(
      { text: message, autoClose: false, color: 'success' })
  }

  async function startExecution (input) {
    running.value = true
    error.value = false
    let data = {
      input: JSON.stringify(input),
      stateMachineArn: stateMachineArn.value,
    }

    try {
      const response = await quetzalClient.client.post('', data = JSON.stringify(data))
      executionArn.value = response.data.executionArn
      pollExecution()
    } catch (err) {
      const store = useIndexStore()
      store.changeAlert(err)
      running.value = false
      status.value = 'FAILED'
    }
  }

  function pollExecution () {
    const intervalId = setInterval(async () => {
      let data = { executionArn: executionArn.value }
      // this.timer = this.timer - 4
      try {
        const response = await quetzalClient.client.post('/describe', data = JSON.stringify(data))
        status.value = response.data.status
        console.log(status.value)
        if (status.value === 'SUCCEEDED') {
          succeedExecution()
          clearInterval(intervalId)
        } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(status.value)) {
          terminateExecution(JSON.parse(response.data.cause))
          clearInterval(intervalId)
        }
      } catch (err) {
        const store = useIndexStore()
        store.changeAlert(err)
      }
    }, 4000)
  }

  async function stopExecution () {
    let data = { executionArn: executionArn.value }
    try {
      const response = await quetzalClient.client.post('/abort', data = JSON.stringify(data))
      terminateExecution(response.data)
    } catch (err) {
      const store = useIndexStore()
      store.changeAlert(err)
    }
  }

  return {
    running,
    error,
    status,
    errorMessage,
    startExecution,
    cleanRun,
    stopExecution,
  }
}