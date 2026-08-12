<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { AttributeTypes } from '@src/types/typesStore'
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import MenuSelector from '../utils/MenuSelector.vue'
const { $gettext } = useGettext()
const store = useIndexStore()

interface Props {
  exclusionsList: string[]
}
const props = withDefaults(defineProps<Props>(), {
  exclusionsList: () => [],
})

const emits = defineEmits(['addField'])

const newFieldRef = ref()
const newFieldName = ref<string | undefined>(undefined)
const newFieldRules = [
  (val: string) => !props.exclusionsList.includes(val) || $gettext('field already exist'),
  (val: string) => val !== '' || $gettext('cannot add empty field'),
  (val: string) => !val?.includes('#') || $gettext('field cannot contain #'),
  (val: string) => !val?.endsWith('_r') || $gettext('field cannot end with _r'),

]

async function addField () {
  const resp = await newFieldRef.value.validate()
  if (!resp.valid) { return false }
  // emits('addField', { name: newFieldName.value, dtype: dtype.value })
  emits('addField', newFieldName.value, dtype.value)

  newFieldName.value = undefined // reset
  dtype.value = 'String' // reset
  store.changeNotification({ text: $gettext('Field added'), autoClose: true, color: 'success' })
}
const dtype = ref<AttributeTypes>('String')
const dtypeChoices = ref<AttributeTypes[]>([undefined, 'String', 'Number', 'Boolean'])
// delete

</script>
<template>
  <v-form ref="newFieldRef">
    <v-text-field
      v-model="newFieldName"
      :label=" $gettext('add field')"
      :suffix="dtype"
      :placeholder="$gettext('new field name')"
      variant="filled"
      :rules="newFieldRules"
      @keydown.enter.prevent="addField"
      @wheel="$event.target.blur()"
    >
      <template v-slot:append>
        <v-btn
          color="primary"
          icon="fas fa-plus"
          size="x-small"
          @click="addField"
        />
      </template>
      <template v-slot:append-inner>
        <MenuSelector
          v-model="dtype"
          :items="dtypeChoices"
          size="small"
        />
      </template>
    </v-text-field>
  </v-form>
</template>
<style lang="scss" scoped>

</style>
