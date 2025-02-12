<script setup lang="ts">
import ColorPicker from '@comp/utils/ColorPicker.vue'
import MenuSelector from '@comp/utils/MenuSelector.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, ref, watch } from 'vue'
import { createHash } from 'sha256-uint8array'
import { cloneDeep } from 'lodash'
import attributesHints from '@constants/hints.js'
import attributesUnits from '@constants/units.js'
import SimpleDialog from '@src/components/utils/SimpleDialog.vue'

import { useGettext } from 'vue3-gettext'
import { GroupForm } from '@src/types/components'
import { getGroupForm, isScheduleTrip } from '@src/components/utils/utils.ts'
const { $gettext } = useGettext()
function hashJson(body: Record<string, any>) {
  return createHash().update(JSON.stringify(body)).digest('hex')
}

const emit = defineEmits(['applyAction', 'cancelAction', 'toggle'])

const store = useIndexStore()
const linksStore = useLinksStore()

import { useForm } from '@src/composables/UseForm'
const { showDialog, action, selectedArr, lingering } = useForm()

// const links = computed(() => linksStore.links)
const attributesChoices = computed(() => linksStore.linksAttributesChoices)
const lineAttributes = computed(() => linksStore.lineAttributes)
const nodeAttributes = computed(() => linksStore.nodeAttributes)
const tripList = computed(() => linksStore.tripId)
const formRef = ref()
const newFieldRef = ref()

const initialHash = ref()
const initialForm = ref<GroupForm>({})
const editorForm = ref<GroupForm>({})
const showDeleteOption = ref(false)

watch(showDialog, (val) => {
  // do not show a notification when dialog is on. sometime its over the confirm button
  if (val) { store.changeNotification({ text: '', autoClose: true }) }
  createForm()
  initialHash.value = hashJson(editorForm.value)
  initialForm.value = cloneDeep(editorForm.value)
  showHint.value = false
  showDeleteOption.value = false
})

