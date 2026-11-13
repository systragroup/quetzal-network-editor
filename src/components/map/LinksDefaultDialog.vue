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
import DragList from '../utils/DragList.vue'
const store = useIndexStore()
const linksStore = useLinksStore()

import { getDefaultLink } from '@src/utils/network'
import { AttributeTypes } from '@src/types/typesStore.ts'
import { getGroupForm, getPropertyName, sortWithOrder } from '@src/utils/form.ts'
import { baseUnits, linksDefaultProperties } from '@src/constants/properties.ts'
import TooltipButton from '../utils/TooltipButton.vue'

const showDialog = defineModel<boolean>({ default: false })

const _attributesChoices = computed(() => linksStore.linksAttributesChoices)
const _typesMap = computed(() => linksStore.linkTypes)
const _lineAttributes = computed(() => linksStore.lineAttributes)
const _attributeNonDeletable = computed<string[]>(() => linksDefaultProperties.map(el => el.name))
const _displayUnits = computed(() => Object.assign(cloneDeep(baseUnits), store.displayUnits))
const _exclusionList = computed(() => Object.keys(editorForm.value))

const tripProperties = ref<string[]>([]) // tripsProperties,no variant. set in init()
const order = ref<string[]>([]) // all props ordered, with variant. set in init()

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
  showDeleteOption.value = false
  showHint.value = false
})

function init() {
  store.changeNotification({ text: '', autoClose: true })
  order.value = [...new Set(_lineAttributes.value.map(key => getPropertyName(key)))] //  get props name (no variant)
  tripProperties.value = cloneDeep(linksStore.tripProperties)
  createForm()
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
  editorForm.value = getGroupForm(features, _lineAttributes.value, disabled)
}

const linksForm = computed(() => Object.fromEntries(
  Object.entries(editorForm.value).sort(([a], [b]) => sortWithOrder(order.value, a, b))
    .filter(([key]) => !tripProperties.value.includes(getPropertyName(key))),
))

const tripsForm = computed(() => Object.fromEntries(
  Object.entries(editorForm.value).sort(([a], [b]) => sortWithOrder(order.value, a, b))
    .filter(([key]) => tripProperties.value.includes(getPropertyName(key))),
))

async function submitForm() {
  const resp = await formRef.value.validate()
  if (!resp) return
  store.setModelConfig({ tripProperties: tripProperties.value, propertiesOrder: order.value })
  linksStore.sortLinksDefaultProperties(order.value)
  linksStore.editLinksDefaultProperties(editorForm.value)
  showDialog.value = false
}

function cancel() {
  showDialog.value = false
}

// add

function addField (newFieldName: string, dtype: AttributeTypes) {
  if (!newFieldName) return
  editorForm.value[newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
  linksStore.addLinksPropertie({ name: newFieldName, type: dtype })
  order.value.push(newFieldName)
}

// delete

function deleteField (field: string) {
  delete editorForm.value[field]
  linksStore.deleteLinksPropertie(field)
  order.value = order.value.filter(el => el !== field)
}

const showDeleteOption = ref(false)
watch(showDeleteOption, (val) => {
  if (val) {
    store.changeNotification({
      text: $gettext('This action will delete properties on every links'),
      autoClose: false,
      color: 'warning',
    })
  } else {
    store.changeNotification({ text: '', autoClose: true })
  }
},
)

// move

function moveProperty(key: string) {
  const name = getPropertyName(key)
  if (tripProperties.value.includes(name)) {
    tripProperties.value = tripProperties.value.filter(el => el !== name)
  } else {
    tripProperties.value.push(name)
  }
}

function moveLayer() {
  order.value = [...order.value] // force trigger
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    max-width="60rem"
    persistent
    @keydown.enter="submitForm"
  >
    <v-card class="test">
      <DialogHeader :title="$gettext('Edit default values')" />
      <v-divider />
      <v-card-text class="container">
        <v-col class="col">
          <h2 class="title">
            {{ $gettext('Order') }}
          </h2>
          <DragList
            v-slot="{item:key}"
            :items="order"
            @move="moveLayer"
          >
            <v-list-item
              :class="{prepend:showDeleteOption}"
            >
              <template v-slot:prepend>
                <v-btn
                  v-if="showDeleteOption"
                  variant="text"
                  icon="fas fa-trash small"
                  size="x-small"
                  :disabled="_attributeNonDeletable.includes(key)"
                  color="error"
                  @click="()=>deleteField(key)"
                />
              </template>
              <v-list-item-title :style="{'cursor': 'default'}">
                {{ key }}
              </v-list-item-title>
              <template v-slot:append>
                <v-icon
                  :style="{'cursor':'grab'}"
                  size="small"
                  icon="fa-solid fa-arrows-up-down"
                />
              </template>
            </v-list-item>
          </DragList>
        </v-col>
        <v-col class="col">
          <h2 class="title">
            Trip
          </h2>
          <div class="inner-wrapper">
            <EditForm
              ref="formRef"
              v-model:editor-form="tripsForm"
              :show-hint="showHint"
              :hints="hints"
              :display-units="_displayUnits"
              :units="baseUnits"
              :rules="rules"
              :attribute-non-deletable="_attributeNonDeletable"
              :attributes-choices="_attributesChoices"
              :types="_typesMap"
            >
              <template
                v-slot:append="{key}"
              >
                <TooltipButton
                  variant="text"
                  icon="fas fa-arrow-right small"
                  size="x-small"
                  :tooltip="$gettext('set as link property')"
                  :disabled="_attributeNonDeletable.includes(key)"
                  @click.stop="()=>moveProperty(key)"
                />
              </template>
            </EditForm>
          </div>
        </v-col>
        <v-col class="col">
          <h2 class="title">
            Link
          </h2>
          <div class="inner-wrapper">
            <EditForm
              ref="formRef"
              v-model:editor-form="linksForm"
              :show-hint="showHint"
              :hints="hints"
              :display-units="_displayUnits"
              :units="baseUnits"
              :rules="rules"
              :attribute-non-deletable="_attributeNonDeletable"
              :attributes-choices="_attributesChoices"
              :types="_typesMap"
              @delete-field="deleteField"
            >
              <template
                v-slot:prepend="{key}"
              >
                <TooltipButton
                  variant="text"
                  icon="fas fa-arrow-left small"
                  size="x-small"
                  :tooltip="$gettext('set as trip property')"
                  :disabled="_attributeNonDeletable.includes(key)"
                  @click.stop="()=>moveProperty(key)"
                />
              </template>
            </EditForm>
            <NewFieldForm
              :exclusions-list="_exclusionList"
              @add-field="addField"
            />
          </div>
        </v-col>
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
          @click="showDeleteOption=!showDeleteOption"
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
  background-color:  rgba(var(--v-theme-lightgrey));
  max-height: 100%;
  gap:0.5rem;
  overflow: hidden !important;
}
.title{
  font-size: large;
}
.prepend {
  padding-left:0
 }
 .col{
  padding:1rem;
  background-color:  rgba(var(--v-theme-white));
  overflow: scroll !important;
  border-radius: 5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
 }
.inner-wrapper {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
 .order-col{
    background-color:  rgba(var(--v-theme-white));
    padding:0;
    margin:0;
 }
</style>
