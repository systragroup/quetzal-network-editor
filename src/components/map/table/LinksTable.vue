<script setup lang="ts">
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, watch } from 'vue'
import { ItemSlotBase } from 'vuetify/lib/components/VDataTable/types'

export interface DataTableHeaders {
  key: string
  title: string
  parser?: (_value: any) => any
  width?: string
  sortable?: boolean

}

const linksStore = useLinksStore()

// const links = computed(() => linksStore.links)
const links = computed(() => linksStore.editorLinks)

const lineAttributes = computed(() => linksStore.lineAttributes)

const headers = computed<DataTableHeaders[]>(() => {
  return lineAttributes.value.map(name => {
    return { key: name, title: name }
  })
})

const tableItems = computed(() => links.value.features.map(el => el.properties))

const hoveringIndex = ref<string | null>(null)
function onHover(item: ItemSlotBase<GeoJsonProperties>) { hoveringIndex.value = item.item.index }
function offHover() { hoveringIndex.value = null }
const rowProps = (item: ItemSlotBase<GeoJsonProperties>) => {
  return {
    onMouseenter: () => onHover(item),
    // ondblclick: () => click(item),
  }
}
import { useHighlight } from '@src/composables/useHighlight'
const { setHighlightData } = useHighlight()

watch(hoveringIndex, (index) => {
  const features = links.value.features.filter(el => el.properties.index === index)
  setHighlightData(features)
})

import TableEditor from './tableEditor.vue'
</script>
<template>
  <div class="table-container">
    <v-data-table-virtual
      class="table"
      :fixed-header="true"
      :sticky="true"
      :headers="headers"
      :items="tableItems"
      :item-value="'index'"
      :height="100"
      hide-default-footer
      :row-props="rowProps"
      hover
      @mouseleave="offHover"
    >
      <template #item="{ item }">
        <table-editor
          :item="item"
          :columns="lineAttributes"
        />
      </template>
    </v-data-table-virtual>
  </div>
</template>
<style lang="scss" scoped>

.table-container{
  display: flex;
  flex-direction: column;
  height:100%;
  overflow: auto;
  width:100%;
  padding:0.5rem;
  background-color: rgb(var(--v-theme-primarydark)) !important;

}
.table{
  height:100%;
  width:100%;
}

</style>
