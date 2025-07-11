<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { computed, ref, toRefs } from 'vue'
import { VariantFormData } from '@src/types/components'
import { cloneDeep } from 'lodash'
import MenuSelector from '../utils/MenuSelector.vue'
import FormInput from './FormInput.vue'

interface Props {
  variants?: string[]
}
const props = withDefaults(defineProps<Props>(), {
  variants: () => [''],
})
const { variants } = toRefs(props)

const editorForm = defineModel<VariantFormData[]>({ default: [] })
const emits = defineEmits(['change'])

// form stuff

const shake = ref(false)
const formRef = ref()
const showHint = ref(false)

async function validate() {
  const resp = await formRef.value.validate()
  if (!resp.valid) {
    shake.value = true // set shake and then back to false. leave time for animation.
    setTimeout(() => { shake.value = false }, 500)
  }
  return resp.valid
}

defineExpose({
  validate,
})

// variants logic: display add delete
const showEdit = ref(false)

function availableVariants(key: string) {
  const variantChoices = variants.value ? variants.value : []
  const filtered = editorForm.value.filter(el => el.key === key)
  const usedVariants = filtered.map(el => el.variant)
  return variantChoices.filter(v => !usedVariants.includes(v))
}

function isVariant(item: VariantFormData) { return item.variant !== '' }

function changeItemVariant(variant: string, item: VariantFormData) {
  item.variant = variant
}

function addItem(item: VariantFormData) {
  const copy = cloneDeep(item)
  const key = item.key
  const v = availableVariants(key)[0]
  if (v) { // else. all variants there
    copy.variant = v
    const position = editorForm.value.indexOf(item)
    editorForm.value.splice(position + 1, 0, copy)
  }
}

function deleteItem(item: VariantFormData) {
  editorForm.value = editorForm.value.filter(el => el !== item)
}

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
    :class="{'shake': shake}"
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
          @update:model-value="emits('change', item)"
        >
          <FormInput
            v-show="!item.advanced || showAdvanced"
            :item="item"
            v-bind="$attrs"
            :show-hint="showHint"
          >
            <template
              v-if="showEdit && item.showVariant"
              v-slot:prepend
            >
              <MenuSelector
                v-if="isVariant(item)"
                :items="availableVariants(item.key)"
                size="small"
                :model-value="item.variant"
                @update:model-value="(v:string)=>changeItemVariant(v, item)"
              />
              <v-btn
                v-else
                variant="tonal"
                size="small"
                :disabled="availableVariants(item.key).length==0"
                icon="fas fa-plus"
                @click="addItem(item)"
              />
            </template>
            <template
              v-if="showEdit && isVariant(item)"
              v-slot:append
            >
              <v-btn
                variant="text"
                color="error"
                size="small"
                icon="fas fa-trash"
                @click="deleteItem(item)"
              />
            </template>
          </FormInput>
        </slot>
      </div>
      <v-card-actions>
        <slot />
        <v-spacer />
        <v-btn
          v-if="variants.length>1"
          prepend-icon="fas fa-plus"
          variant="text"
          :active="showEdit"
          @click="showEdit = !showEdit"
        >
          {{ $gettext("Manage") }}
        </v-btn>
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
