<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<boolean>()

const computedModel = computed({
  get: () => model.value ? 'true' : 'false',
  set: (value: string) => model.value = value === 'true',
})

</script>
<template>
  <v-text-field
    v-bind="$attrs"
    v-model="computedModel"
    :append-inner-icon="model ? 'far fa-square-check' : 'far fa-square'"
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
