/* eslint-disable @typescript-eslint/naming-convention */
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { MicroserviceParametersDTO, WildTurkeyParams } from '@src/types/typesStore'
import { FormData } from '@src/types/components'
import { RunInputs } from '@src/types/api'
const MICROSERVICES_BUCKET = import.meta.env.VITE_MICROSERVICES_BUCKET
const FUNCTION_ARN = import.meta.env.VITE_WILDTURKEY_ARN
const VERSION = 0
const NAME = 'wildturkey'

function baseParameters(): WildTurkeyParams {
  return {
    consumption: 1.8,
    max_energy: 1000,
    depot_lon: -73.5724,
    depot_lat: 45.5612,
    interlining: true,
  }
}

export const useWildTurkeyStore = defineStore('runWildTurkey', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref<string>(FUNCTION_ARN)
  const bucket = ref<string>(MICROSERVICES_BUCKET)

  const callID = ref<string>('')
  const timer = ref<number>(0)
  const parameters = ref<WildTurkeyParams>(baseParameters())

  const { error, running, errorMessage, startExecution, status, stopExecution, cleanRun } = useAPI()

  function reset() {
    callID.value = ''
    timer.value = 0
    parameters.value = baseParameters()
    cleanRun()
  }

  function setCallID() { callID.value = uuid() }

  function saveParams (payload: FormData[]) {
    payload.forEach(param => parameters.value[param.key] = param.value) }

  function loadParams(payload: MicroserviceParametersDTO<WildTurkeyParams>) {
    // TODO: migration
    parameters.value = payload.parameters
  }

  function exportParams() {
    const payload: MicroserviceParametersDTO<WildTurkeyParams> = {
      version: VERSION,
      name: NAME,
      parameters: parameters.value,
    }
    const store = useIndexStore()
    store.addMicroservicesParameters(payload)
  }

  function start(inputs: RunInputs) {
    exportParams()
    startExecution(stateMachineArn.value, inputs)
  }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await downloadResults()
      running.value = false
      status.value = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('success! See results pages for more details.'),
          autoClose: false, color: 'success' })
    }
  })

  async function downloadResults () {
    const store = useIndexStore()

    let outputs = await s3.listFiles(bucket.value, `${callID.value}/outputs/`)
    const res = []
    for (const file of outputs) {
      // get stuff after callId/outputs/ ==>  am/file.json or just file.json
      let name = file.split('/').slice(2).join('/')
      name = `microservices/${NAME}/${name}`
      const content = await s3.readBytes(bucket.value, file)
      res.push({ path: name, content: content })
    }

    if (res.length > 0) {
      // load new Results
      store.loadOtherFiles(res)
    }
  }

  return {
    stateMachineArn,
    bucket,
    callID,
    status,
    running,
    error,
    errorMessage,
    parameters,
    timer,
    saveParams,
    setCallID,
    start,
    stopExecution,
    reset,
    loadParams,
  }
})
