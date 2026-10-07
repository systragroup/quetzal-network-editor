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
  validate: () => componentRef.value?.validate(),
  select: () => componentRef.value?.select(),
})

const menu = ref(false)

</script>
<template>
  <v-text-field
    ref="componentRef"
    v-bind="$attrs"
    v-model="computedModel"
    readonly
    :show-swatches="true"
    @click="menu=true"
  >
    <!-- pass slots -->
    <template #append-inner>
      <v-menu
        v-model="menu"
        location="top"
        :close-on-content-click="false"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            variant="text"
            :color="computedModel"
            icon="fas fa-palette"
            v-bind="props"
          />
        </template>
        <v-color-picker
          v-model="computedModel"
          class="menu"
          mode="hex"
          :modes="['hex']"
          :swatches="swatches"
          show-swatches
        />
      </v-menu>
    </template>
  </v-text-field>
</template>
<style lang="scss" scoped>
.menu{
padding: 0.5rem;
}
</style>
