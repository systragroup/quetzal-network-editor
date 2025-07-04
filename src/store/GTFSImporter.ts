import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAPI } from '../composables/APIComposable'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import s3 from '@src/AWSClient'
import router from '@src/router/index'
import { useGettext } from 'vue3-gettext'
import { GTFSParams, UploadGTFSInfo, UploadGTFSPayload } from '@src/types/typesStore'
import { LineStringGeoJson } from '@src/types/geojson'
import { routeTypeWidth, routeTypeColor } from '@src/constants/gtfs'

function baseParameters(): GTFSParams {
  return {
    files: [],
    timeseries: [{
      start_time: '06:00:00',
      end_time: '08:59:00',
      value: '',
    }],
    day: 'tuesday',
    dates: [],
  }
}

export const useGTFSStore = defineStore('runGTFS', () => {
  const { $gettext } = useGettext()
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-gtfs-api-dev')
  const bucket = ref('quetzal-api-bucket')

  const callID = ref(uuid())
  const parameters = ref<GTFSParams>(baseParameters())
  const uploadedGTFS = ref<UploadGTFSInfo[]>([]) // list of upploded gtfs (zip local)
  const selectedGTFS = ref<number[]>([]) // list of index for web Importer

  const { error, running, errorMessage, status, timer, startExecution, stopExecution, cleanRun } = useAPI()

  function reset() {
    uploadedGTFS.value = []
    selectedGTFS.value = []
    callID.value = uuid()
    parameters.value = baseParameters()
    cleanRun()
  }

  // used for the webimporter. we want a new callID on run
  // the zip importer need a fix callID to upload its gtfs in a bucket, then run
  function setCallID() { callID.value = uuid() }

  function saveParams (params: Partial<GTFSParams>) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        parameters.value[key] = params[key]!
      }
    })
  }

  function saveSelectedGTFS (payload: number[]) {
    selectedGTFS.value = payload
  }

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      const store = useIndexStore()
      store.changeNotification(
        { text: $gettext('gtfs imported successfully!'), autoClose: false, color: 'success' })
      await downloadFromS3()
      running.value = false
      status.value = ''
      router.push('/Home').catch(() => {})
    }
  })

  type WidthDict = Record<string, number>
  type ColorDict = Record<string, string>

  function applyDict (links: LineStringGeoJson, widthDict: WidthDict, colorDict: ColorDict) {
    Object.keys(widthDict).forEach(routeType => {
      links.features.filter(link => link.properties.route_type === routeType).forEach(link => {
        link.properties.route_width = widthDict[routeType]
        if (!link.properties.route_color) { link.properties.route_color = colorDict[routeType] }
      })
    })
    return links
  }

  function removeHashInColor(links: LineStringGeoJson): LineStringGeoJson {
    links.features.forEach(link => {
      if (link.properties.route_color) {
        link.properties.route_color = link.properties.route_color.replace('#', '')
      }
    })
    return links
  }

  async function downloadFromS3 () {
    const linksStore = useLinksStore()
    let links = await s3.readJson(bucket.value, callID.value.concat('/outputs/links.geojson')) as LineStringGeoJson
    if (links.features.length > 0) {
      links = removeHashInColor(links)
      links = applyDict(links, routeTypeWidth, routeTypeColor)
    }
    linksStore.appendNewLinks(links)
    const nodes = await s3.readJson(bucket.value, callID.value.concat('/outputs/nodes.geojson'))
    linksStore.appendNewNodes(nodes)
  }

  // for zip importer
  async function addGTFS (payload: UploadGTFSPayload) {
    const nameList = uploadedGTFS.value.map(el => el?.name)
    if (!nameList.includes(payload.info.name)) {
      uploadedGTFS.value.push(payload.info)
    }
    const upload = s3.uploadObject(bucket.value, callID.value + '/inputs/' + payload.info.name, payload.content)
    console.log(callID.value)
    upload.on('httpUploadProgress', (progress) => {
      if (progress) {
        const percent = Math.round((progress.loaded || 0) / (progress.total || 1) * 100)
        updateProgress({ name: payload.info.name, progress: percent })
      }
    })
    upload.done()
  }

  interface UploadProgress {
    name: string
    progress: number
  }

  function updateProgress (payload: UploadProgress) {
    uploadedGTFS.value.filter(el => el.name === payload.name)[0].progress = payload.progress
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
    reset,
    parameters,
    saveParams,
    uploadedGTFS,
    selectedGTFS,
    saveSelectedGTFS,
    addGTFS,
  }
})
