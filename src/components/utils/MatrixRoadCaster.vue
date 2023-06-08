<script>
import s3 from '@src/AWSClient'
import { quetzalClient } from '@src/axiosClient.js'
import { v4 as uuid } from 'uuid'
import JSZip from 'jszip'
import saveAs from 'file-saver'

const $gettext = s => s

export default {
  name: 'MatrixRoadCaster',
  components: {
  },

  data () {
    return {
      imgs: [],
      bucket: 'matrixroadcaster',
      callID: '',
      importStatus: null,
      running: false,
      executionArn: '',
      timer: 0,

      parameters: [{
        name: 'num_zones',
        text: 'number of zones',
        value: 100,
        type: 'Number',
        units: '',
        hint: 'number of zones. road nodes will be aggregate to form centroids',
        rules: [
          'required', 'largerThanZero',
        ],
      },
      {
        name: 'train_size',
        text: 'number of OD (api call)',
        value: 100,
        type: 'Number',
        units: '',
        hint: 'number of OD to get from the API, the rest will be interpolated with ML',
        rules: [
          'required', 'largerThanZero',
        ],
      },
      {
        name: 'date_time',
        text: 'date Time',
        value: '2023-03-04T08:00:21+02:00',
        type: 'String',
        units: '',
        hint: 'DateTime in the past. (YYYY-MM-DDTHH:MM:SS(UTC-timezone) (-04:00 for montreal))',
        rules: [
          'required',
        ],
      },
      {
        name: 'ff_time_col',
        text: 'freeflow time on roads',
        value: 'time',
        type: 'String',
        units: '',
        hint: 'road links time (link length / speed) to use as a first approximation. this is the freeflow speed, or speed limit',
        rules: [
          'required',
        ],
      },
      {
        name: 'max_speed',
        text: 'max speed on road',
        value: 100,
        type: 'Number',
        units: '',
        hint: 'Maximum allowed speed on a road. applying an OD matrix on the road network could result il unrealistic speed if not used.',
        rules: [
          'required', 'largerThanZero',
        ],
      },
      {
        name: 'hereApiKey',
        text: 'HERE api key',
        value: '',
        type: 'String',
        units: '',
        hint: 'HERE api key to download a set of OD',
        rules: [
          'required',
        ],
      },
      ],

      showHint: false,
      rules: {
        required: v => !!v || $gettext('Required'),
        largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
        nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      },

    }
  },
  computed: {
  },
  watch: {
  },
  created () {
    this.callID = this.$store.getters.matrixRoadCasterCallID
    this.callID = '7617f433-b80e-4570-bacd-9b26dc1c1311'
    // if null, we create a uuid. else we fetch the data on S3
    if (this.callID) {
      console.log(this.callID)
      this.getImagesURL()
    }
  },
  methods: {
    getApproxTimer () {
      const numZones = this.parameters.filter(item => item.name === 'num_zones')[0].value
      const trainSize = this.parameters.filter(item => item.name === 'train_size')[0].value
      // API call time (1.8sec per call), 15 iteration X number of links, loadning saving, plotting 30sec.
      this.timer = Math.min(numZones, trainSize) * 1.8 + this.$store.getters.rlinks.features.length * 0.002 + 30
    },

    async run () {
      this.getApproxTimer()
      this.callID = uuid()
      this.$store.commit('setMatrixRoadCasterCallID', this.callID)
      console.log('exporting roads to s3')
      this.running = true
      await s3.putObject(
        this.bucket,
        this.callID.concat('/road_links.geojson'),
        JSON.stringify(this.$store.getters.rlinks))
      await s3.putObject(
        this.bucket,
        this.callID.concat('/road_nodes.geojson'),
        JSON.stringify(this.$store.getters.rnodes))
      console.log('start')
      const inputs = { callID: this.callID }
      this.parameters.forEach(item => {
        inputs[item.name] = item.value
      })
      let data = {
        input: JSON.stringify(inputs),
        name: this.callID,
        stateMachineArn: 'arn:aws:states:ca-central-1:142023388927:stateMachine:ML_MatrixRoadCaster',
      }
      quetzalClient.client.post('',
        data = JSON.stringify(data),
      ).then(
        response => {
          this.executionArn = response.data.executionArn
          this.pollImport(response.data.executionArn)
        }).catch(err => {
        console.log(err)
        this.importStatus = 'ERROR'
        this.running = false
      })
    },
    pollImport (executionArn) {
      const intervalId = setInterval(() => {
        let data = { executionArn: executionArn }
        this.timer = this.timer - 4
        quetzalClient.client.post('/describe',
          data = JSON.stringify(data),
        ).then(
          response => {
            this.importStatus = response.data.status
            console.log(this.importStatus)
            if (this.importStatus === 'SUCCEEDED') {
              clearInterval(intervalId)
              this.running = false
              this.getImagesURL()
              console.log('ok')
            } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(this.importStatus)) {
              clearInterval(intervalId)
              this.running = false
            }
          }).catch(e => { console.log(e) })
      }, 2000)
    },
    async ApplyResults () {
      const rlinks = await s3.readJson(this.bucket, this.callID.concat('/road_links.geojson'))
      this.$store.commit('loadrLinks', rlinks)
      const rnodes = await s3.readJson(this.bucket, this.callID.concat('/road_nodes.geojson'))
      this.$store.commit('loadrNodes', rnodes)
      this.$store.commit('changeNotification',
        { text: $gettext('Road links applied!'), autoClose: true, color: 'success' })
    },
    async getImagesURL () {
      let url = await s3.getImagesURL(this.bucket, this.callID.concat('/HERE_iteration_error.png'))
      this.imgs.push(url)
      url = await s3.getImagesURL(this.bucket, this.callID.concat('/HERE_road_calibration.png'))
      this.imgs.push(url)
    },
    stopRun () {
      let data = { executionArn: this.executionArn }
      quetzalClient.client.post('/abort',
        data = JSON.stringify(data),
      ).then(
        response => {
          console.log('stop')
        }).catch(
        err => {
          console.log(err)
        })
    },
    async download () {
      console.log(this.imgs[0])
      const imageBlob = await fetch(this.imgs[0], { mode: 'no-cors' }).then(response => response.blob())

      // create a new file from the blob object
      const imgData = new Blob([imageBlob])

      // Copy-pasted from JSZip documentation
      const zip = new JSZip()
      const img = zip.folder('images')
      img.file('smile.png', imgData, { base64: true })
      zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'example.zip')
      })
    },

  },
}
</script>
<template>
  <v-row class="ma-0 pa-2 background">
    <v-col>
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('ML Matrix Road Caster') }}
        </v-card-title>
        <p> {{ $gettext('1) Find n zones centroids using a Kmean clustering on the nodes') }}</p>
        <p> {{ $gettext('2) Call the Here Matrix API on random OD ( around 1% is sufficient )') }}</p>
        <p> {{ $gettext('3) Interpolate every other OD time with an hybrid Machine learning model') }}</p>
        <p> {{ $gettext('4) ajust the speed on the road network to match the routing time with the OD time using an iterative algorithm') }}</p>

        <form
          v-for="(item, key) in parameters"
          :key="key"
        >
          <v-text-field
            v-model="item.value"
            :type="item.type"
            :label="$gettext(item.text)"
            :suffix="item.units"
            :hint="showHint? $gettext(item.hint): ''"
            :persistent-hint="showHint"
            :rules="item.rules.map((rule) => rules[rule])"
            required
            @wheel="()=>{}"
          />
        </form>
        <v-card-actions>
          <v-btn
            color="success"
            :loading="running"
            :disabled="running"
            @click="run"
          >
            <v-icon
              small
              style="margin-right: 10px;"
            >
              fa-solid fa-play
            </v-icon>
            {{ $gettext("Run") }}
          </v-btn>
          <v-btn
            v-show="importStatus == 'RUNNING'"
            color="grey"
            text
            @click="stopRun()"
          >
            {{ $gettext("Abort") }}
          </v-btn>
          <v-card-text v-show="importStatus == 'RUNNING'">
            ~ {{ timer>0? Math.ceil(timer/60): 'less than 1' }}{{ $gettext(' minutes remaining') }}
          </v-card-text>
          <v-spacer />
          <v-btn
            icon
            small
            @click="showHint = !showHint"
          >
            <v-icon>far fa-question-circle small</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <v-col>
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('Calibration Results') }}
        </v-card-title>
        <v-btn @click="ApplyResults">
          {{ $gettext('Apply Road links to project') }}
        </v-btn>
        <v-btn @click="download">
          {{ $gettext('Download pngs') }}
        </v-btn>
        <div
          v-for="(img,key) in imgs"
          :key="key"
          class="gallery"
        >
          <v-img
            :src="img"
            :alt="'image'"
            contain
          />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>
.container {
  width: 100%;
  overflow: hidden;
  margin-left: 0 auto;
  margin-right: 0 auto;
  padding: 0 0 0 0;
}
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  height: 100%;
  overflow-y: auto;
  padding: 40px;
}

.v-card__text {
  max-height: 80%;
  overflow-y: auto;
}
.row {
  height: calc(100% - 38px)
}
.col {
  max-height: 100%;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color:var(--v-secondary-dark);
  font-weight: bold;
  margin: 10px;
  margin-left: 0px;
}
.card button {
  margin-top: 0px;
}
.background {
  background-color:var(--v-background-base);
}

div.gallery {
  margin: 5px;
  background-color: var(--v-white-base);
  border: 1px solid var(--v-lightgrey-base);
  float: left;
  width: 50rem;
}

div.gallery:hover {
  border: 1px solid var(--v-darkgrey-base);
}

div.gallery img {
  width: 100%;
  height: auto;
}

.image-fit{
  height: 100%;
  width: 100%;
  object-fit: cover;
}
</style>
