<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { toRefs, ref, computed } from 'vue'
import { GroupForm } from '@src/types/components'
import ColorPicker from '../utils/ColorPicker.vue'
import { AttributeTypes } from '@src/types/typesStore'
import MenuSelector from '../utils/MenuSelector.vue'
interface Props {
  hints: Record<string, string>
  units: Record<string, string>
  types?: Record<string, AttributeTypes >
  attributesChoices?: Record<string, any[]>
  attributeNonDeletable: string[]
  rules: any
  showDeleteOption: boolean
  showHint: boolean
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  hints: () => ({} as Record<string, string>),
  units: () => ({} as Record<string, string>),
  types: () => ({} as Record<string, AttributeTypes>),
  attributesChoices: () => ({} as Record<string, any[]>),
  rules: () => {},
  attributeNonDeletable: () => [],
  showHint: false,
  showDeleteOption: false,
})
const { hints, types, units, rules, showHint, showDeleteOption, attributesChoices } = toRefs(props)
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

defineExpose({
  validate,
})

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
      <div
        v-for="(item, key) in orderedForm"
        :key="key"
        class="form"
      >
        <slot
          name="item"
          :item="{item:item,key:key}"
        />
        <component
          :is="types[key]=== 'Number' ? 'v-number-input' : 'v-text-field'"
          v-if="item.show"
          v-model="item.value"
          control-variant="stacked"
          :hint="showHint? hints[key]: ''"
          :persistent-hint="showHint"
          :placeholder="item.placeholder? $gettext('multiple Values'):''"
          :persistent-placeholder=" item.placeholder? true: false"
          :variant="item.disabled? 'underlined': 'filled'"
          :disabled="item.disabled"
          :units="units[key]"
          :suffix="units[key]"
          :rules="rules[key]"
          :precision="null"
          :prepend-inner-icon="['length','speed','time'].includes(key.split('#')[0]) ? 'fas fa-calculator' : '' "
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
    </v-form>
  </div>
</template>
<style lang="scss" scoped>
.form{
  margin: 0.2rem;
}
.box{
  max-height:100%;
  box-shadow:0;
  overflow-y: auto;
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
