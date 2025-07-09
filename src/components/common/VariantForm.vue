<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
import { ref, toRefs } from 'vue'
import { VariantFormData, FormType } from '@src/types/components'
import { getRules } from '@src/utils/form'
import { cloneDeep } from 'lodash'
import MenuSelector from '../utils/MenuSelector.vue'

interface Props {
  variants?: string[]
}

// Define props with default values
const props = withDefaults(defineProps<Props>(), {
  variants: undefined,
})
const { variants } = toRefs(props)

const editorForm = defineModel<VariantFormData[]>({ default: [] })
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

function change(item: VariantFormData) {
  emits('change', item)
}

defineExpose({
  validate,
})

function typeMap(type: FormType) {
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

const showEdit = ref(false)

function availableVariants(key: string) {
  const variantChoices = variants.value ? variants.value : []
  const filtered = editorForm.value.filter(el => el.key === key)
  const usedVariants = filtered.map(el => el.variant)
  return variantChoices.filter(v => !usedVariants.includes(v))
}

function isVariant(item: VariantFormData) { return item.variant !== '' }

function changeItemVariant(variant: string, item: VariantFormData) {
  item.variant = item.variant
  // item.label = item.label.split('#')[0] + `#${variant}`
}

function addItem(item: VariantFormData) {
  const copy = cloneDeep(item)
  const key = item.key
  const v = availableVariants(key)[0]
  if (v) { // else. all variants there
    copy.variant = v
    // copy.label = copy.label + `#${v}`
    const position = editorForm.value.indexOf(item)
    editorForm.value.splice(position + 1, 0, copy)
  }
}

function deleteItem(item: VariantFormData) {
  editorForm.value = editorForm.value.filter(el => el !== item)
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
            :color="item.type==='boolean'? 'primary': undefined"
            :precision="item.precision === undefined? null : item.precision"
            :suffix="item.units"
            :prefix="item.variant"
            :items="item.items"
            :rules="getRules(item.rules)"
            :label="$gettext(item.label)"
            :multiple="item.multiple"
            @update:model-value="change(item)"
          >
            <template
              v-if="showEdit"
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
          </component>
        </slot>
      </div>

      <v-card-actions>
        <slot />
        <v-spacer />
        <v-btn
          v-if="variants"
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
