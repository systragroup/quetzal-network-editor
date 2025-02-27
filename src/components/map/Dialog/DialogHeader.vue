<script setup lang="ts">
import { useLinksStore } from '@src/store/links'
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const linksStore = useLinksStore()

const selectedVariant = computed({
  get: () => linksStore.variant,
  set: (val) => linksStore.variant = val,
})
const variantChoices = computed(() => ['', ...linksStore.variantChoice])

</script>
<template>
  <v-card-title class="text-h5">
    {{ $gettext("Edit Properties") }}
    <slot name="title" />
  </v-card-title>
  <div class="filter-container">
    <v-select
      :model-value="'all parameters'"
      :items="['all parameters']"
      :style="{'flex':1.3}"
      prepend-inner-icon="fas fa-filter"
      :label="$gettext('property')"
      variant="outlined"
      hide-details
      density="compact"
      color="secondarydark"
    />
    <v-select
      v-model="selectedVariant"
      :items="variantChoices"
      :style="{'flex':1.3}"
      prepend-inner-icon="fas fa-filter"
      :label="$gettext('variant')"
      variant="outlined"
      hide-details
      density="compact"
      color="secondarydark"
    />
  </div>
</template>
<style lang="scss" scoped>

.filter-container{
  display: flex;
  padding:0 1rem 0.5rem 1rem;
  gap:1rem;
  flex-direction:row
}

</style>
