<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { toRefs, ref } from 'vue'
import { GroupForm } from '@src/types/components'
import ColorPicker from '../utils/ColorPicker.vue'
import { AttributeTypes } from '@src/types/typesStore'
interface Props {
  item: any
  key: any
  hints: Record<string, string>
  units: Record<string, string>
  types: Record<string, AttributeTypes >
  showHint: boolean
  rules: any
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  hints: () => ({} as Record<string, string>),
  units: () => ({} as Record<string, string>),
  types: () => ({} as Record<string, AttributeTypes>),
  rules: () => {},
  showHint: false,
  item: {},
  key: '',
})
const { hints, types, units, rules, item, key } = toRefs(props)

const emits = defineEmits(['change'])

function change(key: string) {
  emits('change', key)
}

</script>
<template>
  <v-number-input
    v-if="types[key]=== 'Number'"
    v-model="item.value"
    control-variant="stacked"
    :hint="showHint? hints[key]: ''"
    :persistent-hint="showHint"
    :placeholder="item.placeholder? $gettext('multiple Values'):''"
    :persistent-placeholder=" item.placeholder? true: false"
    :variant="item.disabled? 'underlined': 'filled'"
    :disabled="item.disabled"
    :units="units[key]"
    :suffix="units[key]"
    :rules="rules[key]"
    :prepend-inner-icon="['length','speed','time'].includes(key) ? 'fas fa-calculator' : '' "
    :label="String(key)"
    @change="change(key)"
  />
  <v-text-field
    v-else
    v-model="item.value"
    control-variant="stacked"
    :hint="showHint? hints[key]: ''"
    :persistent-hint="showHint"
    :placeholder="item.placeholder? $gettext('multiple Values'):''"
    :persistent-placeholder=" item.placeholder? true: false"
    :variant="item.disabled? 'underlined': 'filled'"
    :disabled="item.disabled"
    :units="units[key]"
    :suffix="units[key]"
    :rules="rules[key]"
    :prepend-inner-icon="['length','speed','time'].includes(key) ? 'fas fa-calculator' : '' "
    :label="String(key)"
    @change="change(key)"
  />
</template>
<style lang="scss" scoped>
.form{
  margin: 1rem;
}
.box{
  max-height:100%;
  padding:0.5rem;
  box-shadow:0;
  overflow-y: auto;
  background-color: rgb(var(--v-theme-lightergrey));
}
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform: translate3d(0, 0, 0);
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
