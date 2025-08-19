<script setup lang="ts">
import { computed, onMounted, ref, toRefs, watch } from 'vue'
import { OtherFiles } from '@src/types/typesStore'

interface Props {
  files: OtherFiles[]
  showDelete?: boolean
  showUpload?: boolean
  showDownload?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  files: () => [],
  showDelete: false,
  showDownload: false,
  showUpload: false,
})
const { files, showDelete, showDownload, showUpload } = toRefs(props)

const emits = defineEmits(['filesLoaded', 'delete', 'upload', 'download'])

interface TreeData {
  title: string
  id: number
  fullpath?: string
  children?: TreeData[]
}

function buildTree(paths: string[]): TreeData[] {
  const result: TreeData[] = []
  const levelMap: any = { result }
  let i = 0

  paths.forEach((path) => {
    const parts = path.split('/')

    parts.reduce((acc: any, title: string, index: number) => {
      const isLeaf = index === parts.length - 1
      if (!acc[title]) {
        const node: TreeData = {
          title,
          id: i,
          fullpath: isLeaf ? path : undefined, // only for leaf nodes
        }
        i += 1
        if (!isLeaf) node.children = []
        acc[title] = { node, result: node.children }
        acc.result.push(node)
      }
      return acc[title]
    }, levelMap)
  })

  return result
}

const treeData = computed(() => buildTree(files.value.map(el => el.path)))

// Get a list of opened dir. if not everyting reopen on changes.

const opened = ref<number[]>([])

function getAllIds(items: TreeData[]): number[] {
  let ids: number[] = []
  items.forEach((item) => {
    ids.push(item.id)
    if (item.children) {
      ids = ids.concat(getAllIds(item.children))
    }
  })
  return ids
}

onMounted(() => {
  opened.value = getAllIds(treeData.value)
})

watch(files, (newVals, oldVals) => {
  if (newVals.length > oldVals.length) {
    opened.value = getAllIds(treeData.value)
  }
})

// no selection
const selected = ref([])

// icons

const icons: Record<string, string> = {
  html: 'fas fa-file-code',
  json: 'fas fa-file-lines',
  geojson: 'fas fa-layer-group',
  csv: 'fas fa-file-csv',
  pdf: 'fas fa-file-pdf',
  png: 'fas fa-file-image',
}

function getIcon (item: TreeData, isOpen: boolean) {
  if (item.children) return isOpen ? 'fas fa-folder-open' : 'fas fa-folder'
  const name = item.title.split('.').at(-1)
  if (name) {
    return icons[name] ?? 'fas fa-file'
  }
}

</script>
<template>
  <v-treeview
    v-model:opened="opened"
    class="treeview"
    :items="treeData"
    density="compact"
    :separate-roots="true"
    :hide-actions="true"
    :indent-lines="true"
    item-value="id"
    open-on-click
    :selected="selected"
    @click:select="(v)=>selected=[]"
  >
    <template
      v-slot:prepend="{ item, isOpen }"
    >
      <v-icon
        :icon="getIcon(item, isOpen)"
        size="small"
      />
    </template>
    <template v-slot:append="{item}">
      <div
        v-if="item.fullpath"
        class="list-button"
      >
        <v-btn
          v-if="showDownload"
          variant="text"
          icon="fa-solid fa-download"
          size="small"
          @click="()=>emits('download',item.fullpath as string)"
        />

        <v-tooltip
          location="top"
          open-delay="250"
        >
          <template v-slot:activator="{ props }">
            <v-btn
              v-if="showUpload"
              variant="text"
              icon="fa-solid fa-upload"
              size="small"
              v-bind="props"
              @click="()=>emits('upload',item.fullpath as string)"
            />
          </template>
          <span>{{ $gettext('Replace file inplace') }}</span>
        </v-tooltip>
        <v-btn
          v-if="showDelete"
          variant="text"
          size="small"
          icon="fa-solid fa-trash"
          @click.stop="()=>emits('delete',item.fullpath as string)"
        />
      </div>
    </template>
  </v-treeview>
</template>
<style lang="scss" scoped>
.list-button{
  display:flex;
  flex-direction:row;
}
.treeview{
  background:rgb(var(--v-theme-mediumgrey));
}

</style>
