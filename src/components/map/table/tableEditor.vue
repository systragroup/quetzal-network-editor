<script setup lang="ts">
import { GeoJsonProperties } from '@src/types/geojson'
import { computed, nextTick, onUnmounted, ref, toRefs } from 'vue'
import { GroupForm, RulesRecord } from '@src/types/components'
import NumberInput from '@src/components/common/NumberInput.vue'
import BooleanInput from '@src/components/common/BooleanInput.vue'
import { AttributeTypes, AttributeUnits } from '@src/types/typesStore'
import { changeLengthTimeSpeed, convert, getForm, getPropertyName, getRules, hasCalculator } from '@src/utils/form'
import { VTextField } from 'vuetify/lib/components'
import MenuSelector from '@src/components/utils/MenuSelector.vue'
import ColorInput from '@src/components/common/ColorInput.vue'

interface Props {
  item: GeoJsonProperties
  index: string
  columns: string[]
  disabled: string[]
  types: Record<string, AttributeTypes>
  units: Record<string, AttributeUnits>
  displayUnits: Record<string, AttributeUnits>
  attributesChoices: Record<string, any[]>
  createRules: (_: GeoJsonProperties) => RulesRecord
}

const props = defineProps<Props>()
const { item, columns, disabled, index } = toRefs(props)
const emits = defineEmits(['confirm', 'hover'])
const selectedIndex = defineModel<string | null>() // used to only show 1 row at the time

const inputRefs = ref<VTextField[]>([])
const editorForm = ref<GroupForm>({})
const rules = ref<RulesRecord>({})

const showEdition = computed(() => selectedIndex.value === index.value)

async function startEdit(clickedKey: string) {
  // todo: move this out? its mouting weird
  if (showEdition.value) return
  editorForm.value = getForm(item.value, columns.value, disabled.value)
  selectedIndex.value = index.value
  rules.value = props.createRules(item.value)
  await nextTick()
  const idx = columns.value.indexOf(clickedKey)
  inputRefs.value[idx].select()
}
// onBeforeMount(() => {
//   if (showEdition.value) {
//     console.log('mount')
//     editorForm.value = getForm(item.value, columns.value, disabled.value)
//     selectedIndex.value = index.value
//     rules.value = props.createRules(item.value)
//   }
// })

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
onUnmounted(() => {
  if (showEdition.value) {
    cancelEdit()
  }
  // row is about to be removed
})

function componentType(type: AttributeTypes) {
  if (type === 'Number') return NumberInput
  if (type === 'Boolean') return BooleanInput
  if (type === 'Color') return ColorInput
  else return 'v-text-field'
}

// convert values if needed
function convertValue(value: unknown, propKey: string) {
  if (typeof (value) !== 'number') return value
  const from = props.units[getPropertyName(propKey)]
  const to = props.displayUnits[getPropertyName(propKey)]
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
    @mouseenter="()=>emits('hover', index)"
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
        :base-units="units[getPropertyName(propKey)]"
        :display-units="displayUnits[getPropertyName(propKey)]"
        :suffix="null"
        :precision="null"
        :prepend-inner-icon="hasCalculator(getPropertyName(propKey)) ? 'fas fa-calculator' : '' "
        @update:model-value="change(propKey)"
      >
        <template
          v-if="Object.keys(attributesChoices).includes(propKey)"
          v-slot:append-inner
        >
          <MenuSelector
            v-model="editorForm[propKey].value"
            :items="attributesChoices[propKey]"
            size="small"
          />
        </template>
      </component>

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
