/* eslint-disable @typescript-eslint/naming-convention */
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import s3 from '@src/AWSClient'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { TransitParams, TransitParamsCategory } from '@src/types/typesStore'
import { VariantFormData } from '@src/types/components'

function baseParameters(): TransitParams[] {
  return [
    {
      category: 'general',
      key: 'use_road_network',
      value: false,
      variant: '',
    },
    {
      category: 'general',
      key: 'step_size',
      value: 0.001,
      variant: '',
    },
    {
      category: 'general',
      key: 'duration',
      value: 24 * 60,
      variant: '',
    },
    {
      category: 'footpaths',
      key: 'max_length',
      value: 1000,
      variant: '',
    },
    {
      category: 'footpaths',
      key: 'speed',
      value: 3,
      variant: '',
    },
    {
      category: 'footpaths',
      key: 'n_ntlegs',
      value: 2,
      variant: '',
    },
  ]
}

export const useTransitStore = defineStore('runTransit', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref<string>('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-transit-api')
  const bucket = ref<string>('quetzal-api-bucket')

  const callID = ref<string>('')
  const timer = ref<number>(0)
  const parameters = ref<TransitParams[]>(baseParameters())

  const { error, running, errorMessage, startExecution, status, stopExecution, cleanRun } = useAPI()

  function reset() {
    callID.value = ''
    timer.value = 0
    parameters.value = baseParameters()
    cleanRun()
  }

  function setCallID() { callID.value = uuid() }

  function addCatchmentRadius(route_type: string) {
    const param: TransitParams = {
      category: 'catchment_radius',
      key: route_type,
      value: 1000,
      variant: '',
    }
    parameters.value.push(param)
  }

  function deleteParam(category: TransitParamsCategory, key: string) {
    parameters.value = parameters.value.filter(p => !(p.key === key && p.category === category))
  }

  function deleteVariant(variant: string) {
    if (variant !== '') {
      parameters.value = parameters.value.filter(p => p.variant !== variant)
    }
  }

  function saveParams (payload: VariantFormData[]) {
    parameters.value = payload.map(param => {
      return {
        category: param.category,
        key: param.key,
        value: param.value,
        variant: param.variant,
      } as TransitParams
    })
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
    deleteParam,
    deleteVariant,
    saveParams,
    setCallID,
    startExecution,
    stopExecution,
    reset,
  }
})
