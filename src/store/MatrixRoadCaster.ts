import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import s3 from '@src/AWSClient'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'
import { useAPI } from '../composables/APIComposable'
import { useGettext } from 'vue3-gettext'
import { MatrixRoadCasterParams } from '@src/types/typesStore'
import { FormData } from '@src/types/components'

export const useMRCStore = defineStore('runMRC', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-matrixroadcaster-api')
  const bucket = ref('quetzal-api-bucket')
  const callID = ref('')
  function setCallID() {
    callID.value = uuid()
    parameters.value.callID = callID.value
  }

  const { error, running, errorMessage, status, timer,
    startExecution, stopExecution, cleanRun } = useAPI(stateMachineArn.value)

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

  const parameters = ref<MatrixRoadCasterParams>({
    callID: '',
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
  })
  const zoneFile = ref('')

  function saveParams (payload: FormData[]) {
    payload.forEach(param => saveParam(param)) }

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
      name = 'outputs/' + name
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
    startExecution,
    stopExecution,
    cleanRun,
    parameters,
    zoneFile,
    saveParams,
    saveParam,
  }
})
