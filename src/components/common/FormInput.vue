<script setup lang="ts">

import { toRefs } from 'vue'
import { getRules } from '@src/utils/form'
import { FormType, VariantFormData } from '@src/types/components'

interface Props {
  item: VariantFormData
  showHint: boolean
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  showHint: false,
})

const { item, showHint } = toRefs(props)

const emits = defineEmits(['change'])

function change(item: VariantFormData) {
  emits('change', item)
}

function typeMap(type: FormType) {
  switch (type) {
    case 'number':
      return 'v-number-input'
    case 'boolean':
      return 'v-switch'
    case 'select':
      return 'v-select'
    default:
      return 'v-text-field'
  }
}

</script>
<template>
  <component
    :is="typeMap(item.type)"
    v-model="item.value"
    control-variant="stacked"
    :hint="showHint? item.hint: ''"
    :density="item.type==='boolean'? 'compact': 'default'"
    :persistent-hint="showHint"
    :variant="item.disabled? 'underlined': 'filled'"
    :disabled="item.disabled"
    :units="item.units"
    :color="item.type==='boolean'? 'primary': undefined"
    :precision="item.precision === undefined? null : item.precision"
    :suffix="item.units"
    :prefix="item.variant"
    :items="item.items"
    :rules="getRules(item.rules)"
    :label="$gettext(item.label)"
    :multiple="item.multiple"
    @update:model-value="change(item)"
  >
    <template
      v-if="$slots.prepend"
      v-slot:prepend
    >
      <slot name="prepend" />
    </template>
    <template
      v-if="$slots.append"
      v-slot:append
    >
      <slot name="append" />
    </template>
  </component>
</template>
<style lang="scss" scoped>

</style>
