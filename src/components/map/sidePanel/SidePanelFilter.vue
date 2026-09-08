<script setup lang="ts">

import { toRefs } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

interface Props {
  filterChoices: string[]

}

const props = withDefaults(defineProps<Props>(), {
  filterChoices: () => [''],
})
const { filterChoices } = toRefs(props)

// const emits = defineEmits(['confirmChanges', 'abortChanges', 'edit'])

const selectedFilter = defineModel<string>('selectedFilter', { default: '' })
const searchString = defineModel<string>('searchString', { default: '' })

</script>
<template>
  <div
    class="container"
    :style="{'padding-top': '0.5rem'}"
  >
    <v-select
      v-model="selectedFilter"
      :items="filterChoices.sort()"
      :style="{'flex':1.3}"
      prepend-inner-icon="fas fa-filter"
      :label="$gettext('filter')"
      variant="outlined"
      hide-details
      density="compact"
      color="secondarydark"
    />
    <v-text-field
      v-model="searchString"
      :style="{'padding-right': '0.5rem','flex':1}"
      density="compact"
      variant="outlined"
      clear-icon="fas fa-times-circle"
      clearable
      :label="$gettext('search')"
      hide-details
      persistent-clear
      prepend-inner-icon="fas fa-search"
      @click:clear="searchString=''"
    />
  </div>
</template>
<style lang="scss" scoped>
.container{
  display:flex;
  justify-content:flex-end;
  align-items: center;
}

</style>
