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

</script>
<template>
  <v-switch
    v-if="typeof item.items === 'undefined' && typeof item.value == 'boolean'"
    v-model="item.value"
    color="primary"
    density="compact"
    class="pl-2"
    hide-details
    :label="$gettext(item.text)"
    :persistent-hint="showHint"
  />
  <v-number-input
    v-else-if="item.type == 'Number'"
    v-model="item.value"
    variant="outlined"
    control-variant="stacked"
    :type="item.type"
    :precision="item.precision === undefined? null : item.precision"
    :label="$gettext(item.text)"
    :suffix="item.units"
    hide-details
    :rules="item.rules?.map((str) => rules[str])"
  />
  <v-text-field
    v-else-if="typeof item.items === 'undefined' "
    v-model="item.value"
    variant="outlined"
    hide-details
    :type="item.type"
    :label="$gettext(item.text)"
    :suffix="item.units"
    :rules="item.rules?.map((rule) => rules[rule])"
  />

  <v-select
    v-else
    v-model="item.value"
    variant="outlined"
    hide-details
    :type="item.type"
    :label="$gettext(item.text)"
    :suffix="item.units"
    :rules="item.rules?.map((rule) => rules[rule])"
    :multiple="item?.multiple"
    :items="getItems(item)"
    @update:model-value="removeDeletedScenarios(item)"
  />
</template>
<style lang="scss" scoped>

</style>
