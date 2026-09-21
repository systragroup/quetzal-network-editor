<script setup lang="ts">
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, watch } from 'vue'
import { ItemSlotBase } from 'vuetify/lib/components/VDataTable/types'
import TableEditor from './tableEditor.vue'
// TODO Move this to component types. its used elsewhere?
export interface DataTableHeaders {
  key: string
  title: string
  parser?: (_value: any) => any
  width?: string
  sortable?: boolean

}

const linksStore = useLinksStore()
const links = computed(() => linksStore.editorLinks)
const lineAttributes = computed(() => linksStore.lineAttributes)

// table header and data

const headers = computed<DataTableHeaders[]>(() => {
  return lineAttributes.value.map(name => { return { key: name, title: name } })
})

const tableItems = computed(() => links.value.features.map(el => el.properties))

// Highlight
import { useHighlight } from '@src/composables/useHighlight'
const { setHighlightData } = useHighlight()

const hoveringIndex = ref<string | null>(null)
function onHover(item: ItemSlotBase<GeoJsonProperties>) { hoveringIndex.value = item.item.index }
function offHover() { hoveringIndex.value = null }
const rowProps = (item: ItemSlotBase<GeoJsonProperties>) => {
  return {
    onMouseenter: () => onHover(item),
  }
}

watch(hoveringIndex, (index) => {
  const features = links.value.features.filter(el => el.properties.index === index)
  setHighlightData(features)
})

// edition stuff

import { RulesRecord } from '@src/types/components.ts'
import { RulesFactory } from '@src/utils/form.ts'
import { EditLinkPayload } from '@src/types/typesStore.ts'

const disabled = ['a', 'b', 'length', 'link_sequence', 'trip_id', 'headway', 'anchors',
  'departures', 'arrivals', 'route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type',
]

const typesMap = computed(() => {
  return Object.fromEntries(linksStore.linksDefaultAttributes.map(el => [el.name, el.type]))
})

const usedIndex = computed<Set<string>>(() => new Set(linksStore.linksIndexes))

function createRules(properties: GeoJsonProperties): RulesRecord {
  const index: string = properties.index
  return {
    index: [
      RulesFactory.unique(index, usedIndex.value),
      RulesFactory.prefix(index ? index.split('_')[0] + '_' : ''),
    ],
  }
}

function applyChanges(event: EditLinkPayload) {
  linksStore.editLinkInfo(event)
}

const selectedIndex = ref<string | null>(null)

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
          v-model="selectedIndex"
          :item="item"
          :columns="lineAttributes"
          :disabled="disabled"
          :create-rules="createRules"
          :types="typesMap"
          @confirm="applyChanges"
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
