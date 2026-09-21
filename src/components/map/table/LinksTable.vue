<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, watch } from 'vue'
import { ItemSlotBase } from 'vuetify/lib/components/VDataTable/types'
import { isDefined } from '@src/utils/utils.ts'
import { RulesRecord } from '@src/types/components.ts'
import { getPropertyName, RulesFactory } from '@src/utils/form.ts'
import { EditLinkPayload } from '@src/types/typesStore.ts'
import { DataTableHeader } from 'vuetify'

import TableEditor from './tableEditor.vue'

const linksStore = useLinksStore()
const links = computed(() => linksStore.editorLinks)
const lineAttributes = computed(() => linksStore.lineAttributes)
const tableItems = computed(() => links.value.features.map(el => el.properties))

const store = useIndexStore()
const displayUnits = computed(() => store.displayUnits)
// table header and data

const headers = computed<DataTableHeader[]>(() => {
  return lineAttributes.value.map(name => {
    const unit = displayUnits.value[getPropertyName(name)]
    let title = name
    if (isDefined(unit)) title = `${title} (${unit})`
    // else
    return { key: name, title: title }
  })
})

// edition stuff

const usedIndex = computed<Set<string>>(() => new Set(linksStore.linksIndexes))

const disabled = ['a', 'b', 'length', 'link_sequence', 'trip_id', 'headway', 'anchors', 'route_id', 'agency_id',
  'route_short_name', 'departures', 'arrivals', 'route_long_name', 'route_type', 'road_link_list',
]

const typesMap = computed(() => {
  return Object.fromEntries(linksStore.linksDefaultAttributes.map(el => [el.name, el.type]))
})

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

const selectedIndex = ref<string | null>(null) // v-model to edit only 1 row of the table at the time

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
          :index="item.index"
          :columns="lineAttributes"
          :disabled="disabled"
          :create-rules="createRules"
          :types="typesMap"
          :display-units="displayUnits"
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
