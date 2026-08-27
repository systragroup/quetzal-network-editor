<script setup lang="ts">
import { AttributeUnits } from '@src/types/typesStore'
import { isDefined } from '@src/utils/utils'
import { isUndefined } from 'lodash'
import { computed } from 'vue'

interface Props {
  displayUnits: AttributeUnits | undefined
  baseUnits: AttributeUnits | undefined // could use suffix and not pass a units props... but would be more confusing
  suffix?: string // Important! this remove suffix from v-bind="$attrs". we change suffix in this component.
}
const props = defineProps<Props>()

const unitFactor: Record<AttributeUnits, number> = {
  'sec': 1, // base
  'min': 60,
  'hour': 3600,
  'm': 1, // base
  'km': 1000,
  'km/h': 1, // base
}

function convert(value: number | undefined, fromUnit: AttributeUnits | undefined, toUnit: AttributeUnits | undefined) {
  // just return value if we dont have from and to units.
  if (isUndefined(value)) return value
  if (isUndefined(fromUnit)) return value
  if (isUndefined(toUnit)) return value
  return value * unitFactor[fromUnit] / unitFactor[toUnit]
}

const displaySuffix = computed(() => {
  if (isDefined(props.displayUnits) && isDefined(props.baseUnits) && (props.baseUnits !== props.displayUnits)) {
    return `${props.displayUnits} (${model.value} ${props.baseUnits}) `
  } else {
    return props.displayUnits
  }
})

const model = defineModel<number>()

const computedModel = computed({
  get: () => convert(model.value, props.baseUnits, props.displayUnits),
  set: (value: number) => model.value = convert(value, props.displayUnits, props.baseUnits),
})

</script>
<template>
  <v-number-input
    v-bind="$attrs"
    v-model="computedModel"
    :suffix="displaySuffix"
  >
    <!-- pass all slots to v-number-inputs -->
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps"
      />
    </template>
  </v-number-input>
</template>
<style lang="scss">

</style>
