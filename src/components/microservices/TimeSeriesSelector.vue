<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

import { getRules } from '@src/utils/form'

import { useGettext } from 'vue3-gettext'
import { FormObject } from '@src/types/components'
import { StringTimeserie } from '@src/types/typesStore'
import { cloneDeep } from 'lodash'
import { hhmmssToSeconds } from '@src/utils/utils'
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
  period: { label: 'period name', value: '', type: 'string', rules: ['required', periodsRules], disabled: false },
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

// form validation

// Time rules
function timeRule(form: FormObject) {
  if (hhmmssToSeconds(form.start_time.value) > hhmmssToSeconds(form.end_time.value)) {
    return $gettext('Start time must be smaller than end time') }
  return true
}

// Time rules
function periodsRules(val: string | undefined) {
  if (val?.includes('#')) {
    return $gettext('field cannot contain #')
  }
  const periodNames = editorForms.value.map(el => el.period.value)
  if (periodNames.filter(el => el === val).length > 1) {
    return $gettext('period name must be unique')
  }

  return true
}

const formRef = ref()
async function validate() {
  const resp = await formRef.value.validate()
  if (!resp.valid) { return false }
  else { return true }
}

defineExpose({
  validate,
})

</script>
<template>
  <v-form
    ref="formRef"
    validate-on="input"
  >
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

        <v-text-field
          v-show="!form.start_time.disabled"
          v-model="form.start_time.value"
          class="params"
          :type="form.start_time.type"
          step="1"
          variant="outlined"
          validate-on="input"
          :label="$gettext(form.start_time.label)"
          :suffix="form.start_time.units"
          :rules="getRules(form.start_time.rules)"
          hide-details="auto"
          required
        />
        <v-text-field
          v-show="!form.end_time.disabled"
          v-model="form.end_time.value"
          class="params"
          :type="form.end_time.type"
          step="1"
          variant="outlined"
          :label="$gettext(form.end_time.label)"
          :suffix="form.end_time.units"
          :rules="[...getRules(form.end_time.rules), timeRule(form)]"
          hide-details="auto"
          required
        />
        <v-text-field
          v-if="!form.period.disabled"
          v-model="form.period.value"
          class="params"
          :type="form.period.type"
          step="1"
          variant="outlined"
          :label="$gettext(form.period.label)"
          :suffix="form.period.units"
          :rules="getRules(form.period.rules)"
          hide-details="auto"
          required
        />
      </div>
    </div>
  </v-form>
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
  max-width: 12rem;
}

</style>
