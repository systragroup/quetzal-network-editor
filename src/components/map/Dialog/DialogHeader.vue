<script setup lang="ts">
import { isDefined } from '@src/utils/utils'
import { toRefs } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
interface Props {
  variantChoices: string[]
  prefixesChoice?: string[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  variantChoices: () => [],
  prefixesChoice: () => [],
  title: 'Edit Properties',
})

const { variantChoices, prefixesChoice, title } = toRefs(props)

const prefix = defineModel<string | undefined>('prefix')
const variant = defineModel<string>('variant', { default: '' })

</script>
<template>
  <v-card-title class="text-h5">
    {{ $gettext(title) }}
    <slot name="title" />
  </v-card-title>
  <div class="filter-container">
    <v-select
      v-if="isDefined(prefix)"
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
  padding:0 1rem 0.5rem;
  gap:1rem;
  flex-direction:row
}

</style>
