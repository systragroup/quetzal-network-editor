import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAPI } from './APIComposable'

export const useMapMatchingStore = defineStore('runMapMatching', () => {
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-mapmatching-api')
  const callID = ref('')

  const exclusions = ref([])

  const { error, running, errorMessage, startExecution, status, stopExecution } = useAPI(stateMachineArn.value)

  function setCallID() { callID.value = uuid() }

  return {
    stateMachineArn,
    callID,
    exclusions,
    status,
    running,
    error,
    errorMessage,
    setCallID,
    startExecution,
    stopExecution,
  }
})
