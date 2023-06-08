<script>
import s3 from '@src/AWSClient'

const $gettext = s => s

export default {
  name: 'MatrixRoadCaster',
  components: {
  },

  data () {
    return {
      imgs: [],
      exporting: false,
      applying: false,
      validForm: true,

      parameters: [{
        name: 'num_zones',
        text: 'number of zones',
        value: null,
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
        value: null,
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
        value: null,
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
        value: null,
        items: this.$store.getters.rlineAttributes,
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
        value: null,
        type: 'Number',
        units: '',
        hint: 'Maximum allowed speed on a road. applying an OD matrix on the road network could result il unrealistic speed if not used.',
        rules: [
          'required', 'largerThanZero',
        ],
      },
      {
        name: 'num_random_od',
        text: 'number of OD to plot',
        value: null,
        type: 'Number',
        units: '',
        hint: 'number of OD calibration plot to produce. those are random OD.',
        rules: [
          'required', 'largerThanZero',
        ],
      },
      {
        name: 'hereApiKey',
        text: 'HERE api key',
        value: null,
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
    bucket () { return this.$store.getters['runMRC/bucket'] },
    callID () { return this.$store.getters['runMRC/callID'] },
    timer () { return this.$store.getters['runMRC/timer'] },
    importStatus () { return this.$store.getters['runMRC/status'] },
    running () { return this.$store.getters['runMRC/running'] },
  },
  watch: {
    importStatus (val) {
      if (val === 'SUCCEEDED') {
        this.getImagesURL()
      }
    },
  },
  created () {
    // init params to the store ones.
    const storeParams = this.$store.getters['runMRC/parameters']
    // eslint-disable-next-line no-return-assign
    this.parameters.forEach(param => param.value = storeParams[param.name])
    // this.callID = '7617f433-b80e-4570-bacd-9b26dc1c1311'
    // if null, we create a uuid. else we fetch the data on S3
    if (this.callID) {
      this.getImagesURL()
    }
  },
  methods: {
    run () {
      if (!this.$refs.form.validate()) { return }
      this.$store.commit('runMRC/setCallID')
      const inputs = { callID: this.callID }
      this.parameters.forEach(item => {
        inputs[item.name] = item.value
      })
      this.$store.dispatch('runMRC/startExecution', {
        rlinks: this.$store.getters.rlinks,
        rnodes: this.$store.getters.rnodes,
        parameters: inputs,
      })
    },
    stopRun () { this.$store.dispatch('runMRC/stopExecution') },

    async ApplyResults () {
      this.applying = true
      const rlinks = await s3.readJson(this.bucket, this.callID.concat('/road_links.geojson'))
      this.$store.commit('loadrLinks', rlinks)
      const rnodes = await s3.readJson(this.bucket, this.callID.concat('/road_nodes.geojson'))
      this.$store.commit('loadrNodes', rnodes)
      this.applying = false
      this.$store.commit('changeNotification',
        { text: $gettext('Road links applied!'), autoClose: true, color: 'success' })
    },
    async getImagesURL () {
      const outputsFiles = await s3.listFiles(this.bucket, this.callID + '/')
      const filesNames = outputsFiles.filter(name => name.endsWith('.png'))
      for (const file of filesNames) {
        const url = await s3.getImagesURL(this.bucket, file)
        this.imgs.push(url)
      }
    },
    async download () {
      this.exporting = true
      await s3.downloadFolder(this.bucket, this.callID.concat('/'))
      this.exporting = false
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

        <v-form
          ref="form"
          v-model="validForm"
          lazy-validation
        >
          <div
            v-for="(item, key) in parameters"
            :key="key"
          >
            <v-text-field
              v-if="typeof item.items === 'undefined'"
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
            <v-select
              v-else
              v-model="item.value"
              :type="item.type"
              :items="item.items"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @wheel="()=>{}"
            />
          </div>
        </v-form>
        <v-card-actions>
          <v-btn
            color="success"
            :loading="running || importStatus === 'RUNNING'"
            :disabled="running || importStatus === 'RUNNING' || !validForm"
            @click="run()"
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
            ~ {{ timer>0? Math.ceil(timer/60): $gettext('less than 1') }}{{ $gettext(' minutes remaining') }}
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
        <v-btn
          v-show="imgs.length>0"
          :loading="applying"
          :disabled="applying"
          @click="ApplyResults"
        >
          {{ $gettext('Apply Road links to project') }}
        </v-btn>
        <v-btn
          v-show="imgs.length>0"
          :loading="exporting"
          :disabled="exporting"
          @click="download"
        >
          {{ $gettext('Download') }}
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
