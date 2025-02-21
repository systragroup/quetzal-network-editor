<script setup lang="ts">
import EditScheduleDialog from '@comp/map/EditScheduleDialog.vue'

import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, onMounted, ref, watch } from 'vue'
import { createHash } from 'sha256-uint8array'
import { cloneDeep } from 'lodash'
import attributesHints from '@constants/hints.js'
import attributesUnits from '@constants/units.js'
import SimpleDialog from '@src/components/utils/SimpleDialog.vue'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { useGettext } from 'vue3-gettext'
import { GroupForm } from '@src/types/components'
import { getGroupForm, isScheduleTrip } from '@src/components/utils/utils'
const { $gettext } = useGettext()

type Dict = Record<string, string>

function hashJson(body: Record<string, any>) {
  return createHash().update(JSON.stringify(body)).digest('hex')
}

const store = useIndexStore()
const linksStore = useLinksStore()

import { useForm } from '@src/composables/UseForm'
const { showDialog, action, selectedArr, lingering } = useForm()

// const links = computed(() => linksStore.links)
const attributesChoices = computed(() => linksStore.linksAttributesChoices)
const lineAttributes = computed(() => linksStore.lineAttributes)
const nodeAttributes = computed(() => linksStore.nodeAttributes)
const tripList = computed(() => linksStore.tripList)
const isSchedule = computed(() => isScheduleTrip(linksStore.editorLinks.features[0]))
const exclusionList = computed(() => Object.keys(editorForm.value) || [])

const typesMap = computed(() => Object.fromEntries(linksStore.defaultAttributes.map(attr => [attr.name, attr.type])))
const attributeNonDeletable = computed(() => linksStore.defaultAttributes.map(el => el.name))

const formRef = ref()

const initialHash = ref()
const initialForm = ref<GroupForm>({})
const editorForm = ref<GroupForm>({})

const showHint = ref(false)
const hints: Dict = attributesHints
const units: Dict = attributesUnits

const rules: any = ({
  trip_id: [
    (val: string) => ((val === initialForm.value.trip_id.value) || (!tripList.value.includes(val)))
    || $gettext('already exist'),
  ],
})

onMounted(() => {
  init()
})
watch(showDialog, (val) => {
  if (val) { init() }
})

function init() {
  store.changeNotification({ text: '', autoClose: true })
  createForm()
  initialHash.value = hashJson(editorForm.value)
  initialForm.value = cloneDeep(editorForm.value)
  showHint.value = false
  showDeleteOption.value = false
}

function createForm() {
  let disabled = []
  let features = []
  switch (action.value) {
    case 'Edit Line Info':
      if (linksStore.editorLinks.features.length === 0) {
        const newLink = linksStore.getDefaultLink()
        features = cloneDeep(newLink.features)
      } else {
        features = linksStore.editorLinks.features
      }
      disabled = ['index', 'length', 'time', 'a', 'b', 'link_sequence', 'anchors', 'departures', 'arrivals']
      if (isSchedule.value) { disabled = [...disabled, 'speed'] }
      editorForm.value = getGroupForm(features, lineAttributes.value, disabled)
      break
    case 'Edit Group Info':
      const selectedSet = new Set(selectedArr.value)
      features = linksStore.links.features.filter(link => selectedSet.has(link.properties.trip_id))
      disabled = ['index', 'length', 'time', 'a', 'b', 'link_sequence', 'trip_id', 'anchors', 'departures', 'arrivals']
      editorForm.value = getGroupForm(features, lineAttributes.value, disabled)
      break
    case 'Edit Link Info':
      // link is clicked on the map
      const selectedLink = selectedArr.value[0]
      features = linksStore.editorLinks.features.filter((link) => link.properties.index === selectedLink)
      disabled = ['a', 'b', 'index', 'length', 'link_sequence', 'trip_id', 'anchors', 'departures', 'arrivals']
      if (isSchedule.value) { disabled = [...disabled, ...['speed', 'time']] }
      editorForm.value = getGroupForm(features, lineAttributes.value, disabled)
      break
    case 'Edit Node Info':
      const selectedNode = selectedArr.value[0]
      features = linksStore.editorNodes.features.filter((node) => node.properties.index === selectedNode)
      disabled = ['index', 'route_width']
      editorForm.value = getGroupForm(features, nodeAttributes.value, disabled)
      break
  }
}

