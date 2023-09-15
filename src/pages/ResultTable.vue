<script>
import s3 from '../AWSClient'
import { csvJSON } from '../components/utils/utils.js'
const $gettext = s => s

export default {
  name: 'ResultTable',
  components: {
  },
  data () {
    return {
      tables: [],
      message: '',
    }
  },
  watch: {

  },
  async created () {
    this.$store.commit('changeLoading', true)
    const files = await this.getCSV()
    for (const file of files) {
      // const name = file.path.split('/').splice(-1)[0].slice(0, -4)
      const name = file.path.slice(0, -4)
      const data = csvJSON(file.content)
      const headers = []
      Object.keys(data[0]).forEach(val => headers.push({ text: val, value: val, width: '1%' }))
      this.tables.push({ headers: headers, data: data, name: name })
    }
    this.$store.commit('changeLoading', false)
    if (this.tables.length === 0) {
      this.message = $gettext('Nothing to display')
    }
  },

  methods: {
    async getCSV () {
      // get the list of CSV from output files.
      // if its undefined (its on s3). fetch it.
      const scenario = this.$store.getters.scenario + '/'
      const otherFiles = this.$store.getters.otherFiles
      const csvFiles = otherFiles.filter(file => file.path.endsWith('.csv'))
      for (const file of csvFiles) {
        if (!(file.content instanceof Uint8Array)) {
          file.content = await s3.readBytes(this.$store.getters.model, scenario + file.path)
        }
      }
      return csvFiles
    },

  },
}
</script>
<template>
  <section class="layout">
    <p v-if="tables.length===0">
      {{ $gettext(message) }}
    </p>
    <v-card
      v-for="(table,key) in tables"
      :key="key"
      class="card"
    >
      <v-data-table
        :headers="table.headers"
        :height="table.data.length >= 10 ? '35rem':'auto'"
        fixed-header
        fixed-footer
        :items="table.data"
        :items-per-page="10"
        :footer-props="{
          'items-per-page-options': table.data.length <= 500? [10, 20, 100, 200, -1] : [10, 20, 100, 200, 500]
        }"
        class="elevation-3"
      >
        <template v-slot:top>
          <v-toolbar
            flat
          >
            <v-toolbar-title>{{ table.name }}</v-toolbar-title>

            <v-spacer />
          </v-toolbar>
        </template>
      </v-data-table>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:var(--v-white-base);
  display: flex;
  height: 100%;
  width:100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
.card {
  width:80%;
  margin: 10px;
}

</style>
