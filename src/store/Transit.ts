/* eslint-disable @typescript-eslint/naming-convention */
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { TransitParams } from '@src/types/typesStore'

function baseParameters(): TransitParams {
  return {
    general: {
      use_road_network: [{ value: false }],
      step_size: [{ value: 0.001 }],
    },
    catchment_radius: {},
    footpaths: {
      max_length: [{ value: 1000 }],
      speed: [{ value: 3 }],
      n_ntlegs: [{ value: 2 }],
    },
  }
}

export const useTransitStore = defineStore('runTransit', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref<string>('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-transit-api')
  const bucket = ref<string>('quetzal-api-bucket')

  const callID = ref<string>('')
  const timer = ref<number>(0)
  const parameters = ref<TransitParams>(baseParameters())

  const { error, running, errorMessage, startExecution, status, stopExecution, cleanRun } = useAPI()

  function reset() {
    callID.value = ''
    timer.value = 0
    parameters.value = baseParameters()
    cleanRun()
  }

  function setCallID() { callID.value = uuid() }

  function addCatchmentRadius(route_type: string) {
    parameters.value.catchment_radius[route_type] = [{ value: 1000 }]
  }

  function deleteCatchmentRadius(route_type: string) {
    delete parameters.value.catchment_radius[route_type]
  }

  function saveParams (payload: TransitParams) {
    parameters.value = payload
  }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await downloadResults()
      running.value = false
      status.value = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('Success. See results pages for more details.'),
          autoClose: false, color: 'success' })
    }
  })

  async function downloadResults () {
    let outputs = await s3.listFiles(bucket.value, `${callID.value}/outputs/`)
    const res = []
    for (const file of outputs) {
      let name = file.split('/').slice(-1)
      name = 'microservices/' + name
      let content = null
      if (name.endsWith('.geojson') || name.endsWith('.json')) {
        content = await s3.readJson(bucket.value, file)
      } else {
        content = await s3.readBytes(bucket.value, file)
      }
      res.push({ path: name, content: content })
    }
    if (res.length > 0) {
      // load new Results
      const store = useIndexStore()
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
    addCatchmentRadius,
    deleteCatchmentRadius,
    saveParams,
    setCallID,
    startExecution,
    stopExecution,
    reset,
  }
})
