<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { toRefs, computed, onMounted } from 'vue'
import { SingleParam } from '@src/types/typesStore'
import { useUserStore } from '@src/store/user'
const userStore = useUserStore()

const scenariosList = computed(() => { return userStore.scenariosList })
const activeScenario = computed(() => { return userStore.scenario })

interface Props {
  item: SingleParam
  showHint: boolean
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  showHint: false,
})
const { showHint, item } = toRefs(props)

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

type Rules = Record<string, any>

const rules: Rules = {
  required: (v: any) => v != null || $gettext('Required'),
  largerThanZero: (v: number) => v > 0 || $gettext('should be larger than 0'),
  nonNegative: (v: number) => v >= 0 || $gettext('should be larger or equal to 0'),
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
    return 'v-switch'
  } else if (item.value.type.toLowerCase() === 'number') {
    return 'v-number-input'
  } else {
    return 'v-text-field'
  }
})

</script>
<template>
  <component
    :is="component"
    v-model="item.value"
    color="primary"
    variant="outlined"
    control-variant="stacked"
    hide-details
    :precision="item.precision === undefined? null : item.precision"
    :label="$gettext(item.text)"
    :suffix="item.units? item.units:undefined"
    :persistent-hint="showHint"
    :type="item.type"
    :rules="item.rules?.map((str) => rules[str])"
    :multiple="item?.multiple"
    :items="getItems(item)"
    @update:model-value="removeDeletedScenarios(item)"
  />
</template>
<style lang="scss" scoped>

</style>
