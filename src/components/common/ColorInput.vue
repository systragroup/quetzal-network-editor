<script setup lang="ts">
import { computed, ref } from 'vue'

const model = defineModel<string | undefined>()
const swatches = ref([
  ['#CDDC39', '#4CAF50'],
  ['#00BCD4', '#2196F3'],
  ['#673AB7', '#E91E63'],
  ['#FF7B30', '#FFC107'],
])

const computedModel = computed({
  get: () => {
    if (!model.value) return undefined // undefined null or ''
    else return `#${model.value}`
  },
  set: (value: string | undefined) => {
    if (value === undefined || value === '') model.value = undefined
    else model.value = value.replace('#', '')
  },
})
const componentRef = ref()
defineExpose({
  validate: () => new Promise((resolve) => resolve([])),
  select: () => {},
})

</script>
<template>
  <v-color-input
    ref="componentRef"
    v-bind="$attrs"
    v-model="computedModel"
    :show-swatches="true"
    pip-location="append-inner"
    color-pip
    mode="hex"
    :modes="['hex']"
    :swatches="swatches"
  >
    <!-- pass slots -->
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps"
      />
    </template>
  </v-color-input>
</template>
<style lang="scss">

</style>
