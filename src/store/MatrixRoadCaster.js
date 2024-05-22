import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAPI } from './APIComposable'

export const useMRCStore = defineStore('runMRC', () => {
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-matrixroadcaster-api')
  const bucket = ref('quetzal-api-bucket')
  const callID = ref('')
  function setCallID() { callID.value = uuid() }

  const { error, running, errorMessage, status, timer,
    startExecution, stopExecution, cleanRun } = useAPI(stateMachineArn.value)

  const parameters = ref({
    callID: '',
    num_zones: 100,
    train_size: 100,
    date_time: '2022-12-13T08:00:21-04:00',
    ff_time_col: 'time',
    max_speed: 100,
    num_cores: 1,
    num_random_od: 1,
    use_zone: false,
    hereApiKey: '',
  })
  const zoneFile = ref('')

  function setParameters (payload) { parameters.value = payload }

  return {
    stateMachineArn,
    bucket,
    callID,
    setCallID,
    error,
    running,
    errorMessage,
    status,
    timer,
    startExecution,
    stopExecution,
    cleanRun,
    parameters,
    zoneFile,
    setParameters,
  }
})
