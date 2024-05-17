import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAPI } from './APIComposable'

export const useOSMStore = defineStore('runOSM', () => {
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-osm-api')
  const callID = ref('')

  const extendedCycleway = ref(false)
  const selectedHighway = ref([
    'motorway',
    'motorway_link',
    'trunk',
    'trunk_link',
    'primary',
    'primary_link',
  ])

  const { error, running, errorMessage, status,
    startExecution, stopExecution, cleanRun } = useAPI(stateMachineArn.value)

  function setCallID() { callID.value = uuid() }

  return {
    stateMachineArn,
    selectedHighway,
    extendedCycleway,
    callID,
    status,
    running,
    error,
    errorMessage,
    setCallID,
    startExecution,
    stopExecution,
    cleanRun,
  }
})
