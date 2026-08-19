<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { toRefs, ref, computed } from 'vue'
import { GroupForm, Rule } from '@src/types/components'
import ColorPicker from '../utils/ColorPicker.vue'
import { AttributeTypes, AttributeUnits } from '@src/types/typesStore'
import MenuSelector from '../utils/MenuSelector.vue'
import NumberInput from './NumberInput.vue'
import BooleanInput from './BooleanInput.vue'
interface Props {
  hints: Record<string, string>
  units?: Record<string, AttributeUnits | undefined>
  displayUnits?: Record<string, AttributeUnits | undefined>
  types?: Record<string, AttributeTypes >
  attributesChoices?: Record<string, any[]>
  attributeNonDeletable: string[]
  rules: Record<string, Rule[]>
  showDeleteOption: boolean
  showHint: boolean
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  hints: () => ({} as Record<string, string>),
  units: () => ({} as Record<string, AttributeUnits>),
  displayUnits: () => ({} as Record<string, AttributeUnits>),
  types: () => ({} as Record<string, AttributeTypes>),
  attributesChoices: () => ({} as Record<string, any[]>),
  rules: () => ({} as Record<string, Rule[]>),
  attributeNonDeletable: () => [],
  showHint: false,
  showDeleteOption: false,
})
const { hints, types, units, displayUnits, rules, showHint, showDeleteOption, attributesChoices } = toRefs(props)
const editorForm = defineModel<GroupForm>('editorForm', { default: {} })
const emits = defineEmits(['change', 'deleteField'])
function change(key: string) {
  emits('change', key)
}
function deleteField(key: string) {
  emits('deleteField', key)
}
const shake = ref(false)

const formRef = ref()
async function validate() {
  const resp = await formRef.value.validate()
  if (!resp.valid) {
    // set shake and then back to false. leave time for animation.
    shake.value = true
    setTimeout(() => { shake.value = false }, 500)
    return false }
  else {
    return true
  }
}

const orderedForm = computed (() => {
  // order editor Form in alphatical order
  let form = editorForm.value
  // order keys in alphabetical order, and with disabled last
  const keys = Object.keys(form).filter(key => !form[key].disabled).sort()
  keys.push(...Object.keys(form).filter(key => form[key].disabled).sort())
  const ordered = keys.reduce(
    (obj: Record<string, any>, key: string) => {
      obj[key] = form[key]
      return obj
    },
    {},
  )
  return ordered
})

function getPropertyName(key: string): string {
  // time, time#AM, time_r, time#AM_r
  // return time
  return key.split('#')[0].split('_r')[0]
}

function hasCalculator(key: string) {
  const name = getPropertyName(key)
  if (['length', 'speed', 'time'].includes(name))
    return true
  else
    return false
}

defineExpose({
  validate,
})

function componentType(type: AttributeTypes) {
  if (type === 'Number') return NumberInput
  if (type === 'Boolean') return BooleanInput
  else return 'v-text-field'
}

</script>
<template>
  <div
    class="box"
    :class="{'shake':shake}"
  >
    <v-form
      ref="formRef"
      validate-on="submit lazy"
    >
      <div class="form-grid">
        <div
          v-for="(item, key) in orderedForm"
          :key="key"
          class="form"
          :class="!item.grouped ? 'full-width' : ''"
        >
          <slot
            name="item"
            :item="{item:item,key:key}"
          />
          <component
            :is="componentType(types[key])"
            v-if="item.show"
            v-model="item.value"
            control-variant="stacked"
            :hint="showHint? hints[key]: ''"
            :persistent-hint="showHint"
            :placeholder="item.placeholder? $gettext('multiple Values'):''"
            :persistent-placeholder=" item.placeholder? true: false"
            :variant="item.disabled? 'underlined': 'filled'"
            :disabled="item.disabled"
            :units="units[getPropertyName(key)]"
            :display-units="displayUnits[getPropertyName(key)]"
            :suffix="units[getPropertyName(key)]"
            :rules="item.disabled?[]: rules[key]"
            :precision="null"
            :prepend-inner-icon="hasCalculator(key) ? 'fas fa-calculator' : '' "
            :label="String(key)"
            @update:model-value="change(key)"
          >
            <template
              v-if="key==='route_color'"
              v-slot:append-inner
            >
              <color-picker
                v-model:pcolor="item.value"
              />
            </template>
            <template
              v-else-if="Object.keys(attributesChoices).includes(key)"
              v-slot:append-inner
            >
              <MenuSelector
                v-model="item.value"
                :items="attributesChoices[key]"
                size="small"
              />
            </template>
            <template
              v-if="showDeleteOption"
              v-slot:prepend
            >
              <v-btn
                variant="text"
                icon="fas fa-trash small"
                size="x-small"
                :disabled="attributeNonDeletable.includes(key)"
                color="error"
                @click="()=>deleteField(key)"
              />
            </template>
          </component>
        </div>
        <slot />
      </div>
    </v-form>
  </div>
</template>
<style lang="scss" scoped>
.box{
  max-height:100%;
  box-shadow: none;
  overflow-y: auto;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 0.5rem;
}
.form {
  min-width: 0;
}
.full-width {
  grid-column: 1 / -1;
}

.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
