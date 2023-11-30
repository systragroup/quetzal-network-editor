<script>
import linksBase from '@static/links_base.geojson'
import nodesBase from '@static/nodes_base.geojson'

import { unzipCalendar } from '@comp/utils/utils.js'
import DatePicker from '@comp/utils/DatePicker.vue'
import { ref } from 'vue'
const $gettext = s => s

export default {
  name: 'GTFSWebImporter',
  components: { DatePicker },
  setup () {

  },
  data () {
    return {
      showOverwriteDialog: false,
      poly: null,
      nodes: {},
      gtfsList: [],
      checkall: false,
      showHint: false,
      parameters: [{
        name: 'start_time',
        text: 'start time',
        value: this.$store.getters['runGTFS/parameters'].start_time,
        type: 'String',
        units: '',
        hint: 'Start Time to restrict the GTFS in a period',
        rules: [
          'required', 'timeRule',
        ],
      },
      {
        name: 'end_time',
        text: 'end time',
        value: this.$store.getters['runGTFS/parameters'].end_time,
        type: 'String',
        units: '',
        hint: 'End Time to restrict the GTFS in a period',
        rules: [
          'required', 'timeRule',
        ],
      },
      ],
      // eslint-disable-next-line max-len, no-useless-escape
      re: /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      rules: {
        required: v => !!v || $gettext('Required'),
        timeRule: v => this.re.test(v) || $gettext('invalid date time'),
      },
    }
  },
  computed: {
    linksIsEmpty () { return this.$store.getters.linksIsEmpty },
    UploadedGTFS () { return this.$store.getters['runGTFS/UploadedGTFS'] },
    callID () { return this.$store.getters['runGTFS/callID'] },
    running () { return this.$store.getters['runGTFS/running'] },
    error () { return this.$store.getters['runGTFS/error'] },
    errorMessage () { return this.$store.getters['runGTFS/errorMessage'] },
    isUploading () { return this.UploadedGTFS.filter(item => item.progress < 100).length > 0 },
  },
  beforeDestroy () {
    this.$store.commit('runGTFS/saveParams', this.parameters)
  },

  methods: {

    uploadGTFS () {
      this.$refs.zipInput.click()
      document.getElementById('zip-input').value = '' // clean it for next file
    },

    async readZip (event) {
      try {
        this.$store.commit('changeLoading', true)
        const zfiles = event.target.files
        // there is a file
        if (!zfiles.length) {
          this.$store.commit('changeLoading', false)
          return
        }
        for (const file of zfiles) {
          const calendar = await unzipCalendar(file)
          const minDate = calendar.reduce((min, date) =>
            (date.start_date < min ? date.start_date : min), calendar[0].start_date)
          const maxDate = calendar.reduce((max, date) =>
            (date.end_date > max ? date.end_date : max), calendar[0].end_date)

          const payload = {
            content: file,
            info: { name: file.name, minDate, maxDate, date: minDate, progress: 0 },
          }
          await this.$store.dispatch('runGTFS/addGTFS', payload)
        }
        this.$store.commit('changeLoading', false)
      } catch (err) {
        this.$store.commit('changeLoading', false)
        this.$store.commit('changeAlert', err)
      }
    },

    importGTFS () {
      if (this.linksIsEmpty) {
        const files = this.UploadedGTFS.map(el => el.name)
        const dates = this.UploadedGTFS.map(el => el.date)
        const inputs = { files, dates }
        this.parameters.forEach(item => {
          inputs[item.name] = item.value
        })
        this.$store.dispatch('runGTFS/startExecution', inputs)
      } else {
        this.showOverwriteDialog = true
      }
    },

    applyOverwriteDialog () {
      this.$store.commit('loadLinks', linksBase)
      this.$store.commit('loadNodes', nodesBase)
      this.showOverwriteDialog = false
      this.importGTFS()
    },
  },

}
</script>
<template>
  <v-row class="ma-0 pa-2 background">
    <input
      id="zip-input"
      ref="zipInput"
      type="file"
      style="display: none"
      accept=".zip"
      multiple="multiple"
      @change="readZip"
    >
    <v-col
      class="d-flex flex-column "
    >
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('GTFS importer') }}
        </v-card-title>
        <v-card-subtitle>
          {{ $gettext('import GTFS from local computer') }}
        </v-card-subtitle>
        <v-card-subtitle>
          {{ $gettext('Add GTFS files. When its done uploading press Convert') }}
        </v-card-subtitle>

        <v-btn
          :disabled="running"
          @click="uploadGTFS"
        >
          <v-icon
            size="small"
            style="margin-right: 10px;"
          >
            fa-solid fa-file-archive
          </v-icon>
          {{ $gettext('upload GTFS') }}
        </v-btn>

        <v-card-subtitle>
          <v-alert
            v-if="error"
            density="compact"
            variant="outlined"
            text
            type="error"
          >
            {{ $gettext("There as been an error while importing OSM network. \
            Please try again. If the problem persist, contact us.") }}
            <p
              v-for="key in Object.keys(errorMessage)"
              :key="key"
            >
              <b>{{ key }}: </b>{{ errorMessage[key] }}
            </p>
          </v-alert>
        </v-card-subtitle>
        <div class="params-row">
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
        </div>
        <div class="list">
          <li class="list-row bold">
            <span class="list-item-small" />
            <span class="list-item-large">{{ $gettext('name') }} </span>
            <span class="list-item-medium">{{ $gettext('from') }} </span>
            <span class="list-item-medium">{{ $gettext('to') }} </span>
            <span class="list-item-medium">{{ $gettext('selected date') }}</span>
            <span class="list-item-small"> {{ $gettext('Uploaded') }}</span>
          </li>
          <ul
            v-for="(item,key) in UploadedGTFS"
            :key="key"
            class="list-row"
          >
            <span class="list-item-small">{{ key }} </span>
            <span class="list-item-large">{{ item.name }} </span>
            <span class="list-item-medium">{{ item.minDate }} </span>
            <span class="list-item-medium">{{ item.maxDate }} </span>
            <span class="list-item-medium">
              <DatePicker
                v-model="item.date"
                :from="item.minDate"
                :to="item.maxDate"
              />
            </span>
            <span class="list-item-small"> <v-progress-circular
                                             v-if="item.progress<100"
                                             absolute
                                             color="primary"
                                             :model-value="item.progress"
                                           />
              <v-icon v-else>fas fa-check</v-icon></span>
          </ul>
        </div>
        <div class="bottom-button">
          <v-btn
            :loading="running"
            :disabled="running || UploadedGTFS.length==0 || isUploading"
            color="success"
            @click="importGTFS"
          >
            <v-icon
              size="small"
              style="margin-right: 10px;"
            >
              fa-solid fa-play
            </v-icon>
            {{ $gettext('convert') }}
          </v-btn>
        </div>
      </v-card>
    </v-col>
    <v-dialog
      v-model="showOverwriteDialog"
      persistent
      max-width="500"
      @keydown.enter="applyOverwriteDialog"
      @keydown.esc="showOverwriteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Overwrite current road network ?") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="regular"
            @click="showOverwriteDialog = !showOverwriteDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="applyOverwriteDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<style lang="scss" scoped>