async function submitForm() {
  const resp = await formRef.value.validate()
  if (!resp) { return false }
  if (linksStore.editorNodes.features.length === 0) {
    store.changeNotification({ text: $gettext('Click on the map to start drawing'), autoClose: false })
  }
  switch (action.value) {
    case 'Edit Line Info':
      linksStore.editLineInfo(editorForm.value)
      break
    case 'Edit Group Info':
      linksStore.editGroupInfo({ selectedArray: selectedArr.value, info: editorForm.value })
      break
    case 'Edit Link Info':
      linksStore.editLinkInfo({ selectedIndex: selectedArr.value[0], info: editorForm.value })
      break
    case 'Edit Node Info':
      linksStore.editNodeInfo({ selectedIndex: selectedArr.value[0], info: editorForm.value })
  }
  return true
}
function quit() {
  showDialog.value = false
  showSchedule.value = false
  if (!lingering.value) {
    linksStore.confirmChanges()
    store.changeNotification({ text: $gettext('modification applied'), autoClose: true, color: 'success' })
  }
}

async function saveAndQuit() {
  await submitForm()
  quit()
}

function cancel() {
  showDialog.value = false
  showSchedule.value = false
  if (!lingering.value) {
    linksStore.setEditorTrip(null)
  }
}

// computed speed, time, length. for individual links only.

function change (key: string) {
  switch (key) {
    case 'speed':
      editorForm.value.speed.value = Number(editorForm.value.speed.value).toFixed(6)
      const time = editorForm.value.length.value / editorForm.value.speed.value * 3.6
      if (!editorForm.value.time.placeholder) {
        editorForm.value.time.value = Number(time.toFixed(0))
      }
      break
    case 'time':
      editorForm.value.time.value = Number(editorForm.value.time.value).toFixed(0)
      const speed = editorForm.value.length.value / editorForm.value.time.value * 3.6
      if (!editorForm.value.speed.placeholder) {
        editorForm.value.speed.value = Number(speed.toFixed(6))
      }
      break
    case 'length':
      editorForm.value.length.value = Number(editorForm.value.length.value).toFixed(0)
      const time2 = editorForm.value.length.value / editorForm.value.speed.value * 3.6
      if (!editorForm.value.placeholder) {
        editorForm.value.time.value = Number(time2.toFixed(0))
      }
      break
  }
}

// add

function addField (newFieldName: string) {
  if (newFieldName) {
    editorForm.value[newFieldName] = { disabled: false, placeholder: false, value: undefined }
    if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
      linksStore.addLinksPropertie({ name: newFieldName })
    } else if (action.value === 'Edit Node Info') {
      linksStore.addNodesPropertie({ name: newFieldName })
    }
  }
}

// delete

const showDeleteOption = ref(false)

function deleteField (field: string) {
  delete editorForm.value[field]
  if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
    linksStore.deleteLinksPropertie({ name: field })
  } else if (action.value === 'Edit Node Info') {
    linksStore.deleteNodesPropertie({ name: field })
  }
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

// schedule

const showScheduleButton = computed(() =>
  linksStore.editorNodes.features.length !== 0
  && action.value === 'Edit Line Info',
)

const showSchedule = ref(false)

function toggleSchedule() {
  showSchedule.value = !showSchedule.value
  showDialog.value = !showSchedule.value
}

const showSaveDialog = ref(false)
function toggle() {
  if (hashJson(editorForm.value) == initialHash.value) {
    toggleSchedule()
  } else {
    showSaveDialog.value = true
  }
}
async function handleSimpleDialog(response: boolean) {
  showSaveDialog.value = false
  if (response) {
    const ok = await submitForm()
    if (ok) { toggleSchedule() }
  } else {
    toggleSchedule()
  }
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    persistent
    :max-width="'30rem'"
  >
    <v-card
      max-height="55rem"
    >
      <v-card-title class="text-h5">
        {{ $gettext("Edit Properties") }}
        <v-btn
          v-if="showScheduleButton"
          variant="text"
          class="pl-auto"
          prepend-icon="fas fa-clock"
          @click="toggle"
        >
          {{ isSchedule? $gettext("Edit Schedule"): $gettext("Create Schedule") }}
        </v-btn>
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
          :attributes-choices="attributesChoices"
          :types="typesMap"
          @change="change"
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
          @click="cancel"
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

  <!-- Schedule Dialog -->

  <EditScheduleDialog
    v-model="showSchedule"
    @toggle="toggleSchedule()"
    @cancel-action="cancel"
    @apply-action="quit"
  />
  <SimpleDialog
    v-model="showSaveDialog"
    :title="$gettext('Save Changes?')"
    body=""
    confirm-color="primary"
    :confirm-button="$gettext('Yes')"
    :cancel-button="$gettext('No')"
    @confirm="handleSimpleDialog(true)"
    @cancel="handleSimpleDialog(false)"
  >
    <v-btn
      @click="showSaveDialog=false"
    >
      {{ $gettext('Cancel') }}
    </v-btn>
  </SimpleDialog>
</template>
<style lang="scss" scoped>

</style>
