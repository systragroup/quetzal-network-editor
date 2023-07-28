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
    loadedFiles () { return this.$store.getters.otherFiles.map(file => file.path) },
    inputFiles () { return this.loadedFiles.filter(file => file.startsWith('input')) },
    outputFiles () { return this.loadedFiles.filter(file => file.startsWith('output')) },
    layers () {
      // get available layers, reformat name and add .json and .geojson to have the matrix also.
      const layers = this.$store.getters.availableLayers.filter(name => name.startsWith('outputs/'))
      const list = []
      for (const name of layers) {
        list.push(name + '.geojson')
        if (this.$store.getters[`${name}/hasOD`]) {
          list.push(name + '.json')
        }
      }
      return list
    },
  },

  mounted () {
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
          v-for="(path, key) in inputFiles"
          :key="key"
        >
          {{ path }}
          <v-tooltip
            top
            open-delay="250"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-bind="attrs"
                class="list-button"
                icon
                v-on="on"
                @click="()=>$emit('importButton',path)"
              >
                <v-icon small>
                  fa-solid fa-upload
                </v-icon>
              </v-btn>
            </template>
            <span>{{ $gettext('Replace file inplace') }}</span>
          </v-tooltip>
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
            top
            open-delay="250"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                v-bind="attrs"
                small
                class="list-icon"
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
