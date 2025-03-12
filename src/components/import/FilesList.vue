<script setup>
import { readFileAsText, readFileAsBytes } from '@src/utils/io'
import { useIndexStore } from '@src/store/index'
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const emit = defineEmits(['filesLoaded'])

const store = useIndexStore()
const inputFiles = computed(() => { return store.otherFiles.filter(file => file.path.startsWith('inputs')) })
const outputFiles = computed(() => { return store.otherFiles.filter(file =>
  file.path.startsWith('outputs/') || file.path.startsWith('microservices/')) })

function isViz (file, otherFiles) {
  // check to put the little logo if a json has a geojson associated with
  if (file.extension === 'geojson') {
    return true
  } else if (file.extension === 'json') {
    const filtered = otherFiles.filter(el => el.name === file.name).map(el => el.extension)
    return filtered.includes('geojson')
  } else {
    return false
  }
}
const otherOutputs = ref()
const otherInputs = ref()
const choice = ref('')
function buttonHandle (event) {
  choice.value = event
  if (choice.value === 'outputs') {
    otherOutputs.value.click()
    document.getElementById('other-outputs').value = '' // clean it for next file
  } else if (choice.value.startsWith('inputs')) {
    // inputs or a path (if we want to change an existing input)
    otherInputs.value.click()
    document.getElementById('other-inputs').value = '' // clean it for next file
  }
}

async function readOtherFiles (event) {
  // load outputs as Layer Module and as other files (ex: png)
  store.changeLoading(true)
  const fileList = []
  const files = event.target.files
  for (const file of files) {
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
function deleteFile (file) {
  store.deleteotherFiles([file])
  store.changeNotification(
    { text: file + $gettext(' deleted'), autoClose: true, color: 'success' })
}

</script>
<template>
  <input
    id="other-inputs"
    ref="otherInputs"
    type="file"
    style="display: none"
    multiple="multiple"
    @change="readOtherFiles"
  >
  <input
    id="other-outputs"
    ref="otherOutputs"
    type="file"
    style="display: none"
    multiple="multiple"
    @change="readOtherFiles"
  >
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
    <div class="list">
      <li
        v-for="(file, key) in inputFiles"
        :key="key"
      >
        {{ file.path }}
        <v-tooltip
          v-if="isViz(file,inputFiles)"
          location="top"
          open-delay="250"
        >
          <template v-slot:activator="{ props }">
            <v-icon
              size="small"
              class="list-icon"
              v-bind="props"
            >
              fa-solid fa-layer-group
            </v-icon>
          </template>
          <span>{{ $gettext('Viewable in results') }}</span>
        </v-tooltip>
        <div class="list-button">
          <v-tooltip
            location="top"
            open-delay="250"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                variant="text"
                icon="fa-solid fa-upload"
                size="small"
                v-bind="props"
                @click="()=>buttonHandle(file.path)"
              />
            </template>
            <span>{{ $gettext('Replace file inplace') }}</span>
          </v-tooltip>
          <v-btn
            variant="text"
            size="small"
            icon="fa-solid fa-trash"
            @click="()=>deleteFile(file.path)"
          />
        </div>
      </li>
    </div>
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
    <div class="list">
      <li
        v-for="file in outputFiles"
        :key="file.path"
      >
        {{ file.path }}
        <v-tooltip
          v-if="isViz(file,outputFiles)"
          location="top"
          open-delay="250"
        >
          <template v-slot:activator="{ props }">
            <v-icon
              size="small"
              class="list-icon"
              v-bind="props"
            >
              fa-solid fa-layer-group
            </v-icon>
          </template>
          <span>{{ $gettext('Viewable in results') }}</span>
        </v-tooltip>
        <v-btn
          variant="text"
          class="list-button"
          size="small"
          icon="fa-solid fa-trash"
          @click="()=>deleteFile(file.path)"
        />
      </li>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.files-container{
  height:50%;
  border-radius: 5px;
  background:rgb(var(--v-theme-mediumgrey));
  display: flex;
  margin: 0.5rem 0 0;
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
.list-button{
  margin-left:auto;
  display:flex;
  flex-direction:row;
  margin-right:1rem;
}
.list-icon{
  margin-left:0.5rem
}
.list {
  font-size: 1em;
  font-weight: bold;
  overflow-y: auto;
  padding-left: 1rem;
  padding-top:0.5rem
}
.list li {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  align-items: center; /* Align button vertically in the list item */
}

</style>
