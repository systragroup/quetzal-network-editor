<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { computed, onMounted, ref, watch } from 'vue'
import { cloneDeep } from 'lodash'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { GroupForm, Rule } from '@src/types/components'
import DialogHeader from './Dialog/DialogHeader.vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const store = useIndexStore()
const linksStore = useLinksStore()

import { getDefaultLink } from '@src/utils/network'
import { AttributeTypes } from '@src/types/typesStore.ts'
import { getGroupForm } from '@src/utils/form.ts'
import { baseUnits, linksDefaultProperties } from '@src/constants/properties.ts'
import TooltipButton from '../utils/TooltipButton.vue'

const showDialog = defineModel<boolean>({ default: false })

const attributesChoices = computed(() => linksStore.linksAttributesChoices)
const lineAttributes = computed(() => linksStore.lineAttributes)
const linksAttributes = computed(() => lineAttributes.value.filter(el => !tripProperties.value.includes(el)))

const typesMap = computed(() => linksStore.linkTypes)
const attributeNonDeletable = computed<string[]>(() => linksDefaultProperties.map(el => el.name))
const displayUnits = computed(() => Object.assign(cloneDeep(baseUnits), store.displayUnits))
const exclusionList = computed(() => Object.keys(editorForm.value))

const tripProperties = ref<string[]>([])

const formRef = ref()
const editorForm = ref<GroupForm>({})

const showHint = ref(false)
const hints = computed(() => store.hints)

const rules = ref<Record<string, Rule[]> >({})

onMounted(() => {
  init()
})
watch(showDialog, (val) => {
  if (val) init()
})

function init() {
  store.changeNotification({ text: '', autoClose: true })
  tripProperties.value = cloneDeep(linksStore.tripProperties)
  createForm()
  showHint.value = false
  showDeleteOption.value = false
}

function createForm() {
  let disabled: string[] = []
  let features = []
  const newLink = getDefaultLink(linksStore.linksDefaultAttributes)
  newLink.features[0].properties.trip_id = undefined
  newLink.features[0].properties.time = undefined
  newLink.features[0].properties.link_sequence = undefined
  features = cloneDeep(newLink.features)
  disabled = ['index', 'a', 'b', 'length', 'time', 'link_sequence', 'anchors', 'departures', 'arrivals', 'trip_id']
  editorForm.value = getGroupForm(features, lineAttributes.value, disabled)
}
const linksForm = computed(() => Object.fromEntries(
  Object.entries(editorForm.value).filter(([key]) => linksAttributes.value.includes(key)),
))
const tripsForm = computed(() => Object.fromEntries(
  Object.entries(editorForm.value).filter(([key]) => tripProperties.value.includes(key)),
))

async function submitForm() {
  const resp = await formRef.value.validate()
  if (!resp) return
  linksStore.tripProperties = tripProperties.value
  linksStore.editLinksDefaultProperties(editorForm.value)
  showDialog.value = false
}

function cancel() {
  showDialog.value = false
}

// add

function addField (newFieldName: string, dtype: AttributeTypes) {
  console.log(newFieldName)
  if (!newFieldName) return
  editorForm.value[newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
  linksStore.addLinksPropertie({ name: newFieldName, type: dtype })
}

// delete

const showDeleteOption = ref(false)
function deleteField (field: string) {
  delete editorForm.value[field]
  linksStore.deleteLinksPropertie(field)
}

function ToggleDeleteOption () {
  showDeleteOption.value = !showDeleteOption.value
  if (showDeleteOption.value) {
    store.changeNotification({
      text: $gettext('This action will delete properties on every links'),
      autoClose: false,
      color: 'warning',
    })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
}

// move

function moveProperty(key: string) {
  // TODO make this on apply
  if (tripProperties.value.includes(key)) {
    tripProperties.value = tripProperties.value.filter(el => el !== key)
  } else {
    tripProperties.value.push(key)
  }
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    max-width="40rem"
    persistent
    @keydown.enter="submitForm"
  >
    <v-card>
      <DialogHeader :title="$gettext('Edit default values')" />
      <v-divider />
      <v-card-text class="container">
        <v-row>
          <v-col>
            <div class="arrows-container">
              Trip
            </div>
            <EditForm
              ref="formRef"
              v-model:editor-form="tripsForm"
              :show-hint="showHint"
              :show-delete-option="showDeleteOption"
              :hints="hints"
              :display-units="displayUnits"
              :units="baseUnits"
              :rules="rules"
              :attribute-non-deletable="attributeNonDeletable"
              :attributes-choices="attributesChoices"
              :types="typesMap"
              @delete-field="deleteField"
            >
              <template
                v-slot:append="{key}"
              >
                <TooltipButton
                  variant="text"
                  icon="fas fa-arrow-right small"
                  size="x-small"
                  :tooltip="$gettext('set as link property')"
                  :disabled="attributeNonDeletable.includes(key)"
                  @click.stop="()=>moveProperty(key)"
                />
              </template>
            </EditForm>
            <NewFieldForm
              :exclusions-list="exclusionList"
              @add-field="addField"
            />
          </v-col>
          <v-col>
            <div class="arrows-container">
              Link
            </div>
            <EditForm
              ref="formRef"
              v-model:editor-form="linksForm"
              :show-hint="showHint"
              :show-delete-option="showDeleteOption"
              :hints="hints"
              :display-units="displayUnits"
              :units="baseUnits"
              :rules="rules"
              :attribute-non-deletable="attributeNonDeletable"
              :attributes-choices="attributesChoices"
              :types="typesMap"
              @delete-field="deleteField"
            >
              <template
                v-slot:append="{key}"
              >
                <TooltipButton
                  variant="text"
                  icon="fas fa-arrow-left small"
                  size="x-small"
                  :tooltip="$gettext('set as trip property')"
                  :disabled="attributeNonDeletable.includes(key)"
                  @click.stop="()=>moveProperty(key)"
                />
              </template>
            </EditForm>
          </v-col>
        </v-row>
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
</template>
<style lang="scss" scoped>
.container {
  display: flex;
}
.arrows-container{
  display: flex;
  padding: 0 1rem 0.5rem ;
  justify-content: space-between;
  align-items: center; /* optional, vertical alignment */
  justify-content: center;
  font-size: large;
  }
</style>
