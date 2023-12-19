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
    const loading = ref([])
    const sortModel = ref([])
    const numItems = ref(10)
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
      // create a an array for each table. [false,false,...]
      loading.value = Array(files.length).fill(false)
      sortModel.value = Array(files.length).fill({ key: null, order: null })
      for (const file of files) {
        // const name = file.path.split('/').splice(-1)[0].slice(0, -4)
        const name = file.path.slice(0, -4)
        const data = csvJSON(file.content)
        const headers = []
        Object.keys(data[0]).forEach(val => headers.push({ title: val, key: val, width: '1%' }))
        tables.value.push({ headers, items: data.slice(0, numItems.value), data, name, totalItems: data.length })
      }
      store.changeLoading(false)
      if (tables.value.length === 0) {
        message.value = $gettext('Nothing to display')
      }
    })

    async function getData ({ key, page, itemsPerPage, sortBy }) {
      const start = (page - 1) * itemsPerPage
      const end = start + itemsPerPage
      const items = tables.value[key].data

      if (sortBy.length) {
        const sortKey = sortBy[0].key
        const sortOrder = sortBy[0].order
        if ((sortKey !== sortModel.value[key].key) || (sortOrder !== sortModel.value[key].order)) {
          items.sort((a, b) => {
            const aValue = a[sortKey]
            const bValue = b[sortKey]
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
          })
        }
        sortModel.value[key] = sortBy[0]
      }

      return items.slice(start, end)
    }
    async function loadItems ({ key, page, itemsPerPage, sortBy }) {
      loading.value[key] = true
      const paginated = await getData({ key, page, itemsPerPage, sortBy })
      tables.value[key].items = paginated
      loading.value[key] = false
    }
    return { tables, message, numItems, loadItems, loading }
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
      <v-data-table-server
        :items-per-page="numItems"
        :headers="table.headers"
        :loading="loading[key]"
        :height="table.items.length >= 10 ? '35rem':'auto'"
        :items-length="table.totalItems"
        fixed-header
        fixed-footer
        :items="table.items"
        @update:options="(event)=>loadItems({key,...event})"
      >
        <template v-slot:top>
          <v-toolbar class="custom-title">
            <v-toolbar-title>
              {{ table.name }}
            </v-toolbar-title>
            <v-spacer />
          </v-toolbar>
        </template>
      </v-data-table-server>
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
