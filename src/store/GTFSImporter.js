import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from './APIComposable'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import s3 from '@src/AWSClient'
import router from '@src/router/index'
import { useGettext } from 'vue3-gettext'

export const useGTFSStore = defineStore('runGTFS', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-gtfs-api')
  const bucket = ref('quetzal-api-bucket')
  const callID = ref(uuid())
  function setCallID() { callID.value = uuid() }

  const { error, running, errorMessage, status, timer,
    startExecution, stopExecution, cleanRun } = useAPI(stateMachineArn.value)

  function clean() {
    UploadedGTFS.value = []
    selectedGTFS.value = []
    callID.value = uuid()
    cleanRun()
  }

  const parameters = ref({
    start_time: '06:00:00',
    end_time: '08:59:00',
    day: 'tuesday',
  })
  function saveParams (payload) { payload.forEach(param => parameters.value[param.name] = param.value) }

  const UploadedGTFS = ref([]) // list of upploded gtfs (zip local)
  const selectedGTFS = ref([]) // list of index for web Importer
  function saveSelectedGTFS (payload) {
    // for web importer
    selectedGTFS.value = payload
  }

  watch(status, async (val) => {
    console.log(val)
    if (val === 'SUCCEEDED') {
      running.value = true
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('gtfs imported successfully!'), autoClose: false, color: 'success' })
      await downloadOSMFromS3()
      running.value = false
      status.value = ''
      router.push('/Home').catch(() => {})
    }
  })

  const widthDict = ref({
    bus: 3,
    subway: 8,
    rail: 6,
    tram: 5,
  })
  function applyDict (links, widthDict) {
    // 00BCD4
    Object.keys(widthDict).forEach(routeType => {
      links.features.filter(link => link.properties.route_type === routeType).forEach(
        link => { link.properties.route_width = widthDict[routeType] },
      )
    })
    return links
  }

  async function downloadOSMFromS3 () {
    const linksStore = useLinksStore()

    let links = await s3.readJson(bucket.value, callID.value.concat('/links.geojson'))
    if (links.features.length > 0) {
      links = applyDict(links, widthDict.value)
    }
    linksStore.appendNewLinks(links)
    const nodes = await s3.readJson(bucket.value, callID.value.concat('/nodes.geojson'))
    linksStore.appendNewNodes(nodes)
  }

  // for zip importer
  async function addGTFS (payload) {
    const nameList = UploadedGTFS.value.map(el => el?.name)
    if (!nameList.includes(payload.info.name)) {
      UploadedGTFS.value.push(payload.info)
    }
    const upload = s3.uploadObject(bucket.value, callID.value + '/' + payload.info.name, payload.content)
    upload.on('httpUploadProgress', (progress) => {
      const percent = Math.round(progress.loaded / progress.total * 100)
      updateProgress({ name: payload.info.name, progress: percent })
    })
    upload.done()
  }
  function updateProgress (payload) {
    UploadedGTFS.value.filter(el => el.name === payload.name)[0].progress = payload.progress
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
    clean,
    parameters,
    saveParams,
    UploadedGTFS,
    selectedGTFS,
    saveSelectedGTFS,
    addGTFS,
  }
})
