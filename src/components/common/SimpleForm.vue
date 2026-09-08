<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { computed, ref } from 'vue'
import { FormData } from '@src/types/components'
import FormInput from './FormInput.vue'

const editorForm = defineModel<FormData[]>({ default: () => [] })
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

function change(item: FormData) {
  emits('change', item)
}

defineExpose({
  validate,
})

// logic to hide and show advanced parameters
const showAdvanced = ref(false)
const sortedForm = computed(() => [...editorForm.value].sort((a, b) => {
  return (a.advanced === b.advanced) ? 0 : a.advanced ? 1 : -1
}))
const advancedIndex = computed(() => sortedForm.value.findIndex(el => el.advanced))

</script>
<template>
  <div
    class="box"
    :class="{'shake':shake}"
  >
    <v-form ref="formRef">
      <div
        v-for="(item, key) in sortedForm"
        :key="key"
        class="form"
      >
        <v-btn
          v-if="key === advancedIndex"
          variant="text"
          class="lower-button"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced? $gettext('▾ Hide Advanced') : $gettext('▸ Show Advanced') }}
        </v-btn>
        <slot
          :name="item.key"
          :item="item"
          :show-hint="showHint"
          @update:model-value="change(item)"
        >
          <FormInput
            v-show="!item.advanced || showAdvanced"
            :item="item"
            v-bind="$attrs"
            :show-hint="showHint"
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
.lower-button{
  text-transform:none;
}
.box{
  max-height:100%;
  padding:0.5rem;
  box-shadow: none;
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
