<script>
import s3 from '../AWSClient'
import { csvJSON } from '../components/utils/io'
import { ref, onMounted, toRaw } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { useWebWorkerFn } from '@vueuse/core'
import { orderBy } from 'lodash'
const $gettext = s => s
const { workerFn: csvJSONWorker } = useWebWorkerFn(csvJSON)

export default {
  name: 'ResultTable',
  setup () {
    const store = useIndexStore()
    const userStore = useUserStore()
    const tables = ref([])
    const message = ref('')
    const skeletons = ref(0)
    const numItems = ref(10)
    const limit = 40 // 40mb max to display

    async function getCSV () {
      // get the list of CSV from output files.
      // if its undefined (its on s3). fetch it.
      const scenario = userStore.scenario + '/'
      const otherFiles = store.otherFiles
      const csvFiles = otherFiles.filter(file => file.extension === 'csv')
      skeletons.value = csvFiles.length

      for (const file of csvFiles) {
        if (!(file.content instanceof Uint8Array)) {
          file.content = await s3.readBytes(userStore.model, scenario + file.path, limit)
        }
      }
      return csvFiles
    }

    onMounted(async () => {
      store.changeLoading(true)
      try {
        const files = await getCSV()

        for (const file of files) {
        // const name = file.path.split('/').splice(-1)[0].slice(0, -4)
          const name = file.path.slice(0, -4)
          const data = (file.content !== null)
            ? await csvJSONWorker(file.content.buffer)
            : [{ too_large: `cannot display, more than ${limit} mb` }]

          const headers = []
          Object.keys(data[0]).forEach(val => headers.push({ title: val, key: val, width: '1%' }))
          tables.value.push({ headers, items: data.slice(0, numItems.value), data, name, totalItems: data.length })
          skeletons.value -= 1
        }
        store.changeLoading(false)
        if (tables.value.length === 0) {
          message.value = $gettext('Nothing to display')
        }
      } catch (err) {
        console.error(err)
        store.changeLoading(false)
        skeletons.value = 0
        message.value = $gettext('Nothing to display')
      }
    })

    function getData (items, page, itemsPerPage, sortBy) {
      const start = (page - 1) * itemsPerPage
      const end = start + itemsPerPage
      if (sortBy.length > 0) {
        const sortKey = sortBy[0].key
        const sortOrder = sortBy[0].order
        items = orderBy(items, sortKey, sortOrder)
      }
      return items.slice(start, end)
    }
    async function loadItems ({ key, page, itemsPerPage, sortBy }) {
      const items = toRaw(tables.value[key].data)
      const paginated = getData(items, page, itemsPerPage, toRaw(sortBy))
      tables.value[key].items = paginated
    }
    return { tables, message, numItems, loadItems, skeletons }
  },
}

</script>
<template>
  <section class="layout">
    <p v-if="tables.length===0">
      {{ $gettext(message) }}
    </p>
    <div
      v-for="(table,key) in tables"
      :key="key"
      class="card elevation-3"
    >
      <v-data-table-server
        :items-per-page="numItems"
        :headers="table.headers"
        :height="table.items.length >= 10 ? '36rem':'auto'"
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
    </div>
    <div
      v-if="skeletons>0"
      class="card elevation-3"
    >
      <v-skeleton-loader
        type="heading,table-thead, table-tbody "
      />
    </div>
  </section>
</template>
<style lang="scss" scoped>

.layout {
  background-color:rgb(var(--v-theme-white));
  color:rgb(var(--v-theme-black));
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  overflow-y: scroll;
  padding-top: 15px;
  padding-bottom: 60px;
}
.card {
  width:80%;
  height:100%;
  margin: 10px;
  background-color:rgb(var(--v-theme-lightergrey));

}
.custom-title {
  height:3rem;
  align-content: center  !important;

}

</style>
