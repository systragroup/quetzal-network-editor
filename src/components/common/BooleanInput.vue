<script setup lang="ts">
import { computed } from 'vue'

// 3 states. true, false and undefined.
// if not: undefined (may happen) will show as false, but exported as undefined
const model = defineModel<boolean | undefined>()

const computedModel = computed({
  get: () => {
    if (model.value === undefined) return undefined
    else if (model.value === true) return 'true'
    else return 'false'
  },
  set: (value: string) => {
    if (value === undefined || value === '') model.value = undefined
    else if (value === 'true') model.value = true
    else model.value = false
  },
})

</script>
<template>
  <v-text-field
    v-bind="$attrs"
    v-model="computedModel"
    :append-inner-icon="model === undefined ? 'far fa-square-minus': model ? 'far fa-square-check' : 'far fa-square'"
    @click:append-inner="model=!model"
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
  </v-text-field>
</template>
<style lang="scss">

</style>