function createForm() {
  let disabled = []
  let features = []
  switch (action.value) {
    case 'Edit Line Info':
      features = linksStore.editorLinks.features.length === 0
        ? cloneDeep(linksStore.defaultLink.features)
        : linksStore.editorLinks.features
      disabled = ['index', 'length', 'time', 'a', 'b', 'link_sequence', 'anchors', 'departures', 'arrivals']
      if (isScheduleTrip(features[0])) { disabled = [...disabled, 'speed'] }
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
      if (isScheduleTrip(features[0])) { disabled = [...disabled, ...['speed', 'time']] }
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
  if (!resp.valid) { return false }
  if (linksStore.editorNodes.features.length === 0) {
    store.changeNotification({ text: $gettext('Click on the map to start drawing'), autoClose: false })
  }
  switch (action.value) {
    case 'Edit Line Info':
      linksStore.editLineInfo(editorForm.value)
      break
    case 'Edit Group Info':
      linksStore.editGroupInfo({ groupTripIds: selectedArr.value, info: editorForm.value })
      break
    case 'Edit Link Info':
      linksStore.editLinkInfo({ selectedIndex: selectedArr.value[0], info: editorForm.value })
      break
    case 'Edit Node Info':
      console.log(selectedArr.value)
      linksStore.editNodeInfo({ selectedIndex: selectedArr.value[0], info: editorForm.value })
  }
  showDialog.value = false
  if (!lingering.value) {
    linksStore.confirmChanges()
    store.changeNotification(
      { text: $gettext('modification applied'), autoClose: true, color: 'success' })
  }
  return true
}

const orderedForm = computed (() => {
  // order editor Form in alphatical order
  let form = editorForm.value
  // order keys in alphabetical order, and with disabled last
  const keys = Object.keys(form).filter(key => !form[key].disabled).sort()
  keys.push(...Object.keys(form).filter(key => form[key].disabled).sort())
  const ordered = keys.reduce(
    (obj: Record<string, any>, key: string) => {
      obj[key] = form[key]
      return obj
    },
    {},
  )
  return ordered
})

const showScheduleButton = computed(() => linksStore.editorNodes.features.length !== 0)

function cancel() {
  showDialog.value = false
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

function attributeNonDeletable (field: string) {
  return linksStore.defaultAttributesNames.includes(field)
}

type Dict = Record<string, string>

const showHint = ref(false)
const hints: Dict = attributesHints
const units: Dict = attributesUnits
const newFieldRules = [
  (val: string) => !Object.keys(editorForm.value).includes(val) || $gettext('field already exist'),
  (val: string) => val !== '' || $gettext('cannot add empty field'),
  (val: string) => !val?.includes('#') || $gettext('field cannot contain #'),
]

const rules: any = ({
  trip_id: [
    (val: string) => ((val === initialForm.value.trip_id.value) || (!tripList.value.includes(val)))
    || $gettext('already exist'),
  ],
})

const newFieldName = ref<string | undefined>()

async function addField () {
  const resp = await newFieldRef.value.validate()
  if (!resp.valid) { return false }
  if (newFieldName.value) {
    editorForm.value[newFieldName.value] = { disabled: false, placeholder: false, value: undefined }
    newFieldName.value = undefined // null so there is no rules error.
    store.changeNotification({ text: $gettext('Field added'), autoClose: true, color: 'success' })
  }
}
function deleteField (field: string) {
  delete editorForm.value[field]
  store.changeNotification({ text: $gettext('Field deleted'), autoClose: true, color: 'success' })
}

function ToggleDeleteOption () {
  showDeleteOption.value = !showDeleteOption.value

  if (showDeleteOption.value) {
    store.changeNotification({
      text: $gettext('This action will delete properties on every links (and reversed one for two-way roads)'),
      autoClose: false,
      color: 'warning',
    })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
}

const showSaveDialog = ref(false)
function toggle() {
  if (hashJson(editorForm.value) == initialHash.value) {
    emit('toggle')
  } else {
    showSaveDialog.value = true
  }
}
async function handleSimpleDialog(event: boolean) {
  showSaveDialog.value = false
  if (event) {
    const ok = await submitForm()
    if (ok) { emit('toggle') }
  } else {
    emit('toggle')
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
          {{ $gettext("Edit Schedule") }}
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-form ref="formRef">
          <v-list>
            <v-text-field
              v-for="(value, key) in orderedForm"
              :key="key"
              v-model="value['value']"
              :label="String(key)"
              :hint="showHint? hints[key]: ''"
              :persistent-hint="showHint"
              :variant="value['disabled']? 'underlined': 'filled'"
              :type="linksStore.attributeType(key)"
              :placeholder="value['placeholder']? $gettext('multiple Values'):''"
              :persistent-placeholder=" value['placeholder']? true:false "
              :disabled="value['disabled']"
              :suffix="units[key]"
              :rules="rules[key]"
              :prepend-inner-icon="['length','speed','time'].includes(key) ? 'fas fa-calculator' : '' "
              @wheel="$event.target.blur()"
              @change="change(key)"
            >
              <template
                v-if="key==='route_color'"
                v-slot:append-inner
              >
                <color-picker
                  v-model:pcolor="value['value']"
                />
              </template>
              <template
                v-else-if="Object.keys(attributesChoices).includes(key)"
                v-slot:append-inner
              >
                <MenuSelector
                  v-model:value="value['value']"
                  :items="attributesChoices[key]"
                />
              </template>
              <template
                v-if="showDeleteOption"
                v-slot:prepend
              >
                <v-btn
                  variant="text"
                  icon="fas fa-trash small"
                  size="x-small"
                  :disabled="attributeNonDeletable(key)"
                  color="error"
                  @click="()=>deleteField(key)"
                />
              </template>
            </v-text-field>
          </v-list>
        </v-form>
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
          @click="submitForm"
        >
          {{ $gettext("Save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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
      color="regular"
      @click="showSaveDialog=false"
    >
      {{ $gettext('Cancel') }}
    </v-btn>
  </SimpleDialog>
</template>
<style lang="scss" scoped>

</style>
