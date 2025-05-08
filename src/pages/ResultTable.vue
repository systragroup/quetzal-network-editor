<script setup lang="ts">
import s3 from '../AWSClient'
import { ref, onMounted, toRaw, computed } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useUserStore } from '@src/store/user'
import { orderBy } from 'lodash'
import { OtherFiles } from '@src/types/typesStore'
import { WorkerParseCSV } from '@src/utils/io'

interface Header {
  title: string
  key: string
  width: string
}

interface Table {
  headers: Header[]
  items: any
  data: any
  name: string
  totalItems: number

}
const store = useIndexStore()
const userStore = useUserStore()
const tables = ref<Table[]>([])
const skeletons = ref(0)
const numItems = ref(10)
const limit = 40 // 40mb max to display

const csvFiles = computed(() => store.otherFiles.filter(file => file.extension === 'csv'))

async function getFiles () {
  // get the list of CSV from output files.
  // if its undefined (its on s3). fetch it.
  const scenario = userStore.scenario + '/'
  skeletons.value = csvFiles.value.length

  for (const file of csvFiles.value) {
    if (!(file.content instanceof Uint8Array)) {
      file.content = await s3.readBytes(userStore.model, scenario + file.path, limit)
    }
  }
}

async function processCSV(file: OtherFiles) {
  const name = file.path.slice(0, -4)
  let data = []
  if (file.content === null) {
    data = [{ too_large: `cannot display, more than ${limit} mb` }]
  } else {
    data = await WorkerParseCSV(file.content.buffer)
  }
  const headers = Object.keys(data[0]).map(val => { return { title: val, key: val, width: '1%' } })
  tables.value.push({ headers, items: data.slice(0, numItems.value), data, name, totalItems: data.length })
  skeletons.value -= 1
}

onMounted(async () => {
  store.changeLoading(true)
  try {
    await getFiles()
    store.changeLoading(false)
  } catch (err) {
    store.changeAlert(err)
    store.changeLoading(false)
    skeletons.value = 0
  }
  for (const file of csvFiles.value) {
    await processCSV(file)
  }
})

function getData (items: any, page: number, itemsPerPage: number, sortBy: any) {
  const start = (page - 1) * itemsPerPage
  const end = start + itemsPerPage
  if (sortBy.length > 0) {
    const sortKey = sortBy[0].key
    const sortOrder = sortBy[0].order
    items = orderBy(items, sortKey, sortOrder)
  }
  return items.slice(start, end)
}

async function loadItems ({ key, page, itemsPerPage, sortBy }: any) {
  const items = toRaw(tables.value[key].data)
  const paginated = getData(items, page, itemsPerPage, toRaw(sortBy))
  tables.value[key].items = paginated
}

</script>
<template>
  <section class="layout">
    <p v-if="tables.length===0">
      {{ $gettext('nothing to display') }}
    </p>
    <div
      v-for="(table,key) in tables"
      :key="key"
      class="card elevation-3"
    >
      <v-data-table-server
        :items-per-page="numItems"
        :headers="table.headers"
        class="fill-height"
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
      v-if="skeletons > 0"
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
  justify-content: center;
}

</style>
