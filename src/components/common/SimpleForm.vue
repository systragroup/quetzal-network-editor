<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { ref } from 'vue'
import { FormData, SimpleFormType } from '@src/types/components'

const editorForm = defineModel<FormData[]>()
const emits = defineEmits(['change'])

const shake = ref(false)
const formRef = ref()
const showHint = ref(false)

async function validate() {
  const resp = await formRef.value.validate()
  if (!resp.valid) {
    // set shake and then back to false. leave time for animation.
    shake.value = true
    setTimeout(() => { shake.value = false }, 500)
  }
  return resp.valid
}

function getRules(arr: (string | Function)[] | undefined) {
  if (arr === undefined) { return [] }
  else { return arr.map((r) => typeof (r) === 'string' ? rules[r] : r) }
}

const rules: Record<string, any> = {
  required: (v: any) => (v != null && v !== '') || $gettext('Required'),
  largerThanZero: (v: number) => v > 0 || $gettext('Should be larger than 0'),
  nonNegative: (v: number) => v >= 0 || $gettext('Should be larger or equal to 0'),
  longerThanZero: (v: string) => v.length > 0 || $gettext('Should not be empty'),
}

function change(item: FormData) {
  emits('change', item)
}

defineExpose({
  validate,
})

function typeMap(type: SimpleFormType) {
  switch (type) {
    case 'number':
      return 'v-number-input'
    case 'boolean':
      return 'v-switch'
    case 'select':
      return 'v-select'
    default:
      return 'v-text-field'
  }
}

</script>
<template>
  <div
    class="box"
    :class="{'shake':shake}"
  >
    <v-form ref="formRef">
      <div
        v-for="(item, key) in editorForm"
        :key="key"
        class="form"
      >
        <slot
          :name="item.key"
          :item="item"
          :show-hint="showHint"
          :get-rules="getRules"
          @update:model-value="change(item)"
        >
          <component
            :is="typeMap(item.type)"
            v-model="item.value"
            control-variant="stacked"
            :hint="showHint? item.hint: ''"
            :density="item.type==='boolean'? 'compact': 'default'"
            :persistent-hint="showHint"
            :variant="item.disabled? 'underlined': 'filled'"
            :disabled="item.disabled"
            :units="item.units"
            color="primary"
            :precision="item.precision === undefined? null : item.precision"
            :suffix="item.units"
            :items="item.items"
            :rules="getRules(item.rules)"
            :label="$gettext(item.label)"
            :multiple="item.multiple"
            @update:model-value="change(item)"
          />
        </slot>
      </div>

      <v-card-actions>
        <slot />
        <v-spacer />
        <v-btn
          size="small"
          @click="showHint = !showHint"
        >
          <v-icon>far fa-question-circle small</v-icon>
        </v-btn>
      </v-card-actions>
    </v-form>
  </div>
</template>
<style lang="scss" scoped>
.form{
}
.box{
  max-height:100%;
  padding:0.5rem;
  box-shadow:0;
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
