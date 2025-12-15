<script setup lang="ts">

import { toRefs, computed, onMounted } from 'vue'
import { SingleParam } from '@src/types/typesStore'
import { useUserStore } from '@src/store/user'
import { getRules } from '@src/utils/form'

const userStore = useUserStore()
const scenariosList = computed(() => { return userStore.scenariosList })
const activeScenario = computed(() => { return userStore.scenario })

interface Props {
  item: SingleParam
}

// Define props with default values
const props = defineProps<Props>()
const { item } = toRefs(props)

// const emits = defineEmits(['change'])

function getItems(item: SingleParam): any[] | undefined {
  // give all scenario as items choice.
  // else return items in the json (item.items)
  if (item.items === '$scenarios') {
    return scenariosList.value.map(
      el => el.scenario).filter(
      scen => scen !== activeScenario.value)
  } else {
    return item.items
  }
}

function removeDeletedScenarios (item: SingleParam) {
  // for $scenario field: remove selected scenario if not in the scen list anymore.
  if (item.items === '$scenarios') {
    const scenarios = scenariosList.value.map(el => el.scenario)
    if (Array.isArray(item.value)) {
      item.value = item.value.filter(name => scenarios.includes(name))
    } else {
      item.value = scenarios.includes(item.value) ? item.value : ''
    }
  }
}
onMounted(() => removeDeletedScenarios(item.value))

const component = computed(() => {
  if (item.value.items !== undefined) {
    return 'v-select'
  } else if (item.value.type === undefined) {
    return 'v-text-field'
  } else if (item.value.type.toLocaleLowerCase() === 'boolean') {
    return 'v-switch' // v-checkbox
  } else if (item.value.type.toLowerCase() === 'number') {
    return 'v-number-input'
  } else {
    return 'v-text-field'
  }
})

function getItemVariant(label: string) {
  return label.split('#')[1]
}

</script>
<template>
  <component
    :is="component"
    v-model="item.value"
    variant="outlined"
    control-variant="stacked"
    inset
    hide-details
    :precision="item.precision === undefined ? null : item.precision"
    :label="item.text"
    :prefix="getItemVariant(item.name)"
    :suffix="item.units ? item.units : undefined"
    :rules="getRules(item.rules)"
    :multiple="item?.multiple"
    :items="getItems(item)"
    @update:model-value="removeDeletedScenarios(item)"
  >
    <template
      v-if="$slots.prepend"
      v-slot:prepend
    >
      <slot name="prepend" />
    </template>
    <template
      v-if="$slots.append"
      v-slot:append
    >
      <slot name="append" />
    </template>
  </component>
</template>
<style lang="scss" scoped>

</style>
