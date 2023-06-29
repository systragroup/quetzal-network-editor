<!-- eslint-disable no-case-declarations -->
<script>

// const $gettext = s => s

export default {
  name: 'FilesList',

  data () {
    return {
      filesPanel: [0, 1],
    }
  },

  computed: {
    loadedFiles () { return this.$store.getters.loadedFiles },
    inputFiles () { return this.loadedFiles.filter(file => file.name.startsWith('input')) },
    outputFiles () { return this.loadedFiles.filter(file => file.name.startsWith('output')) },
  },

  mounted () {
    console.log(this.loadedFiles)
  },
}
</script>
<template>
  <section>
    <v-expansion-panels
      v-model="filesPanel"
      multiple
    >
      <v-expansion-panel>
        <v-expansion-panel-header
          class="categorie"
        >
          {{ $gettext('Other Inputs') }}
        </v-expansion-panel-header>
        <v-expansion-panel-content class="files-container">
          <li
            v-for="(item, key) in inputFiles"
            :key="key"
          >
            <p>{{ item.name }}</p>
          </li>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header
          class="categorie"
        >
          {{ $gettext('Outputs') }}
        </v-expansion-panel-header>
        <v-expansion-panel-content class="files-container">
          <li
            v-for="(item, key) in outputFiles"
            :key="key"
          >
            <p>{{ item.name }}</p>
          </li>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </section>
</template>
<style lang="scss" scoped>
.files-container{
  height: 10rem;
  background:var(--v-background-lighten4);
  overflow-y: auto;
}
.categorie {
  font-size: 1.5em;
  font-weight: bold;
  background:var(--v-background-lighten3);
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 2em !important;
  color: var(--v-primary-base);
  font-weight: bold;
  margin-top:30px;
}
.subtitle {
  font-size: 1.5em;
  font-weight: bold;
  margin: 20px;
}
</style>
