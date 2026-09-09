<script setup lang="ts">
// Must call with v-if
import { computed, ref, toRefs } from 'vue'
import SimpleForm from '../common/SimpleForm.vue'
import { FormData } from '@src/types/components.ts'
import { useGettext } from 'vue3-gettext'
import { PARAM_TYPES, SingleParam } from '@src/types/typesStore.ts'
import BaseDialog from '../utils/BaseDialog.vue'
import { formDataToRecord, isDefined } from '@src/utils/utils.ts'
import { cloneDeep } from 'lodash'
const { $gettext } = useGettext()

interface Props {
  categories: string[]
  namesMap: Map<string, string[]>
}
const props = defineProps<Props>()
const { categories, namesMap } = toRefs(props)
const showDialog = defineModel({ type: Boolean, default: false })
const emits = defineEmits(['add'])

// rules for duplicated name
const selectedCategory = ref('')
function changeCategory(item: FormData) {
  if (item.key === 'category') selectedCategory.value = item.value
}
const usedNames = computed<string[]>(() => namesMap.value.get(selectedCategory.value) || [])
const nameRule = (val: string) => !usedNames.value.includes(val) || $gettext('already exist')

// form
const editorForm = ref<FormData[]>([
  {
    key: 'category',
    label: 'category',
    value: undefined,
    placeholder: $gettext('Type or select'),
    type: 'combo',
    items: categories.value,
    rules: ['required'],
    hint: $gettext('name of the category of parameter. type to add a new one'),

  },
  {
    key: 'text',
    label: 'display text',
    value: 'new param',
    type: 'string',
    rules: ['required'],
    hint: $gettext('name of the parameter to display'),
  },
  {
    key: 'name',
    label: 'variable name',
    value: 'param',
    type: 'string',
    rules: ['required', nameRule],
    hint: $gettext('name of the parameter in the python model'),
  },
  {
    key: 'type',
    label: 'type',
    value: PARAM_TYPES[0],
    type: 'select',
    items: Object.values(PARAM_TYPES),
    rules: ['required'],
    hint: $gettext('type of the parameter'),
  },
  {
    key: 'rules',
    label: 'rules',
    value: ['required'],
    type: 'select',
    items: ['required', 'largerThanZero', 'nonNegative'],
    multiple: true,
    hint: $gettext('validation to apply on the input value'),
  },
  {
    key: 'hint',
    label: 'hint',
    value: '',
    type: 'string',
  },
  {
    key: 'items',
    label: 'choices',
    disabled: false,
    value: undefined,
    type: 'combo',
    placeholder: $gettext('Press enter to add an item'),
    hint: $gettext('Choice of value to select'),
  },
  {
    key: 'multiple',
    label: 'multiple',
    value: false,
    type: 'boolean',
    hint: $gettext('For selection: if multiple values can be selected or only one'),
  },
])

async function confirm() {
  const resp = await formRef.value.validate()
  if (!resp) return
  const record = formDataToRecord(cloneDeep(editorForm.value))
  const param: SingleParam = {
    name: record.name.value,
    text: record.text.value,
    value: undefined,
    type: record.type.value,
    rules: record.rules.value,
    hint: record.hint.value,
  }
  if (isDefined(record.items.value)) {
    param.items = record.items.value
    param.multiple = record.multiple.value
  }
  emits('add', param, record.category.value)
  showDialog.value = false
}

function cancel() {
  showDialog.value = false
}
const formRef = ref()
</script>
<template>
  <BaseDialog
    v-model="showDialog"
    :title="$gettext('Add a new parameter')"
    :max-width="500"
  >
    <SimpleForm
      ref="formRef"
      v-model="editorForm"
      @change="changeCategory"
    >
      <template #items="{item}">
        <v-combobox
          v-model="item.value"
          multiple
          chips
          :label="item.label"
          :hint="item.hint"
          :placeholder="item.placeholder"
          persistent-placeholder
          persistent-hint
          clearable
          closable-chips
        />
      </template>
      <v-card-actions>
        <v-spacer />
        <v-btn
          @click="cancel"
        >
          {{ $gettext('Cancel') }}
        </v-btn>

        <v-btn
          color="success"
          @click="confirm"
        >
          {{ $gettext('Add') }}
        </v-btn>
      </v-card-actions>
    </SimpleForm>
  </BaseDialog>
</template>
<style lang="scss" scoped>

</style>
