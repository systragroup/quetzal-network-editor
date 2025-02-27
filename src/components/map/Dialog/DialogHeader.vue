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
const variantChoices = computed(() => linksStore.variantChoice)

</script>
<template>
  <v-card-title class="text-h5">
    {{ $gettext("Edit Properties") }}
    <slot name="title" />
  </v-card-title>
  <div class="">
    <v-select
      v-model="selectedVariant"
      :items="variantChoices"
      :style="{'flex':1.3}"
      prepend-inner-icon="fas fa-filter"
      :label="$gettext('filter')"
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
      :label="$gettext('filter')"
      variant="outlined"
      hide-details
      density="compact"
      color="secondarydark"
    />
  </div>
</template>
<style lang="scss" scoped>

</style>
