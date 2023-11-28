<script>
import s3 from '../AWSClient'
import { csvJSON } from '../components/utils/utils.js'
import { ref, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
const $gettext = s => s

export default {
  name: 'ResultTable',
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const tables = ref([])
    const message = ref('')

    async function getCSV () {
      // get the list of CSV from output files.
      // if its undefined (its on s3). fetch it.
      const scenario = userStore.scenario + '/'
      const otherFiles = store.otherFiles
      const csvFiles = otherFiles.filter(file => file.extension === 'csv')
      for (const file of csvFiles) {
        if (!(file.content instanceof Uint8Array)) {
          file.content = await s3.readBytes(userStore.model, scenario + file.path)
        }
      }
      return csvFiles
    }

    onMounted(async () => {
      store.changeLoading(true)
      const files = await getCSV()
      for (const file of files) {
        // const name = file.path.split('/').splice(-1)[0].slice(0, -4)
        const name = file.path.slice(0, -4)
        const data = csvJSON(file.content)
        const headers = []
        Object.keys(data[0]).forEach(val => headers.push({ title: val, key: val, width: '1%' }))
        tables.value.push({ headers, data, name })
      }
      store.changeLoading(false)
      if (tables.value.length === 0) {
        message.value = $gettext('Nothing to display')
      }
    })

    return { tables, message }
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
      class="card elevation-3"
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
      >
        <template v-slot:top>
          <v-toolbar class="custom-title">
            <v-toolbar-title>
              {{ table.name }}
            </v-toolbar-title>
            <v-spacer />
          </v-toolbar>
        </template>
      </v-data-table>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:rgb(var(--v-theme-background));
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
  background-color:rgb(var(--v-theme-lightergrey));
}

.custom-title {
  height:3rem;
  align-content: center  !important;
}

</style>
