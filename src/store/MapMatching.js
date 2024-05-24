import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from './APIComposable'
import s3 from '@src/AWSClient'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'

export const useMapMatchingStore = defineStore('runMapMatching', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-mapmatching-api')
  const bucket = ref('quetzal-api-bucket')
  const callID = ref('')
  function setCallID() { callID.value = uuid() }

  const exclusions = ref([])

  const { error, running, errorMessage, startExecution, status, stopExecution } = useAPI(stateMachineArn.value)

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await ApplyResults()
      running.value = false
      status.value = ''
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('PT network successfully Mapmatched. See Results pages for more details.'),
          autoClose: false, color: 'success' })
    }
  })

  async function ApplyResults () {
    const store = useIndexStore()
    store.initLinks()
    const linksStore = useLinksStore()
    linksStore.unloadFiles()
    const links = await s3.readJson(bucket.value, callID.value.concat('/links_final.geojson'))
    linksStore.appendNewLinks(links)
    const nodes = await s3.readJson(bucket.value, callID.value.concat('/nodes_final.geojson'))
    linksStore.appendNewNodes(nodes)
    await getCSVs()
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
    exclusions,
    status,
    running,
    error,
    errorMessage,
    setCallID,
    startExecution,
    stopExecution,
    getCSVs,
  }
})
