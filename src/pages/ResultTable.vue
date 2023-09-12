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
    const model = this.$store.getters.model
    const scenario = this.$store.getters.scenario
    const outputsFiles = await s3.listFiles(model, scenario + '/outputs')
    const filesNames = outputsFiles.filter(name => name.endsWith('.csv'))
    for (const file of filesNames) {
      const name = file.split('/').splice(-1)[0].slice(0, -4)
      console.log(name)
      const bytes = await s3.readBytes(this.$store.getters.model, file)
      const data = csvJSON(bytes)
      const headers = []
      Object.keys(data[0]).forEach(val => headers.push({ text: val, value: val }))
      this.tables.push({ headers: headers, data: data, name: name })
    }
    this.$store.commit('changeLoading', false)
    if (this.tables.length === 0) {
      this.message = $gettext('Nothing to display')
    }
  },

  methods: {

  },
}
</script>
<template>
  <section class="layout">
    <div
      v-for="(table,key) in tables"
      :key="key"
    >
      <v-card
        class="card"
      >
        <v-data-table
          :headers="table.headers"
          calculate-widths="true"
          :height="'40rem'"
          fixed-header
          fixed-footer
          :items="table.data"
          :items-per-page="-1"
          :footer-props="{
            'items-per-page-options': [10, 20,100,200,-1]
          }"
          class="elevation-3"
        >
          <template v-slot:top>
            <v-toolbar
              flat
            >
              <v-toolbar-title>{{ table.name }}</v-toolbar-title>
              <v-divider
                class="mx-4"
                vertical
                inset
              />
              <v-spacer />
            </v-toolbar>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:var(--v-white-base);
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
.card {

  margin: 5px;
}

</style>
