import { v4 as uuid } from 'uuid'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { userLinksStore } from '@src/store/rlinks'
import { useAPI } from '../composables/APIComposable'
import router from '@src/router/index'
import { highwayColor, highwayWidth } from '@constants/highway.js'
import s3 from '@src/AWSClient'
import { LineStringGeoJson } from '@src/types/geojson'

export const useOSMStore = defineStore('runOSM', () => {
  const stateMachineArn = ref('arn:aws:states:ca-central-1:142023388927:stateMachine:quetzal-osm-api')
  const bucket = ref('quetzal-api-bucket')
  const callID = ref('')
  function setCallID() { callID.value = uuid() }

  const { error, running, errorMessage, status,
    startExecution, stopExecution, cleanRun } = useAPI()

  watch(status, async (val) => {
    if (val === 'SUCCEEDED') {
      running.value = true
      await downloadOSMFromS3()
      running.value = false
      status.value = ''
      router.push('/Home').catch(() => {})
    }
  })

  const extendedCycleway = ref(false)
  const selectedHighway = ref<string[]>([
    'motorway',
    'motorway_link',
    'trunk',
    'trunk_link',
    'primary',
    'primary_link',
  ])

  type WidthDict = Record<string, number>
  type ColorDict = Record<string, string>

  function applyDict (links: LineStringGeoJson, colorDict: ColorDict, widthDict: WidthDict) {
    // 00BCD4
    Object.keys(colorDict).forEach(highway => {
      links.features.filter(link => link.properties.highway === highway).forEach(
        link => {
          link.properties.route_width = widthDict[highway]
          link.properties.route_color = colorDict[highway]
        })
    })
    return links
  }

  async function downloadOSMFromS3 () {
    let rlinks = await s3.readJson(bucket.value, callID.value.concat('/links.geojson'))
    rlinks = applyDict(rlinks, highwayColor, highwayWidth)
    const rlinksStore = userLinksStore()
    rlinksStore.appendNewrLinks(rlinks)
    const rnodes = await s3.readJson(bucket.value, callID.value.concat('/nodes.geojson'))
    rlinksStore.appendNewrNodes(rnodes)
  }

  return {
    stateMachineArn,
    bucket,
    selectedHighway,
    extendedCycleway,
    callID,
    status,
    running,
    error,
    errorMessage,
    setCallID,
    startExecution,
    stopExecution,
    cleanRun,
  }
})
