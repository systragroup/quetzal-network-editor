<!-- eslint-disable no-case-declarations -->
<script>

// const $gettext = s => s

export default {
  name: 'FilesList',
  events: ['importButton'],

  data () {
    return {
      filesPanel: [0, 1],
    }
  },

  computed: {
    loadedFiles () { return this.$store.getters.loadedFiles },
    inputFiles () { return this.loadedFiles.filter(file => file.name.startsWith('input')) },
    outputFiles () { return this.loadedFiles.filter(file => file.name.startsWith('output')) },
    layers () {
      // get available layers, reformat name and add .json and .geojson to have the matrix also.
      const layers = this.$store.getters.availableLayers.filter(name => name.startsWith('outputs/'))
      const list = []
      for (const name of layers) {
        list.push(name + '.geojson')
        list.push(name + '.json')
      }
      return list
    },
  },

  mounted () {
    console.log(this.layers)
  },
}
</script>
<template>
  <div>
    <div class="files-container">
      <div class="title-box">
        <h1 class="title">
          {{ $gettext('Other Inputs') }}
        </h1>
        <div class="upload-button">
          <v-btn
            icon
            outlined
            @click="()=>$emit('importButton','inputs')"
          >
            <v-icon small>
              fa-solid fa-upload
            </v-icon>
          </v-btn>
        </div>
      </div>
      <div class="list">
        <li
          v-for="(item, key) in inputFiles"
          :key="key"
        >
          {{ item.name }}
        </li>
      </div>
    </div>
    <div class="files-container">
      <div class="title-box">
        <h1 class="title">
          {{ $gettext('Outputs') }}
        </h1>
        <div class="upload-button">
          <v-btn
            icon
            outlined
            @click="()=>$emit('importButton','outputs')"
          >
            <v-icon small>
              fa-solid fa-upload
            </v-icon>
          </v-btn>
        </div>
      </div>
      <div class="list">
        <li
          v-for="(item, key) in outputFiles"
          :key="key"
        >
          {{ item.name }}
          <v-tooltip
            top
            open-delay="250"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                v-if="layers.includes(item.name)"
                v-bind="attrs"
                small
                v-on="on"
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
  height: 13rem;
  border-radius: 5px;
  background:var(--v-background-lighten4);
  display: flex;
  margin: 10px 0px 0px 00px;
  flex-direction: column;

}
.title-box {
  display: flex;
  flex-direction: row;
  background:var(--v-background-lighten3);

  border-radius: 5px 5px 0px 0px;
  padding: 0.5rem 0.5rem 0.5rem 1rem;

}
.title{
  font-size: 2em !important;
  font-weight: bold;
}
.upload-button {
  margin-left: auto;
}
.list {
  font-size: 1em;
  font-weight: bold;
  //border: 1px solid red;
  overflow-y: auto;
  padding: 1rem;
}

</style>
