<script setup lang="ts">
import { AttributeUnits } from '@src/types/typesStore'
import { convert } from '@src/utils/form'
import { isDefined } from '@src/utils/utils'
import { computed, ref } from 'vue'

interface Props {
  displayUnits: AttributeUnits | undefined
  baseUnits: AttributeUnits | undefined // could use suffix and not pass a units props... but would be more confusing
  suffix?: string | null // Important! this remove suffix from v-bind="$attrs". we change suffix in this component.
}
const props = defineProps<Props>()

const displaySuffix = computed(() => {
  if (props.suffix === null) return undefined
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
const numberInput = ref()
defineExpose({
  validate: () => numberInput.value?.validate(),
  select: () => numberInput.value?.select(),
})
</script>
<template>
  <v-number-input
    ref="numberInput"
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
