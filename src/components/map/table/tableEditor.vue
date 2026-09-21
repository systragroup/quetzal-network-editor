<script setup lang="ts">
import { useLinksStore } from '@src/store/links'
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, nextTick, ref, toRefs } from 'vue'
import { FormFormat, GroupForm, Rule } from '@src/types/components'
import NumberInput from '@src/components/common/NumberInput.vue'
import BooleanInput from '@src/components/common/BooleanInput.vue'
import { AttributeTypes } from '@src/types/typesStore'
import { changeLengthTimeSpeed, getRules, hasCalculator, RulesFactory } from '@src/utils/form'
import { VTextField } from 'vuetify/lib/components'

interface Props {
  item: GeoJsonProperties
  columns: string[]
}

const props = defineProps<Props>()
const { item, columns } = toRefs(props)

const editing = defineModel<boolean>()

const linksStore = useLinksStore()
// const tripSet = computed(() => new Set(linksStore.tripList))

const inputRefs = ref<VTextField[]>([])

const selectedIndex = ref<string>('')
const editorForm = ref<GroupForm>({})

const usedIndex = computed<Set<string>>(() => new Set(linksStore.linksIndexes))
const rules = ref<Record<string, Rule[]>>({})
function createRules(index: string) {
  return {
    index: [
      RulesFactory.unique(index, usedIndex.value),
      RulesFactory.prefix(index ? index.split('_')[0] + '_' : ''),
    ],
    route_width: ['largerThanZero'],
  }
}
async function startEdit(clickedKey: string) {
  if (editing.value) return
  editing.value = true
  selectedIndex.value = item.value.index
  editorForm.value = {}
  Object.keys(item.value).forEach((key: string) => {
    const data: FormFormat = {
      value: item.value[key],
      disabled: isDisabled(key),
      show: true,
      placeholder: false,
    }
    editorForm.value[key] = data
  })

  rules.value = createRules(selectedIndex.value)

  // focus on clicked input
  await nextTick()
  const idx = columns.value.indexOf(clickedKey)
  inputRefs.value[idx].select()
}

function change (key: string) {
  changeLengthTimeSpeed(key, editorForm.value)
}
async function saveEdit() {
  const promises = inputRefs.value.map(el => el.validate())
  const resp = await Promise.all(promises)
  const errors = resp.flatMap(el => el)
  const valid = errors.length == 0
  if (valid) {
    // Commit
    // changeLengthTimeSpeed(propKey.value, editorForm.value)
    linksStore.editLinkInfo({ selectedIndex: selectedIndex.value, info: editorForm.value })
    editing.value = false
  }
}

function cancelEdit() {
  editing.value = false
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
  <!-- row -->
  <tr
    tabindex="0"
    :class="{'selected':editing}"
    @keyup.enter="saveEdit"
    @keyup.esc="cancelEdit"
  >
    <!-- item -->
    <td
      v-for="propKey in columns"
      :key="propKey"
      class="row"
      @dblclick="startEdit(propKey)"
    >
      <component
        :is="componentType(typesMap[propKey])"
        v-if="editing"
        ref="inputRefs"
        v-model="editorForm[propKey].value"
        :color="'primary'"
        :disabled="editorForm[propKey].disabled"
        :rules="getRules(rules[propKey])"
        control-variant="hidden"
        variant="underlined"
        :precision="null"
        :prepend-inner-icon="hasCalculator(propKey) ? 'fas fa-calculator' : '' "
        @update:model-value="change(propKey)"
      />

      <span
        v-else
        class="cell wrap"
      >
        {{ item[propKey] }}
      </span>
    </td>
  </tr>
</template>
<style lang="scss" scoped>
.cell{
display:flex;
align-items: center;
width: 100%;
height:100%;
cursor: pointer;
}
.selected{
  background-color: rgb(var(--v-theme-primarylight));
}
.row{
  min-width: 8rem;
  max-width: 10rem;
}
.wrap{
  overflow: auto;
}

</style>
