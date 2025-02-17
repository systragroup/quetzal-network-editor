<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { ref } from 'vue'
import { useGettext } from 'vue3-gettext'
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
const newFieldName = ref<string | undefined>()
const newFieldRules = [
  (val: string) => !props.exclusionsList.includes(val) || $gettext('field already exist'),
  (val: string) => val !== '' || $gettext('cannot add empty field'),
  (val: string) => !val?.includes('#') || $gettext('field cannot contain #'),
  (val: string) => !val?.endsWith('_r') || $gettext('field cannot end with _r'),

]

async function addField () {
  const resp = await newFieldRef.value.validate()
  if (!resp.valid) { return false }
  emits('addField', newFieldName.value)
  newFieldName.value = undefined // null so there is no rules error.
  store.changeNotification({ text: $gettext('Field added'), autoClose: true, color: 'success' })
}

// delete

</script>
<template>
  <v-form ref="newFieldRef">
    <v-text-field
      v-model="newFieldName"
      :label=" $gettext('add field')"
      :placeholder="$gettext('new field name')"
      variant="filled"
      :rules="newFieldRules"
      @keydown.enter.prevent="addField"
      @wheel="$event.target.blur()"
    >
      <template v-slot:append-inner>
        <v-btn
          color="primary"
          icon="fas fa-plus"
          size="x-small"
          @click="addField"
        />
      </template>
    </v-text-field>
  </v-form>
</template>
<style lang="scss" scoped>

</style>
