<script setup lang="ts">
import { AttributeUnits } from '@src/types/typesStore'
import { isDefined } from '@src/utils/utils'
import { computed, ref } from 'vue'

interface Props {
  displayUnits: AttributeUnits | undefined
  units: AttributeUnits | undefined // could use suffix and not pass a units props... but would be more confusing
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
  if (!isDefined(value)) return value
  if (!isDefined(fromUnit)) return value
  if (!isDefined(toUnit)) return value
  return value * unitFactor[fromUnit] / unitFactor[toUnit]
}

const toConvert = ref<boolean>(isDefined(props.displayUnits) && (props.units !== props.displayUnits))

const model = defineModel<number>()

const convertedModel = computed({
  get: () => convert(model.value, props.units, props.displayUnits),
  set: (value: number) => model.value = convert(value, props.displayUnits, props.units),
})

</script>
<template>
  <v-number-input
    v-if="toConvert"
    v-bind="$attrs"
    v-model="convertedModel"
    :suffix="`${displayUnits} (${model} ${units}) ` "
  />
  <v-number-input
    v-else
    v-bind="$attrs"
    v-model="model"
    :suffix="units"
  />
</template>
<style lang="scss">

</style>
