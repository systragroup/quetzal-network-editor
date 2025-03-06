<script setup lang="ts">
import { toRefs } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
interface Props {
  variantChoices: string[]
  prefixesChoice: string[]
}

const props = withDefaults(defineProps<Props>(), {
  variantChoices: () => [],
  prefixesChoice: () => [],
})

const { variantChoices, prefixesChoice } = toRefs(props)

const prefix = defineModel<string>('prefix', { default: '' })
const variant = defineModel<string>('variant', { default: '' })
</script>
<template>
  <v-card-title class="text-h5">
    {{ $gettext("Edit Properties") }}
    <slot name="title" />
  </v-card-title>
  <div class="filter-container">
    <v-select
      v-model="prefix"
      :items="['',...prefixesChoice]"
      :style="{'flex':1.3}"
      prepend-inner-icon="fas fa-filter"
      :label="$gettext('property')"
      variant="outlined"
      hide-details
      density="compact"
      color="secondarydark"
    />
    <v-select
      v-if="variantChoices.length>1"
      v-model="variant"
      :items="['',...variantChoices]"
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
