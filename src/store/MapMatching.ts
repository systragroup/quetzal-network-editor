/* eslint-disable @typescript-eslint/naming-convention */
import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import s3 from '@src/AWSClient'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
import { userLinksStore } from './rlinks'
import { MapMatchingParams } from '@src/types/typesStore'
import { FormData } from '@src/types/components'

export const useMapMatchingStore = defineStore('runMapMatching', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref<string>('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-mapmatching-api')
  const bucket = ref<string>('quetzal-api-bucket')
  const callID = ref<string>('')
  function setCallID() { callID.value = uuid() }
  const timer = ref<number>(0)

  const { error, running, errorMessage, startExecution, status, stopExecution } = useAPI(stateMachineArn.value)

  const parameters = ref<MapMatchingParams>({
    SIGMA: 4.02,
    BETA: 3,
    POWER: 2,
    DIFF: true,
    ptMetrics: true,
    keepTime: true,
    exclusions: [],
  })

  function saveParams (payload: FormData[]) {
    payload.forEach(param => parameters.value[param.key] = param.value) }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await ApplyResults()
      await getCSVs()
      running.value = false
      status.value = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('PT network successfully Mapmatched. See results pages for more details.'),
          autoClose: false, color: 'success' })
    }
  })

  async function ApplyResults () {
    const linksStore = useLinksStore()
    linksStore.$reset()
    const links = await s3.readJson(bucket.value, callID.value.concat('/links_final.geojson'))
    const nodes = await s3.readJson(bucket.value, callID.value.concat('/nodes_final.geojson'))
    linksStore.loadPTFiles([
      { path: 'inputs/pt/links.geojson', content: links },
      { path: 'inputs/pt/nodes.geojson', content: nodes },
    ], 'local')
    if (parameters.value.ptMetrics) {
      const rlinksStore = userLinksStore()
      rlinksStore.$reset()
      const rlinks = await s3.readJson(bucket.value, callID.value.concat('/road_links.geojson'))
      const rnodes = await s3.readJson(bucket.value, callID.value.concat('/road_nodes.geojson'))
      rlinksStore.loadRoadFiles([
        { path: 'inputs/road/links.geojson', content: rlinks },
        { path: 'inputs/road/nodes.geojson', content: rnodes },
      ])
    }
  }

  async function getCSVs() {
    let filesList = await s3.listFiles(bucket.value, callID.value)
    filesList = filesList.filter(name => name.endsWith('.csv'))
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
    getCSVs,
  }
})
