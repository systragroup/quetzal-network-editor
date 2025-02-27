<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useODStore } from '@src/store/od'
import { computed, onMounted, ref, watch } from 'vue'
import attributesHints from '@constants/hints.js'
import attributesUnits from '@constants/units.js'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { useForm } from '@src/composables/UseForm'
import { getGroupForm } from '@src/components/utils/utils'
import { GroupForm } from '@src/types/components'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

type Dict = Record<string, string>

const store = useIndexStore()
const odStore = useODStore()
const { showDialog, selectedArr } = useForm()

const layer = computed(() => odStore.layer)
const lineAttributes = computed(() => odStore.layerAttributes)
const exclusionList = computed(() => Object.keys(editorForm.value) || [])

const attributeNonDeletable = ref(['index'])
const rules = {}
const hints: Dict = attributesHints
const units: Dict = attributesUnits
const formRef = ref()

const editorForm = ref<GroupForm>({})

const showHint = ref(false)

onMounted(() => {
  init()
})

watch(showDialog, (val) => {
  if (val) { init() }
})

function init() {
  store.changeNotification({ text: '', autoClose: true })
  createForm()
  showHint.value = false
  showDeleteOption.value = false
}

function createForm() {
  const selectedSet = new Set(selectedArr.value)
  const features = layer.value.features.filter(feat => selectedSet.has(feat.properties.index))
  const disabled = ['index']
  editorForm.value = getGroupForm(features, lineAttributes.value, disabled)
}

async function submitForm() {
  const resp = await formRef.value.validate()
  if (!resp) { return false }
  odStore.editGroupInfo({ selectedArray: selectedArr.value, info: editorForm.value })
}

function quit() {
  showDialog.value = false
}

async function saveAndQuit() {
  await submitForm()
  quit()
}

// add
function addField (newFieldName: string) {
  if (newFieldName) {
    editorForm.value[newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
    odStore.addPropertie(newFieldName)
  }
}

// delete

const showDeleteOption = ref(false)

function deleteField (field: string) {
  delete editorForm.value[field]
  odStore.deletePropertie(field)

  store.changeNotification({ text: $gettext('Field deleted'), autoClose: true, color: 'success' })
}

function ToggleDeleteOption () {
  showDeleteOption.value = !showDeleteOption.value
  if (showDeleteOption.value) {
    store.changeNotification({
      text: $gettext('This action will delete properties on every links or nodes'),
      autoClose: false,
      color: 'warning',
    })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    max-width="30rem"
    @keydown.enter="saveAndQuit"
  >
    <v-card
      max-height="55rem"
    >
      <v-card-title class="text-h5">
        {{ $gettext("Edit Properties") }}
      </v-card-title>
      <v-divider />
      <v-card-text>
        <EditForm
          ref="formRef"
          v-model:editor-form="editorForm"
          :show-hint="showHint"
          :show-delete-option="showDeleteOption"
          :hints="hints"
          :units="units"
          :rules="rules"
          :attribute-non-deletable="attributeNonDeletable"
          @delete-field="deleteField"
        />
        <NewFieldForm
          :exclusions-list="exclusionList"
          @add-field="addField"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-btn
          icon="far fa-question-circle small"
          variant="text"
          size="x-small"
          @click="()=>showHint = !showHint"
        />
        <v-btn
          :icon="showDeleteOption? 'fas fa-minus-circle fa-rotate-90': 'fas fa-minus-circle'"
          size="x-small"
          variant="text"
          @click="ToggleDeleteOption"
        />
        <v-spacer />

        <v-btn
          color="grey"
          variant="text"
          @click="quit"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="success"
          variant="text"
          @click="saveAndQuit"
        >
          {{ $gettext("Save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>
</style>
