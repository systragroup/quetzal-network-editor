<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, watch } from 'vue'
import { isDefined } from '@src/utils/utils.ts'
import { GroupForm, RulesRecord } from '@src/types/components.ts'
import { getForm, getPropertyName, RulesFactory } from '@src/utils/form.ts'
import { EditLinkPayload } from '@src/types/typesStore.ts'
import { DataTableHeader } from 'vuetify'
import { cloneDeep } from 'lodash'

import TableEditor from './tableEditor.vue'

const linksStore = useLinksStore()
const store = useIndexStore()

const links = computed(() => linksStore.editorLinks)
const lineAttributes = computed(() => linksStore.lineAttributes)
const tableItems = computed(() => links.value.features.map(el => el.properties))
const baseUnits = computed(() => linksStore.linkUnits)
const displayUnits = computed(() => Object.assign(cloneDeep(baseUnits.value), store.displayUnits))

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

const attributesChoices = computed(() => linksStore.linksAttributesChoices)

const usedIndex = computed<Set<string>>(() => new Set(linksStore.linksIndexes))

const disabled = ['a', 'b', 'length', 'link_sequence', 'trip_id', 'headway', 'anchors', 'route_id', 'agency_id',
  'route_short_name', 'departures', 'arrivals', 'route_long_name', 'route_type', 'road_link_list',
]

const typesMap = computed(() => linksStore.linkTypes)

const rules = ref<RulesRecord>({})

function createRules(properties: GeoJsonProperties) {
  const index: string = properties.index
  rules.value = {
    index: [
      RulesFactory.unique(index, usedIndex.value),
      RulesFactory.prefix(index ? index.split('_')[0] + '_' : ''),
    ],
  }
}

const selectedIndex = ref<string | null>(null) // v-model to edit only 1 row of the table at the time
const editorForm = ref<GroupForm>({})

async function startEdit(index: string) {
  const item = cloneDeep(tableItems.value.filter(el => el.index === index)[0])
  editorForm.value = getForm(item, lineAttributes.value, disabled)
  selectedIndex.value = index
  createRules(item)
}
function applyChanges() {
  if (!selectedIndex.value) return
  const payload: EditLinkPayload = { selectedIndex: selectedIndex.value, info: editorForm.value }
  linksStore.editLinkInfo(payload)
  selectedIndex.value = null
}

// Highlight
import { useHighlight } from '@src/composables/useHighlight'
const { setHighlightData } = useHighlight()

const hoveringIndex = ref<string | null>(null)
function onHover(index: string) {
  hoveringIndex.value = index }
function offHover() { hoveringIndex.value = null }

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
      :item-height="51"
      hide-default-footer
      hover
      @mouseleave="offHover"
    >
      <template #item="{ item }">
        <table-editor
          v-model="selectedIndex"
          :item="item"
          :index="item.index"
          :columns="lineAttributes"
          :editor-form="editorForm"
          :types="typesMap"
          :units="baseUnits"
          :display-units="displayUnits"
          :rules="rules"
          :attributes-choices="attributesChoices"
          @hover="onHover"
          @confirm="applyChanges"
          @edit="startEdit"
        />
      </template>
    </v-data-table-virtual>
  </div>
</template>
<style lang="scss" scoped>

.table-container{
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width:100%;
  height:100%;
  padding:0.5rem;
  background-color: rgb(var(--v-theme-primarydark)) !important;
}
.table{
  width:100%;
  min-height: 50%;
}

</style>
