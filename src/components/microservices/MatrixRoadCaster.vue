<script>
import s3 from '@src/AWSClient'
import { useMRCStore } from '@src/store/MatrixRoadCaster'
import { userLinksStore } from '@src/store/rlinks'
import { useIndexStore } from '@src/store/index'

import { ref, computed, onMounted, watch } from 'vue'
const $gettext = s => s

export default {
  name: 'MatrixRoadCaster',
  components: {
  },

  setup () {
    const runMRC = useMRCStore()
    const rlinksStore = userLinksStore()
    const store = useIndexStore()
    const imgs = ref([])
    const exporting = ref(false)
    const applying = ref(false)
    const validForm = ref(true)
    const showP = ref(false)

    const parameters = ref([{
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
        'required', 'dateTimeRule',
      ],
    },
    {
      name: 'ff_time_col',
      text: 'freeflow time on roads',
      value: null,
      items: rlinksStore.rlineAttributes,
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
      type: 'password',
      units: '',
      hint: 'HERE api key to download a set of OD',
      rules: [
        'required',
      ],
    },
    ])

    const bucket = computed(() => { return runMRC.bucket })
    const callID = computed(() => { return runMRC.callID })
    const timer = computed(() => { return runMRC.timer })
    const importStatus = computed(() => { return runMRC.status })
    const running = computed(() => { return runMRC.running })
    const error = computed(() => { return runMRC.error })
    const errorMessage = computed(() => { return runMRC.errorMessage })

    onMounted(() => {
      // init params to the store ones.
      const storeParams = runMRC.parameters
      // eslint-disable-next-line no-return-assign
      parameters.value.forEach(param => param.value = storeParams[param.name])
      // this.callID = '7617f433-b80e-4570-bacd-9b26dc1c1311'
      // if null, we create a uuid. else we fetch the data on S3
      if (callID.value) {
        getImagesURL()
      }
    })

    watch(importStatus, (val) => {
      if (val === 'SUCCEEDED') { getImagesURL() }
    })

    function run () {
      if (!this.$refs.form.validate()) { return }
      runMRC.setCallID()
      const inputs = { callID: callID.value }
      parameters.value.forEach(item => {
        inputs[item.name] = item.value
      })
      runMRC.startExecution({
        rlinks: rlinksStore.rlinks,
        rnodes: rlinksStore.rnodes,
        parameters: inputs,
      })
    }

    function stopRun () { runMRC.stopExecution() }

    async function ApplyResults () {
      applying.value = true
      const rlinks = await s3.readJson(bucket.value, callID.value.concat('/road_links.geojson'))
      rlinksStore.loadrLinks(rlinks)
      const rnodes = await s3.readJson(bucket.value, callID.value.concat('/road_nodes.geojson'))
      rlinksStore.loadrNodes(rnodes)
      applying.value = false
      store.changeNotification(
        { text: $gettext('Road links applied!'), autoClose: true, color: 'success' })
    }

    async function getImagesURL () {
      const outputsFiles = await s3.listFiles(bucket.value, callID.value + '/')
      const filesNames = outputsFiles.filter(name => name.endsWith('.png'))
      for (const file of filesNames) {
        const url = await s3.getImagesURL(bucket.value, file)
        imgs.value.push(url)
      }
    }

    async function download () {
      exporting.value = true
      s3.downloadFolder(bucket.value, callID.value.concat('/'))
      exporting.value = false
    }

    const showHint = ref(false)
    // eslint-disable-next-line max-len, no-useless-escape
    const re = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
    const rules = {
      required: v => !!v || $gettext('Required'),
      largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
      nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      dateTimeRule: v => re.test(v) || $gettext('invalid date time'),
    }
    return {
      imgs,
      exporting,
      applying,
      validForm,
      showP,
      parameters,
      showHint,
      rules,
      timer,
      running,
      error,
      errorMessage,
      download,
      run,
      stopRun,
      ApplyResults,
    }
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
              v-if="item.type==='password'"
              v-model="item.value"
              :type="showP ? 'text' : 'password'"
              :append-icon="showP ? 'fas fa-eye' : 'fas fa-eye-slash'"
              :label="$gettext(item.text)"
              :suffix="item.units"
              :hint="showHint? $gettext(item.hint): ''"
              :persistent-hint="showHint"
              :rules="item.rules.map((rule) => rules[rule])"
              required
              @click:append="showP = !showP"
            />
            <v-text-field
              v-else-if="typeof item.items === 'undefined'"
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
              size="small"
              style="margin-right: 10px;"
            >
              fa-solid fa-play
            </v-icon>
            {{ $gettext("Run") }}
          </v-btn>
          <v-btn
            v-show="importStatus == 'RUNNING'"
            color="grey"
            variant="text"
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
            size="small"
            @click="showHint = !showHint"
          >
            <v-icon>far fa-question-circle small</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <v-col>
      <v-card class="card2">
        <v-card-title class="subtitle">
          {{ $gettext('Calibration Results') }}
        </v-card-title>
        <v-btn
          v-show="imgs.length>0"
          :loading="applying"
          :disabled="applying"
          @click="ApplyResults"
        >
          <v-icon
            size="small"
            style="margin-right: 10px;"
          >
            fa-solid fa-upload
          </v-icon>
          {{ $gettext('Apply Road links to project') }}
        </v-btn>
        <v-btn
          v-show="imgs.length>0"
          :loading="exporting"
          :disabled="exporting"
          @click="download"
        >
          <v-icon
            size="small"
            style="margin-right: 10px;"
          >
            fa-solid fa-download
          </v-icon>
          {{ $gettext('Download') }}
        </v-btn>
        <v-alert
          v-if="error"
          density="compact"
          variant="outlined"
          text
          type="error"
        >
          {{ $gettext("Service ended with an execution error or have been aborted. \
            Please retry. If the problem persist, contact us.") }}
          <p
            v-for="key in Object.keys(errorMessage)"
            :key="key"
          >
            <b>{{ key }}: </b>{{ errorMessage[key] }}
          </p>
        </v-alert>
        <div
          v-for="(img,key) in imgs"
          :key="key"
          class="gallery"
        >
          <v-img
            :src="img"
            :alt="'image'"
            cover
          />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>

.card {
  height: 95%;
  overflow-y: auto;
  padding: 2.5rem;
  background-color: rgb(var(--v-theme-lightergrey));

}
.card2 {
  height: 95%;
  overflow-y: auto;
  padding: 2.5rem;
  margin-right: 3rem;
  background-color: rgb(var(--v-theme-lightergrey));

}
.row {
  height: 100%
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

</style>
