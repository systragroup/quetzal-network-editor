<script setup lang="ts">
import { unzipCalendar } from '@src/utils/io'
import DatePicker from '@comp/utils/DatePicker.vue'
import { ref, computed, onBeforeUnmount } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { getRules } from '@src/utils/form'

import { useGettext } from 'vue3-gettext'
import { FormData } from '@src/types/components'
import Warning from '../utils/Warning.vue'
const { $gettext } = useGettext()

const runGTFS = useGTFSStore()
const linksStore = useLinksStore()
const store = useIndexStore()
const showOverwriteDialog = ref(false)
const showHint = ref(false)
const stateMachineArn = computed(() => runGTFS.stateMachineArn)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)
const uploadedGTFS = computed(() => runGTFS.uploadedGTFS)
const running = computed(() => runGTFS.running)
const error = computed(() => runGTFS.error)
const errorMessage = computed(() => runGTFS.errorMessage)
const isUploading = computed(() => uploadedGTFS.value.filter(item => item.progress < 100).length > 0)
const storeParameters = computed(() => runGTFS.parameters)

function save() {
  const files = uploadedGTFS.value.map(el => el.name)
  const dates = uploadedGTFS.value.map(el => el.date)
  runGTFS.saveParams(parameters.value, files, dates)
}

onBeforeUnmount(() => {
  save()
})

const parameters = ref<FormData[]>([{
  key: 'start_time',
  label: 'start time',
  value: storeParameters.value.start_time,
  type: 'time',
  units: '',
  hint: 'Start Time to restrict the GTFS in a period',
  rules: [
    'required',
  ],
},
{
  key: 'end_time',
  label: 'end time',
  value: storeParameters.value.end_time,
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
  const element = document.getElementById('zip-input') as HTMLInputElement | null
  if (element) element.value = '' // clean it for next file
}

async function readZip (event: Event) {
  try {
    store.changeLoading(true)
    const input = event.target as HTMLInputElement
    const zfiles = input.files
    // there is a file
    if (!zfiles?.length) {
      store.changeLoading(false)
      return
    }
    for (const file of Array.from(zfiles)) {
      const calendar = await unzipCalendar(file) as any
      const minDate = calendar.reduce((min: any, date: any) =>
        (date.start_date < min ? date.start_date : min), calendar[0].start_date)
      const maxDate = calendar.reduce((max: any, date: any) =>
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
    runGTFS.setCallID()
    save()
    runGTFS.startExecution(stateMachineArn.value, storeParameters.value)
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
      multiple
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

      <Warning
        :show="error"
        :messages="errorMessage"
      />
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
            :label="$gettext(item.label)"
            :suffix="item.units"
            :hint="showHint? item.hint: ''"
            :persistent-hint="showHint"
            :rules="getRules(item.rules)"
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
          v-for="(item,key) in uploadedGTFS"
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
          :disabled="running || uploadedGTFS.length==0 || isUploading"
          :color="(running || uploadedGTFS.length==0 || isUploading)? 'regular' :'success'"
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
}
</style>
