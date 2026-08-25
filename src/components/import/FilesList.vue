<script setup lang="ts">
import { readFileAsText, readFileAsBytes } from '@src/utils/io'
import { useIndexStore } from '@src/store/index'
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import TreeView from './TreeView.vue'
import PromiseDialog from '../utils/PromiseDialog.vue'
import { cloneDeep } from 'lodash'
import { Rule } from '@src/types/components.ts'
const { $gettext } = useGettext()

const emit = defineEmits(['filesLoaded'])

const store = useIndexStore()
const inputFiles = computed(() => { return store.otherFiles.filter(file => file.path.startsWith('inputs')) })
const outputFiles = computed(() => { return store.otherFiles.filter(file =>
  file.path.startsWith('outputs/') || file.path.startsWith('microservices/')) })

const otherOutputsRef = ref()
const otherInputsRef = ref()
const choice = ref('')
function buttonHandle (event: string) {
  choice.value = event
  if (choice.value === 'outputs') {
    otherOutputsRef.value.click()
    const el = document.getElementById('other-outputs') as HTMLInputElement
    if (el) el.value = '' // clean it for next file
  } else if (choice.value === 'inputs') {
    otherInputsRef.value.accept = '*'
    otherInputsRef.value.click()
    const el = document.getElementById('other-inputs') as HTMLInputElement
    if (el) el.value = '' // clean it for next file
  } else if (choice.value.startsWith('inputs')) {
    // change an input
    otherInputsRef.value.accept = '.' + choice.value.split('.').at(-1)
    otherInputsRef.value.click()
    const el = document.getElementById('other-inputs') as HTMLInputElement
    if (el) el.value = '' // clean it for next file
  }
}

async function readOtherFiles (event: Event) {
  // load outputs as Layer Module and as other files (ex: png)
  store.changeLoading(true)
  const fileList = []
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return
  for (const file of Array.from(files)) {
    let name = choice.value + '/' + file.name // inputs/ or outputs/
    // if we want to replace an existing input. this.choice contains the existing path name
    if (!['inputs', 'outputs'].includes(choice.value)) {
      name = choice.value
    }
    try {
      if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        let content = await readFileAsText(file)
        content = JSON.parse(content)
        fileList.push({ content, path: name })
      } else { // if not a geojson or a json. save as other.
        const content = await readFileAsBytes(file)
        fileList.push({ content, path: name })
      }
      store.changeLoading(false)
    } catch (err) {
      store.changeLoading(false)
      store.changeAlert(err)
    }
  }
  store.changeLoading(false)
  emit('filesLoaded', fileList)
}

function deleteFile (filePath: string) {
  store.deleteotherFiles([filePath])
  store.changeNotification({ text: filePath + $gettext(' deleted'), autoClose: true, color: 'success' })
}

function downloadFile(filePath: string) {
  store.exportFile(filePath)
}

const newPath = ref('')
const rules = ref<Rule[]>([])
const renameDialog = ref()

async function renameFile(filePath: string) {
  newPath.value = cloneDeep(filePath)
  const prefix = filePath.split('/')[0] + '/'
  const suffix = '.' + filePath.split('.').slice(-1)[0]
  rules.value = [
    (val: string) => val.startsWith(prefix) || $gettext('must start with prefix %{prefix}', { prefix: prefix }),
    (val: string) => val.endsWith(suffix) || $gettext('must end with extension %{suffix}', { suffix: suffix }),
  ]

  const resp = await renameDialog.value.openDialog()
  if (newPath.value === filePath) return
  if (resp) {
    try {
      await store.renameOtherFile(filePath, newPath.value)
    } catch (err) {
      store.changeAlert(err)
    } finally {
      newPath.value = ''
    }
  }
}

</script>
<template>
  <input
    id="other-inputs"
    ref="otherInputsRef"
    type="file"
    style="display: none"
    accept=".geojson"
    multiple
    @change="readOtherFiles"
  >
  <input
    id="other-outputs"
    ref="otherOutputsRef"
    type="file"
    style="display: none"
    multiple
    @change="readOtherFiles"
  >
  <div class="container">
    <div class="files-container">
      <div class="title-box">
        <h1 class="custom-title">
          {{ $gettext('Other Inputs') }}
        </h1>
        <div class="upload-button">
          <v-btn
            icon
            variant="outlined"
            @click="()=>buttonHandle('inputs')"
          >
            <v-icon size="small">
              fa-solid fa-upload
            </v-icon>
          </v-btn>
        </div>
      </div>
      <TreeView
        :files="inputFiles"
        :show-delete="true"
        :show-upload="true"
        :show-rename="true"
        @delete="deleteFile"
        @upload="buttonHandle"
        @rename="renameFile"
      />
    </div>
    <div class="files-container">
      <div class="title-box">
        <h1 class="custom-title">
          {{ $gettext('Outputs') }}
        </h1>
        <div class="upload-button">
          <v-btn
            icon
            variant="outlined"
            @click="()=>buttonHandle('outputs')"
          >
            <v-icon size="small">
              fa-solid fa-upload
            </v-icon>
          </v-btn>
        </div>
      </div>
      <TreeView
        :files="outputFiles"
        :show-delete="true"
        :show-download="true"
        :show-rename="false"
        @delete="deleteFile"
        @download="downloadFile"
      />
    </div>
  </div>
  <PromiseDialog
    ref="renameDialog"
    confirm-color="primary"
  >
    <v-text-field
      v-model="newPath"
      variant="underlined"
      autofocus
      :rules="rules"
      :label="$gettext('name')"
    />
  </PromiseDialog>
</template>
<style lang="scss" scoped>
.container{
  height:100%;
  display: flex;
  gap:0.5rem;
  flex-direction: column;
}
.files-container{
  height:calc(50% - 4px);
  border-radius: 5px;
  background:rgb(var(--v-theme-mediumgrey));
  display: flex;
  flex-direction: column;
}
.title-box {
  display: flex;
  flex-direction: row;
  background:rgb(var(--v-theme-lightgrey));
  border-radius: 5px 5px 0 0;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
}
.custom-title{
  font-size: 2em !important;
  font-weight: bold;
}
.upload-button {
  margin-left: auto;
  margin-right:0.75rem
}

</style>
