<!-- eslint-disable no-case-declarations -->
<script>

const $gettext = s => s

export default {
  name: 'FilesList',

  data () {
    return {
      filesPanel: 0,
    }
  },

  computed: {
    loadedFiles () { return this.$store.getters.loadedFiles },
  },

  mounted () {

  },
}
</script>
<template>
  <section>
    <v-expansion-panels
      v-model="filesPanel"
      readonly
    >
      <v-expansion-panel>
        <v-expansion-panel-header
          hide-actions
          class="categorie"
        >
          {{ $gettext('Other Files') }}
        </v-expansion-panel-header>
        <v-expansion-panel-content class="files-container">
          <li
            v-for="(item, key) in loadedFiles"
            :key="key"
          >
            <p>{{ item }}</p>
          </li>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>
  </section>
</template>
<style lang="scss" scoped>
.files-container{
  height: 20rem;
  background:var(--v-background-lighten4);
  overflow-y: auto;
  overflow-x:hidden;
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
