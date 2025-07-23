import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import s3 from '@src/AWSClient'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'
import { useAPI } from '../composables/APIComposable'
import { useGettext } from 'vue3-gettext'
import { MatrixRoadCasterParams, MicroserviceParametersDTO } from '@src/types/typesStore'
import { FormData } from '@src/types/components'
import { cloneDeep } from 'lodash'
const MICROSERVICES_BUCKET = import.meta.env.VITE_MICROSERVICES_BUCKET
const MATRIXROADCASTER_ARN = import.meta.env.VITE_MATRIXROADCASTER_ARN
const VERSION = 0
const NAME = 'matrixroadcaster'

function baseParameters(): MatrixRoadCasterParams {
  return {
    api: 'google',
    num_zones: 100,
    train_size: 100,
    date_time: '2024-12-13T08:00:00-04:00',
    ff_time_col: 'time',
    max_speed: 100,
    num_cores: 1,
    num_random_od: 1,
    use_zone: false,
    hereApiKey: '',
  }
}

export const useMRCStore = defineStore('runMRC', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref(MATRIXROADCASTER_ARN)
  const bucket = ref(MICROSERVICES_BUCKET)

  const callID = ref('')
  const parameters = ref<MatrixRoadCasterParams>(baseParameters())
  const zoneFile = ref('')

  const { error, running, errorMessage, status, timer,
    startExecution, stopExecution, cleanRun } = useAPI()

  function reset() {
    callID.value = ''
    zoneFile.value = ''
    parameters.value = baseParameters()
    cleanRun()
  }

  function loadParams(payload: MicroserviceParametersDTO<MatrixRoadCasterParams>) {
    // TODO: migration
    parameters.value = payload.parameters
  }

  function exportParams() {
    const params = cloneDeep(parameters.value)
    params.apiKey = ''
    const payload: MicroserviceParametersDTO<MatrixRoadCasterParams> = {
      version: VERSION,
      name: NAME,
      parameters: params,
    }
    const store = useIndexStore()
    store.addMicroservicesParameters(payload)
  }

  function start(inputs: MatrixRoadCasterParams & { callID: string }) {
    exportParams()
    startExecution(stateMachineArn.value, inputs)
  }

  function setCallID() { callID.value = uuid() }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await ApplyResults()
      await getOutputs()
      running.value = false
      status.value = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('Road network successfully calibrated. See results images pages for more details.'),
          autoClose: false, color: 'success' })
    }
  })

  function saveParams (payload: FormData[]) {
    payload.forEach(param => parameters.value[param.key] = param.value)
  }

  function saveParam(payload: FormData) {
    parameters.value[payload.key] = payload.value
  }

  async function ApplyResults () {
    const rlinksStore = userLinksStore()
    rlinksStore.$reset()
    const rlinks = await s3.readJson(bucket.value, callID.value.concat('/road_links.geojson'))
    const rnodes = await s3.readJson(bucket.value, callID.value.concat('/road_nodes.geojson'))
    rlinksStore.loadRoadFiles([
      { path: 'inputs/road/links.geojson', content: rlinks },
      { path: 'inputs/road/nodes.geojson', content: rnodes },
    ])
  }

  async function getOutputs() {
    let filesList = await s3.listFiles(bucket.value, callID.value)
    filesList = filesList.filter(name => name.endsWith('.png'))
    const res = []
    for (const file of filesList) {
      let name = file.split('/').slice(-1)
      name = `microservices/${NAME}/${name}`
      const content = await s3.readBytes(bucket.value, file)
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
    setCallID,
    error,
    running,
    errorMessage,
    status,
    timer,
    start,
    stopExecution,
    reset,
    parameters,
    zoneFile,
    saveParams,
    saveParam,
    loadParams,
  }
})
