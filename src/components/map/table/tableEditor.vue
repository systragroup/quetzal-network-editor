<script setup lang="ts">
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, nextTick, ref, toRefs } from 'vue'
import { GroupForm, RulesRecord } from '@src/types/components'
import NumberInput from '@src/components/common/NumberInput.vue'
import BooleanInput from '@src/components/common/BooleanInput.vue'
import { AttributeTypes, AttributeUnits } from '@src/types/typesStore'
import { changeLengthTimeSpeed, convert, getForm, getPropertyName, getRules, hasCalculator } from '@src/utils/form'
import { VTextField } from 'vuetify/lib/components'
import { baseUnits } from '@src/constants/properties'

interface Props {
  item: GeoJsonProperties
  index: string
  columns: string[]
  disabled: string[]
  types: Record<string, AttributeTypes >
  displayUnits: Record<string, AttributeUnits | undefined>
  createRules: (_: GeoJsonProperties) => RulesRecord
}

const props = defineProps<Props>()
const { item, columns, disabled, index, displayUnits } = toRefs(props)
const emits = defineEmits(['confirm'])
const selectedIndex = defineModel<string | null>() // used to only show 1 row at the time

const inputRefs = ref<VTextField[]>([])
const editorForm = ref<GroupForm>({})
const rules = ref<RulesRecord>({})

const showEdition = computed(() => selectedIndex.value === index.value)

async function startEdit(clickedKey: string) {
  if (showEdition.value) return
  editorForm.value = getForm(item.value, columns.value, disabled.value)
  selectedIndex.value = item.value.index
  rules.value = props.createRules(item.value)
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
    emits('confirm', { selectedIndex: selectedIndex.value, info: editorForm.value })
    selectedIndex.value = null
  }
}

function cancelEdit() {
  selectedIndex.value = null
}

function componentType(type: AttributeTypes) {
  if (type === 'Number') return NumberInput
  if (type === 'Boolean') return BooleanInput
  else return 'v-text-field'
}

// convert values if needed
function convertValue(value: unknown, propKey: string) {
  if (typeof (value) !== 'number') return value
  const from = baseUnits()[getPropertyName(propKey)]
  const to = displayUnits.value[getPropertyName(propKey)]
  return convert(value, from, to)
}

</script>
<template>
  <!-- row -->
  <!-- tabindex make the keyup work when typing on the row-->
  <tr
    tabindex="0"
    :class="{'selected':showEdition}"
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
        :is="componentType(types[propKey])"
        v-if="showEdition"
        ref="inputRefs"
        v-model="editorForm[propKey].value"
        :color="'primary'"
        :disabled="editorForm[propKey].disabled"
        :rules="getRules(rules[propKey])"
        control-variant="hidden"
        variant="underlined"
        :base-units="baseUnits()[getPropertyName(propKey)]"
        :display-units="displayUnits[getPropertyName(propKey)]"
        :suffix="null"
        :precision="null"
        :prepend-inner-icon="hasCalculator(getPropertyName(propKey)) ? 'fas fa-calculator' : '' "
        @update:model-value="change(propKey)"
      />

      <span
        v-else
        class="cell wrap"
      >
        {{ convertValue(item[propKey],propKey) }}
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
  min-width: 9rem;
  max-width: 12rem;
}
.wrap{
  overflow: auto;
}

</style>
