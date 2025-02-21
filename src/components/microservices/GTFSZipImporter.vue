<script setup>
import { unzipCalendar } from '@comp/utils/utils'
import DatePicker from '@comp/utils/DatePicker.vue'
import { ref, computed, onBeforeUnmount } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const runGTFS = useGTFSStore()
const linksStore = useLinksStore()
const store = useIndexStore()
const showOverwriteDialog = ref(false)
const showHint = ref(false)
const linksIsEmpty = computed(() => { return linksStore.linksIsEmpty })
const callID = computed(() => { return runGTFS.callID })
const UploadedGTFS = computed(() => { return runGTFS.UploadedGTFS })
const running = computed(() => { return runGTFS.running })
const error = computed(() => { return runGTFS.error })
const errorMessage = computed(() => { return runGTFS.errorMessage })
const isUploading = computed(() => { return UploadedGTFS.value.filter(item => item.progress < 100).length > 0 })

onBeforeUnmount(() => {
  runGTFS.saveParams(parameters.value)
})

const rules = {
  required: v => !!v || $gettext('Required'),
}

const parameters = ref([{
  name: 'start_time',
  text: 'start time',
  value: runGTFS.parameters.start_time,
  type: 'time',
  units: '',
  hint: 'Start Time to restrict the GTFS in a period',
  rules: [
    'required',
  ],
},
{
  name: 'end_time',
  text: 'end time',
  value: runGTFS.parameters.end_time,
  type: 'time',
  units: '',
  hint: 'End Time to restrict the GTFS in a period',
  rules: [
    'required',
  ],
},
])
const zipInput = ref()
function uploadGTFS () {
  zipInput.value.click()
  document.getElementById('zip-input').value = '' // clean it for next file
}

async function readZip (event) {
  try {
    store.changeLoading(true)
    const zfiles = event.target.files
    // there is a file
    if (!zfiles.length) {
      store.changeLoading(false)
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
      await runGTFS.addGTFS(payload)
    }
    store.changeLoading(false)
  } catch (err) {
    store.changeLoading(false)
    store.changeAlert(err)
  }
}

function importGTFS () {
  if (linksIsEmpty.value) {
    const files = UploadedGTFS.value.map(el => el.name)
    const dates = UploadedGTFS.value.map(el => el.date)
    const inputs = { files, dates, callID: callID.value }
    parameters.value.forEach(item => {
      inputs[item.name] = item.value
    })
    runGTFS.startExecution(inputs)
  } else {
    showOverwriteDialog.value = true
  }
}

function applyOverwriteDialog () {
  linksStore.$reset()
  showOverwriteDialog.value = false
  importGTFS()
}

</script>
<template>
  <div>
    <input
      id="zip-input"
      ref="zipInput"
      type="file"
      style="display: none"
      accept=".zip"
      multiple="multiple"
      @change="readZip"
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
      <v-card-actions>
        <v-btn
          variant="elevated"
          :disabled="running"
          prepend-icon="fa-solid fa-file-archive"
          @click="uploadGTFS"
        >
          {{ $gettext('upload GTFS') }}
        </v-btn>
      </v-card-actions>

      <v-card-subtitle>
        <v-alert
          v-if="error"
          density="compact"
          variant="outlined"
          text
          type="error"
        >
          {{ $gettext("There as been an error while converting your GTFS. \
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
          class="params"
        >
          <v-text-field
            v-model="item.value"
            :type="item.type"
            step="1"
            variant="underlined"
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
              :date="item.date"
              :from="item.minDate"
              :to="item.maxDate"
              @update:date="(val)=>item.date=val"
            />

          </span>
          <span class="list-item-small"> <v-progress-circular
                                           v-if="item.progress<100"
                                           :indeterminate="item.progress===0"
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
          :color="(running || UploadedGTFS.length==0 || isUploading)? 'regular' :'success'"
          prepend-icon="fa-solid fa-play"
          @click="importGTFS"
        >
          {{ $gettext('convert') }}
        </v-btn>
      </div>
    </v-card>
    <v-dialog
      v-model="showOverwriteDialog"
      persistent
      max-width="500"
      @keydown.enter="applyOverwriteDialog"
      @keydown.esc="showOverwriteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Overwrite current PT network ?") }}
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
  </div>
</template>
<style lang="scss" scoped>

.card {
  height: 75vh;
  width: 80vw;
  margin: 1rem;
  padding: 2.5rem 2rem;
  justify-content: center;
  background-color: rgb(var(--v-theme-lightergrey));
}
.row {
  height: 100%;
  justify-content: center;
}
.col {
  max-height: 100%;
  align-items: center;
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
  color:rgb(var(--v-theme-secondary-dark));
  font-weight: bold;
  margin: 10px;
  margin-left: 0;
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
.params{
  width: 10rem;
}
.list {
  height:70%;
  margin-top:1rem;
  overflow: hidden auto;
  border-top: 1px solid rgb(var(--v-theme-mediumgrey));
  border-bottom: 1px solid rgb(var(--v-theme-mediumgrey));
}
.list-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  padding-left:0;
  height:3rem;
  align-items: center;
  justify-content:flex-start;
  border-bottom: 1px solid rgb(var(--v-theme-mediumgrey));
}
.list ul {
  height: 3rem;
  transition: background-color 0.3s; /* Add a smooth transition effect */
}
.list ul:hover {
  background-color: rgb(var(--v-theme-mediumgrey)); /* Change the background color on hover */
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
  position: relative;
  right: 0;
  align-items: right;
}
</style>
