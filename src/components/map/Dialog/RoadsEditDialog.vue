<script setup lang="ts">

import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { computed, onMounted, ref, watch } from 'vue'
import attributesHints from '@constants/hints.js'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { useForm } from '@src/composables/UseForm'
import { getForm, getGroupForm } from '@src/components/utils/utils'
import { getDirection } from '@src/components/utils/spatial'
import { GroupForm } from '@src/types/components'
import { useGettext } from 'vue3-gettext'
import { LineStringFeatures } from '@src/types/geojson'
import { rlinksConstantProperties, rlinksDefaultProperties } from '@src/constants/properties'
const { $gettext } = useGettext()

type Dict = Record<string, string>

const store = useIndexStore()
const rlinksStore = userLinksStore()
const { showDialog, action, selectedArr } = useForm()

const rlinks = computed(() => rlinksStore.rlinks)
const attributesChoices = computed(() => rlinksStore.rlinksAttributesChoices)
const lineAttributes = computed(() => rlinksStore.rlineAttributes)
const reversedAttributes = computed(() => rlinksStore.reversedAttributes)
const rnodeAttributes = computed(() => rlinksStore.rnodeAttributes)
const exclusionList = computed(() => Object.keys(editorForm.value[0]) || [])
const typesMap = computed(() => Object.fromEntries(rlinksStore.linksDefaultAttributes.map(el => [el.name, el.type])))
const unitsMap = computed(() => Object.fromEntries(rlinksStore.linksDefaultAttributes.map(el => [el.name, el.units])))
const attributeNonDeletable = computed(() => rlinksDefaultProperties.map(el => el.name))

const rules = {}
const hints: Dict = attributesHints
const formRef = ref()

const editorForm = ref<GroupForm[]>([])
const numLinks = computed(() => { return editorForm.value.length })

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

const linkDir = ref<number[]>([])

function createForm() {
  let disabled: string[] = []
  let features: LineStringFeatures[] = []
  const selectedSet = new Set(selectedArr.value)
  switch (action.value) {
    case 'Edit rLink Info':
      // editorForm.value = selectedArr.value.map(linkId => rlinksStore.rlinksForm(linkId))
      features = rlinks.value.features.filter(link => selectedSet.has(link.properties.index))
      disabled = ['a', 'b', 'index']
      editorForm.value = features.map(feature => getForm(feature, lineAttributes.value, disabled))
      linkDir.value = features.map(feature => getDirection(feature.geometry.coordinates))
      console.log(features)
      features = features.filter(el => el.properties.oneway == '0')
      features.forEach(feature => {
        const linkId = feature.properties.index
        selectedArr.value.push(linkId)
        editorForm.value.push(getForm(feature, reversedAttributes.value, disabled))
        linkDir.value.push(getDirection(feature.geometry.coordinates))
      })
      break
    case 'Edit Road Group Info':
      features = rlinks.value.features.filter(link => selectedSet.has(link.properties.index))
      disabled = ['index', 'length', 'time', 'a', 'b']
      editorForm.value = [getGroupForm(features, lineAttributes.value, disabled)]
      break

    case 'Edit rNode Info':
      const selectedNode = selectedArr.value[0]
      const nodeFeatures = rlinksStore.visiblerNodes.features.filter((node) => node.properties.index === selectedNode)
      disabled = ['index', 'route_width']
      editorForm.value = [getGroupForm(nodeFeatures, rnodeAttributes.value, disabled)]

      break
      // map selected node doesnt not return properties with nanulln value.
      // we need to get the node in the store with the selected index.
  }
}

async function submitForm() {
  const resp = await Promise.all(formRef.value.map((f: any) => f.validate()))
  if (resp.includes(false)) { return false }
  switch (action.value) {
    case 'Edit rLink Info':
      rlinksStore.editrLinkInfo({ selectedArr: selectedArr.value, info: editorForm.value })
    case 'Edit Road Group Info':
      rlinksStore.editrGroupInfo({ selectedArr: selectedArr.value, info: editorForm.value })
      break
    case 'Edit rNode Info':
      rlinksStore.editrNodeInfo({ selectedArr: selectedArr.value, info: editorForm.value })
      break
  }
  return true
}
function quit() {
  showDialog.value = false
}

async function saveAndQuit() {
  await submitForm()
  showDialog.value = false
  store.changeNotification(
    { text: $gettext('modification applied'), autoClose: true, color: 'success' })
}

// add
function addFieldToLinksForms(newFieldName: string) {
  editorForm.value.forEach(form => {
    // If the form is a reversed one. add the field if its not in rcstAttribute
    // (ex: route_width, no route_width_r)
    if (Object.keys(form)[0].endsWith('_r') && !rlinksConstantProperties.includes(newFieldName)) {
      form[newFieldName + '_r'] = { disabled: false, placeholder: false, value: undefined, show: true }
    } else {
      // just a normal link
      form[newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
    }
  })
}

function addField (newFieldName: string) {
  if (newFieldName) {
    if (['Edit rLink Info', 'Edit Road Group Info'].includes(action.value)) {
      addFieldToLinksForms(newFieldName)
      rlinksStore.addLinksPropertie({ name: newFieldName })
    } else if (action.value === 'Edit rNode Info') {
      editorForm.value[0][newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
      rlinksStore.addNodesPropertie({ name: newFieldName })
    }
  }
}

// delete

const showDeleteOption = ref(false)

function deleteField (field: string) {
  editorForm.value.forEach(form => {
    delete form[field]
    delete form[field + '_r']
  })
  if (['Edit rLink Info', 'Edit Road Group Info'].includes(action.value)) {
    rlinksStore.deleteLinksPropertie({ name: field })
  } else if (action.value === 'Edit rNode Info') {
    rlinksStore.deleteNodesPropertie({ name: field })
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

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    :max-width="`${30*numLinks}rem`"
    @keydown.enter="saveAndQuit"
  >
    <v-card
      max-height="55rem"
    >
      <v-card-title class="text-h5">
        {{ $gettext("Edit Properties") }}
      </v-card-title>
      <v-divider />
      <v-card-text class="container">
        <v-row>
          <v-col
            v-for="(n,idx) in numLinks"
            :key="idx"
          >
            <v-list-item v-if="numLinks > 1">
              <v-icon
                :style="{'align-items':'center',
                         'justify-content': 'center',
                         transform: 'rotate('+linkDir[idx]+'deg)'}"
              >
                fas fa-long-arrow-alt-up
              </v-icon>
            </v-list-item>
            <EditForm
              ref="formRef"
              v-model:editor-form="editorForm[idx]"
              :show-hint="showHint"
              :show-delete-option="idx === 0 ? showDeleteOption:false"
              :hints="hints"
              :units="unitsMap"
              :rules="rules"
              :attribute-non-deletable="attributeNonDeletable"
              :attributes-choices="attributesChoices"
              :types="typesMap"
              @delete-field="deleteField"
            />
            <NewFieldForm
              v-if="idx===0"
              :exclusions-list="exclusionList"
              @add-field="addField"
            />
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
.col{
  min-width: 300px; /* Ensures proper wrapping on small screens */
}
.container {
  display: flex;
}
</style>
