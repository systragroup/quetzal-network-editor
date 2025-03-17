/* eslint-disable @typescript-eslint/naming-convention */
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { TransitParams } from '@src/types/typesStore'
import { FormData } from '@src/types/components'

export const useTransitStore = defineStore('runTransit', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref<string>('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-transit-api')
  const bucket = ref<string>('quetzal-api-bucket')
  const callID = ref<string>('')
  function setCallID() { callID.value = uuid() }
  const timer = ref<number>(0)
  const { error, running, errorMessage, startExecution, status, stopExecution } = useAPI(stateMachineArn.value)

  const parameters = ref<TransitParams>({
    catchment_radius: {},
    footpaths: {
      max_length: 1000,
      speed: 3,
      n_ntlegs: 2,
    },
  })

  interface SaveParams {
    footpaths: FormData[]
    catchment_radius: FormData[]
  }
  function saveParams (payload: SaveParams) {
    payload.footpaths.forEach(param => parameters.value.footpaths[param.key] = param.value)
    payload.catchment_radius.forEach(param => parameters.value.catchment_radius[param.key] = param.value)
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
    saveParams,
    setCallID,
    startExecution,
    stopExecution,
  }
})
