<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, watch } from 'vue'
import { isDefined, numericSort } from '@src/utils/utils.ts'
import { GroupForm, RulesRecord } from '@src/types/components.ts'
import { getForm, getPropertyName, RulesFactory } from '@src/utils/form.ts'
import { EditRoadPayload } from '@src/types/typesStore.ts'
import { DataTableHeader } from 'vuetify'
import { cloneDeep } from 'lodash'

import TableEditor from './tableEditor.vue'

const rlinksStore = userLinksStore()
const store = useIndexStore()

const rlinks = computed(() => rlinksStore.rlinks)

// only get _r attributes if there is a rlink that is two way
const hasTwoway = computed(() => rlinks.value.features.some(el => el.properties.oneway === '0'))
const lineAttributes = computed(() => {
  if (hasTwoway.value) return rlinksStore.linksDefaultAttributes.map(el => el.name).sort()
  else return rlinksStore.rlineAttributes
})
const tableItems = computed(() => rlinks.value.features.map(el => el.properties))
const baseUnits = computed(() => rlinksStore.linkUnits)
const displayUnits = computed(() => Object.assign(cloneDeep(baseUnits.value), store.displayUnits))

// table header and data

const headers = computed<DataTableHeader[]>(() => {
  return lineAttributes.value.map(name => {
    const unit = displayUnits.value[getPropertyName(name)]
    let title = name
    if (isDefined(unit)) title = `${title} (${unit})`
    // else
    return { key: name, title: title, sort: numericSort }
  })
})

// edition stuff

const attributesChoices = computed(() => rlinksStore.rlinksAttributesChoices)

const usedIndex = computed<Set<string>>(() => new Set(rlinks.value.features.map(el => el.properties.index)))

const disabled = ['a', 'b', 'length', 'turn_restrictions']

const typesMap = computed(() => rlinksStore.linkTypes)

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
  const payload: EditRoadPayload = { selectedArr: [selectedIndex.value], infoArr: [editorForm.value] }
  rlinksStore.editLinkInfo(payload)
  selectedIndex.value = null
}

// Highlight
import { useFlyTo } from '@src/composables/useFlyTo.ts'
const { setFlyToId } = useFlyTo()

watch(selectedIndex, (index) => {
  setFlyToId(index)
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
