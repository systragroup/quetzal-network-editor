<!-- eslint-disable no-case-declarations -->
<script>
import { serializer } from '@comp/utils/serializer.js'
import { readFileAsText } from '@comp/utils/utils.js'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { useRunStore } from '@src/store/run'
import { computed, ref } from 'vue'
// const $gettext = s => s

export default {
  name: 'FileLoader',
  events: ['FilesLoaded'],
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const linksStore = useLinksStore()
    const rlinksStore = userLinksStore()
    const ODStore = useODStore()
    const runStore = useRunStore()

    const loadedLinks = ref({})
    const loadedNodes = ref({})
    const loadedType = ref('')
    const choice = ref('')
    const projectIsEmpty = computed(() => store.projectIsEmpty)

    const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })
    const linksIsEmpty = computed(() => { return linksStore.linksIsEmpty })
    const ODIsEmpty = computed(() => { return ODStore.layerIsEmpty })
    const paramsIsEmpty = computed(() => { return runStore.parametersIsEmpty })
    const stylesIsEmpty = computed(() => { return store.styles.length === 0 })
    const localLinksLoaded = computed(() => { return Object.keys(loadedLinks.value).length !== 0 })
    const localNodesLoaded = computed(() => { return Object.keys(loadedNodes.value).length !== 0 })
    const localFilesAreLoaded = computed(() => { return (localLinksLoaded.value && localNodesLoaded.value) })

    return {
      store,
      userStore,
      loadedLinks,
      loadedNodes,
      loadedType,
      choice,
      projectIsEmpty,
      rlinksIsEmpty,
      linksIsEmpty,
      ODIsEmpty,
      paramsIsEmpty,
      stylesIsEmpty,
      localLinksLoaded,
      localNodesLoaded,
      localFilesAreLoaded,
    }
  },

  watch: {

    localFilesAreLoaded (val) {
      if (val) {
        let files = []
        if (this.loadedType === 'PT') {
          files = [
            { path: 'inputs/pt/links.geojson', content: this.loadedLinks },
            { path: 'inputs/pt/nodes.geojson', content: this.loadedNodes },
          ]
        } else {
          files = [
            { path: 'inputs/road/links.geojson', content: this.loadedLinks },
            { path: 'inputs/road/nodes.geojson', content: this.loadedNodes },
          ]
        }
        this.$emit('FilesLoaded', files)
        this.loadedLinks = {}
        this.loadedNodes = {}
        this.loadedType = ''
      }
    },

  },

  methods: {
    buttonHandle (choice) {
      this.choice = choice
      if (this.choice === 'parameters') {
        this.$refs.paramsInput.click()
        document.getElementById('params-input').value = '' // clean it for next file
      } else if (this.choice === 'styles') {
        this.$refs.stylesInput.click()
        document.getElementById('styles-input').value = '' // clean it for next file
      } else if (['PT links', 'PT nodes', 'road links', 'road nodes', 'od'].includes(this.choice)) {
        this.$refs.fileInput.click()
        document.getElementById('file-input').value = '' // clean it for next file
      }
    },

    async readParams (event) {
      this.store.changeLoading(true)
      const files = event.target.files
      try {
        let data = await readFileAsText(files[0])
        data = JSON.parse(data)
        this.$emit('FilesLoaded', [{ path: 'inputs/params.json', content: data }])
        this.store.changeLoading(false)
      } catch (err) {
        this.store.changeLoading(false)
        this.store.changeAlert(err)
      }
    },
    async readStyles (event) {
      this.store.changeLoading(true)
      const files = event.target.files
      try {
        let data = await readFileAsText(files[0])
        data = JSON.parse(data)
        this.$emit('FilesLoaded', [{ path: 'styles.json', content: data }])
        this.store.changeLoading(false)
      } catch (err) {
        this.store.changeLoading(false)
        this.store.changeAlert(err)
      }
    },
    async readFile (event) {
      this.store.changeLoading(true)
      const files = event.target.files
      // it is a geojson
      if (files[0].name.slice(-7) !== 'geojson') {
        this.store.changeLoading(false)
        this.store.changeAlert({ name: 'ImportError', message: 'File must be a geojson' })
        return
      }
      const name = files[0].name

      try {
        let data = await readFileAsText(files[0])
        data = JSON.parse(data)
        switch (this.choice) {
          case 'PT links':
            this.loadedLinks = serializer(data, name, 'LineString')
            this.loadedType = 'PT'
            break
          case 'PT nodes':
            this.loadedNodes = serializer(data, name, 'Point')
            this.loadedType = 'PT'
            break
          case 'road links':
            this.loadedLinks = serializer(data, name, 'LineString')
            this.loadedType = 'road'
            break
          case 'road nodes':
            this.loadedNodes = serializer(data, name, 'Point')
            this.loadedType = 'road'
            break
          case 'od':
            this.$emit('FilesLoaded', [{ path: 'inputs/od/od.geojson', content: data }])
            break
          default:
            console.log('autre')
        }
        this.store.changeLoading(false)
      } catch (err) {
        this.store.changeLoading(false)
        this.store.changeAlert(err)
      }
    },
  },
}
</script>
<template>
  <div>
    <input
      id="file-input"
      ref="fileInput"
      type="file"
      style="display: none"
      accept=".geojson"
      @change="readFile"
    >
    <input
      id="params-input"
      ref="paramsInput"
      type="file"
      style="display: none"
      accept=".json"
      @change="readParams"
    >
    <input
      id="styles-input"
      ref="stylesInput"
      type="file"
      style="display: none"
      accept=".json"
      @change="readStyles"
    >
    <div class="row">
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': linksIsEmpty? '0.50':'1'}"
        >
          fas fa-project-diagram
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': linksIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('PT Network') }}
          <v-icon
            v-if="!linksIsEmpty"
            class="check-icon"
            color="success"
          >
            fas fa-check
          </v-icon>
        </div>

        <div class="element">
          <v-menu
            close-delay="100"
            transition="slide-y-transition"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                icon="fa-solid fa-upload"
                size="small"
                color="regular"
                variant="outlined"
                v-bind="props"
              />
            </template>
            <v-list>
              <v-list-item
                link
                :disabled="loadedType=='road' || localLinksLoaded"
                @click="()=>buttonHandle('PT links')"
              >
                <v-list-item-title>
                  {{ $gettext('Links') }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                link
                :disabled="loadedType=='road' || localNodesLoaded"
                @click="()=>buttonHandle('PT nodes')"
              >
                <v-list-item-title>
                  {{ $gettext('Nodes') }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': rlinksIsEmpty? '0.50':'1'}"
        >
          fas fa-project-diagram
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': rlinksIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Road Network') }}
          <v-icon
            v-if="!rlinksIsEmpty"
            class="check-icon"
            size="small"
            color="success"
          >
            fas fa-check
          </v-icon>
        </div>

        <div class="element">
          <v-menu
            close-delay="100"
            transition="slide-y-transition"
          >
            <template v-slot:activator="{ props }">
              <v-btn
                icon="fa-solid fa-upload"
                variant="outlined"
                size="small"
                v-bind="props"
              />
            </template>
            <v-list>
              <v-list-item
                link
                :disabled="loadedType=='PT' || localLinksLoaded"
                @click="()=>buttonHandle('road links')"
              >
                <v-list-item-title>
                  {{ $gettext('Links') }}
                </v-list-item-title>
              </v-list-item>
              <v-list-item
                link
                :disabled="loadedType=='PT' || localNodesLoaded"
                @click="()=>buttonHandle('road nodes')"
              >
                <v-list-item-title>
                  {{ $gettext('Nodes') }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': ODIsEmpty? '0.50':'1'}"
        >
          fas fa-exchange-alt
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': ODIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Origin - Destination') }}
          <v-icon
            v-if="!ODIsEmpty"
            class="check-icon"
            color="success"
            size="small"
          >
            fas fa-check
          </v-icon>
        </div>

        <div class="element">
          <v-btn
            icon="fa-solid fa-upload"
            size="small"
            variant="outlined"
            @click="()=>buttonHandle('od')"
          />
        </div>
      </div>
    </div>
    <v-divider />
    <div class="row">
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': paramsIsEmpty? '0.50':'1'}"
        >
          fas fa-cog
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': paramsIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Parameters') }}
          <v-icon
            v-if="!paramsIsEmpty"
            class="check-icon"
            color="success"
            size="small"
          >
            fas fa-check
          </v-icon>
        </div>

        <div class="element">
          <v-btn
            icon="fa-solid fa-upload"
            variant="outlined"
            size="small"
            @click="()=>buttonHandle('parameters')"
          />
        </div>
      </div>
      <div class="container">
        <v-icon
          class="type-icon"
          :style="{'opacity': stylesIsEmpty? '0.50':'1'}"
        >
          fas fa-palette
        </v-icon>
        <div
          class="subtitle"
          :style="{'opacity': stylesIsEmpty? '0.50':'1'}"
        >
          {{ $gettext('Style presets') }}
          <v-icon
            v-if="!stylesIsEmpty"
            class="check-icon"
            color="success"
            size="small"
          >
            fas fa-check
          </v-icon>
        </div>

        <div class="element">
          <v-btn
            icon="fa-solid fa-upload"
            size="small"
            variant="outlined"
            @click="()=>buttonHandle('styles')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.row{
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-bottom: 30px;
  padding-top:18px;

}
.container{
  display: flex;
  width:100%;
  padding: 0rem 1rem 0rem 1rem;
  margin: 0.3rem 0rem 0.3rem 0rem;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;

}
.type-icon{
  padding-right: 3rem;
}
.element{
  margin-left: auto;
}
.check-icon{
  padding-left: 1rem;
}
.subtitle {
  flex:2;
  font-size: 1.5em;
  font-weight: bold;
}
</style>
