<!-- eslint-disable no-case-declarations -->
<script>
import { readFileAsText, readFileAsBytes } from '@comp/utils/utils.js'
import { useIndexStore } from '@src/store/index'
import { computed } from 'vue'
// const $gettext = s => s

export default {
  name: 'FilesList',
  events: ['FilesLoaded'],
  setup () {
    const store = useIndexStore()
    const loadedFiles = computed(() => { return store.otherFiles.map(file => file.path) })
    const inputFiles = computed(() => { return loadedFiles.value.filter(file => file.startsWith('input')) })
    const outputFiles = computed(() => { return loadedFiles.value.filter(file => file.startsWith('output')) })
    const layers = computed(() => {
      // get available layers, reformat name and add .json and .geojson to have the matrix also.
      const layers = store.availableLayers.filter(name => name.startsWith('outputs/'))
      const list = []
      for (const name of layers) {
        list.push(name + '.geojson')
        // TODO
        if (this.$store.getters[`${name}/hasOD`]) {
          list.push(name + '.json')
        }
      }
      return list
    })
    return {
      store,
      loadedFiles,
      inputFiles,
      outputFiles,
      layers,
    }
  },

  methods: {
    buttonHandle (choice) {
      this.choice = choice
      if (this.choice === 'outputs') {
        this.$refs.otherOutputs.click()
        document.getElementById('other-outputs').value = '' // clean it for next file
      } else if (this.choice.startsWith('inputs')) {
        // inputs or a path (if we want to change an existing input)
        this.$refs.otherInputs.click()
        document.getElementById('other-inputs').value = '' // clean it for next file
      }
    },
    async readOtherInputs (event) {
      this.store.changeLoading(true)
      const fileList = []
      const files = event.target.files

      for (const file of files) {
        let name = 'inputs/' + file.name
        // if we want to replace an existing input. this.choice contains the existing path name
        if (this.choice !== 'inputs') {
          name = this.choice
        }
        try {
          const content = await readFileAsBytes(file)
          fileList.push({ content, path: name })
          this.store.changeLoading(false)
        } catch (err) {
          this.store.changeLoading(false)
          this.store.changeAlert(err)
        }
      }
      this.store.changeLoading(false)
      this.$emit('FilesLoaded', fileList)
    },
    async readOtherOutputs (event) {
      // load outputs as Layer Module and as other files (ex: png)
      this.store.changeLoading(true)
      const fileList = []
      const files = event.target.files
      for (const file of files) {
        const name = 'outputs/' + file.name
        try {
          if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
            let content = await readFileAsText(file)
            content = JSON.parse(content)
            fileList.push({ content, path: name })
          } else { // if not a geojson or a json. save as other.
            const content = await readFileAsBytes(file)
            fileList.push({ content, path: name })
          }

          this.store.changeLoading(false)
        } catch (err) {
          this.store.changeLoading(false)
          this.store.changeAlert(err)
        }
      }
      this.store.changeLoading(false)
      this.$emit('FilesLoaded', fileList)
    },

  },
}
</script>
<template>
  <div>
    <input
      id="other-inputs"
      ref="otherInputs"
      type="file"
      style="display: none"
      multiple="multiple"
      @change="readOtherInputs"
    >
    <input
      id="other-outputs"
      ref="otherOutputs"
      type="file"
      style="display: none"
      multiple="multiple"
      @change="readOtherOutputs"
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
          v-for="(path, key) in inputFiles"
          :key="key"
        >
          {{ path }}
          <v-tooltip
            location="top"
            open-delay="250"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                variant="text"
                class="list-button"
                icon=" fa-solid fa-upload"
                v-bind="props"
                @click="()=>buttonHandle(path)"
              />
            </template>
            <span>{{ $gettext('Replace file inplace') }}</span>
          </v-tooltip>
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
          v-for="path in outputFiles"
          :key="path"
        >
          {{ path }}
        </li>
        <li
          v-for="item in layers"
          :key="item"
        >
          {{ item }}
          <v-tooltip
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
        </li>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.files-container{
  height: 17rem;
  border-radius: 5px;
  background:rgb(var(--v-theme-mediumgrey));

  display: flex;
  margin: 10px 0px 0px 00px;
  flex-direction: column;

}
.title-box {
  display: flex;
  flex-direction: row;
  background:rgb(var(--v-theme-lightgrey));

  border-radius: 5px 5px 0px 0px;
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
  margin-right:1rem
}
.list-icon{
  margin-left:0.5rem
}
.list {
  font-size: 1em;
  font-weight: bold;
  //border: 1px solid red;
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