.card {
  height: 90%;
  width: 80%;
  padding: 2.5rem 2rem 2.5rem 2rem;
  margin-right: 3rem;
}
.row {
  height: 100%;
  justify-content: center;
}
.col {
  max-height: 100%;
  align-items: center;
}
.card button {
  margin-top: 0px;
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

.params-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  align-items: center;
  margin-right:1rem;
  padding-top: 0.5rem;
  justify-content:flex-start;
  gap: 1rem;
}

.list {
  height:70%;
  margin-top:1rem;
  overflow-y: auto;
  overflow-x: hidden;
  border-top: 1px solid var(--v-background-lighten3);
  border-bottom: 1px solid var(--v-background-lighten3);

}
.list-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  padding-left:0;
  height:3rem;
  align-items: center;
  justify-content:flex-start;
  border-bottom: 1px solid var(--v-background-lighten3);
}

.list ul {
  height: 3rem;
  transition: background-color 0.3s; /* Add a smooth transition effect */
}

.list ul:hover {
  background-color: var(--v-background-lighten4); /* Change the background color on hover */
}

.list-item-small {
  /* Add individual list item styles here */
  flex: 0 0 8%;
  margin:4px;
}

.list-item-medium {
  /* Add individual list item styles here */
  flex: 0 0 18%;
  margin-right:2px;
}

.list-item-large {
  /* Add individual list item styles here */
  flex: 0 0 22%;
  margin:4px;
}

.bottom-button{
  padding:2rem;
  position: absolute;
  right: 0;

}
</style>
