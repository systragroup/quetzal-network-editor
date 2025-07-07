<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

import { getRules } from '@src/utils/form'

import { useGettext } from 'vue3-gettext'
import { FormObject } from '@src/types/components'
import { StringTimeserie } from '@src/types/typesStore'
import { cloneDeep } from 'lodash'
const { $gettext } = useGettext()

// form data
const data = defineModel<StringTimeserie[]>({ default: [] })

onMounted(() => {
  data.value.forEach(per => {
    const form = cloneDeep(modelForm)
    form.start_time.value = per.start_time
    form.end_time.value = per.end_time
    form.period.value = per.value
    editorForms.value.push(form)
  })
})

const modelForm: FormObject = {
  start_time: { label: 'start time', value: '', type: 'time', rules: ['required'] },
  end_time: { label: 'end time', value: '', type: 'time', rules: ['required'] },
  period: { label: 'period name', value: '', type: 'string', rules: ['required'], disabled: false },
}

const editorForms = ref<FormObject[]>([])

function addNewForm() {
  const form = cloneDeep(modelForm)
  editorForms.value.push(form)
}

function deleteForm(indexToRemove: number) {
  editorForms.value = editorForms.value.filter((_, index) => index !== indexToRemove)
}

// we want to disabled the period name if only 1, ans set it to empty string
watch(editorForms, (forms) => {
  const first = forms[0]
  if (forms.length == 1) {
    first.period.disabled = true
    first.period.value = ''
  } else {
    first.period.disabled = false
  }
  updateModel()
}, { deep: true })

// udpate v-model
function updateModel() {
  const val = editorForms.value.map(el => { return {
    start_time: el.start_time.value,
    end_time: el.end_time.value,
    value: el.period.value,
  } })
  data.value = val
}

</script>
<template>
  <div
    v-for="(form,i) in editorForms"
    :key="i"
  >
    <div class="params-row">
      <v-btn
        v-if="i==0"
        icon="fas fa-plus"
        size="x-small"
        color="primary"
        @click="addNewForm"
      />
      <v-btn
        v-else
        icon="fas fa-trash"
        size="x-small"
        color="error"
        @click="deleteForm(i)"
      />
      <div
        v-for="(item, key) in form"
        :key="key"
        class="params"
      >
        <v-text-field
          v-show="!item.disabled"
          v-model="item.value"
          :type="item.type"
          step="1"
          variant="outlined"
          :label="$gettext(item.label)"
          :suffix="item.units"
          :rules="getRules(item.rules)"
          hide-details
          required
          @wheel="()=>{}"
        />
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.params-row {
  /* Add individual list item styles here */
  display: flex; /* Use flexbox layout for each list item */
  align-items: center;
  margin-right:1rem;
  padding-top: 0.5rem;
  justify-content:flex-start;
  gap: 1rem;
}
.params{
  width: 10rem;
}

</style>
