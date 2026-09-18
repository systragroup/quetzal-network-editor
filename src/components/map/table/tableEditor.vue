<script setup lang="ts">
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, ref, toRefs } from 'vue'
import { FormFormat, GroupForm, Rule } from '@src/types/components'
import NumberInput from '@src/components/common/NumberInput.vue'
import BooleanInput from '@src/components/common/BooleanInput.vue'
import { AttributeTypes } from '@src/types/typesStore'
import { changeLengthTimeSpeed, getRules, hasCalculator, RulesFactory } from '@src/utils/form'

interface Props {
  item: GeoJsonProperties
  propKey: string
  cellKey: string
}

const props = defineProps<Props>()
const { propKey, item, cellKey } = toRefs(props)

const editing = defineModel<string | null>()

const linksStore = useLinksStore()
// const tripSet = computed(() => new Set(linksStore.tripList))

const inputRef = ref()

const selectedIndex = ref<string>('')
const editorForm = ref<GroupForm>({})

const usedIndex = computed<Set<string>>(() => new Set(linksStore.linksIndexes))
const rules = ref<Rule[]>([])
function createRules(key: string, index: string) {
  rules.value = ['required']
  if (key == 'index') {
    rules.value.push(RulesFactory.unique(index, usedIndex.value))
    rules.value.push(RulesFactory.prefix(index ? index.split('_')[0] + '_' : ''))
  }
  // if (key === 'trip_id') {
  //   rules.value.push(RulesFactory.unique(val, tripSet.value))
  // }
}

function startEdit(item: GeoJsonProperties, selectedKey: string) {
  editing.value = cellKey.value
  selectedIndex.value = item.index
  editorForm.value = {}
  Object.keys(item).forEach((key: string) => {
    const data: FormFormat = {
      value: item[key],
      disabled: false,
      show: true,
      placeholder: false,
    }
    editorForm.value[key] = data
  })

  inputRef.value?.select()
  createRules(selectedKey, item[selectedKey])
}

async function saveEdit() {
  const errors = await inputRef.value.validate()
  const valid = errors.length == 0
  if (valid) {
    // Commit
    changeLengthTimeSpeed(propKey.value, editorForm.value)
    linksStore.editLinkInfo({ selectedIndex: selectedIndex.value, info: editorForm.value })
    editing.value = null
  }
}

function cancelEdit() {
  editing.value = null
}
function componentType(type: AttributeTypes) {
  if (type === 'Number') return NumberInput
  if (type === 'Boolean') return BooleanInput
  else return 'v-text-field'
}

const typesMap = computed(() => {
  return Object.fromEntries(linksStore.linksDefaultAttributes.map(el => [el.name, el.type]))
})

function isDisabled(attr: string) {
  const disabled = new Set(['a', 'b', 'length', 'link_sequence', 'trip_id', 'headway', 'anchors',
    'departures', 'arrivals', 'route_id', 'agency_id', 'route_short_name', 'route_long_name', 'route_type',
  ])

  return disabled.has(attr)
}

</script>
<template>
  <component
    :is="componentType(typesMap[propKey])"
    v-if="editing==cellKey"
    ref="inputRef"
    v-model="editorForm[propKey].value"
    :color="'primary'"
    autofocus
    :rules="getRules(rules)"
    control-variant="hidden"
    variant="plain"
    :prepend-inner-icon="hasCalculator(propKey) ? 'fas fa-calculator' : '' "

    @keyup.enter="saveEdit"
    @keyup.esc="cancelEdit"
  />

  <span
    v-else
    class="cell"
    :class="{'clickable':!isDisabled(propKey)}"
    @dblclick="isDisabled(propKey)?'':startEdit(item, propKey)"
  >
    {{ item[propKey] }}
  </span>
</template>
<style lang="scss" scoped>
.cell{
display:flex;
justify-content: center;
align-items: center;
width: 100%;
height:100%;
}.clickable{
  cursor: pointer;
}

</style>
