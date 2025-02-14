<script setup>

import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { computed, onMounted, ref, watch } from 'vue'
import { cloneDeep } from 'lodash'
import attributesHints from '@constants/hints.js'
import attributesUnits from '@constants/units.js'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
const store = useIndexStore()
const rlinksStore = userLinksStore()

import { useForm } from '@src/composables/UseForm'
import { getGroupForm } from '@src/components/utils/utils'
const { showDialog, action, selectedArr } = useForm()

const rlinks = computed(() => rlinksStore.rlinks)
const attributesChoices = computed(() => rlinksStore.rlinksAttributesChoices)
const lineAttributes = computed(() => rlinksStore.rlineAttributes)
const rnodeAttributes = computed(() => rlinksStore.rnodeAttributes)
// const nodeAttributes = computed(() => linksStore.nodeAttributes)
// const tripList = computed(() => linksStore.tripId)
const exclusionList = computed(() => [])

const typesMap = {}
const attributeNonDeletable = computed(() => rlinksStore.rundeletable)

const rules = {}
const hints = attributesHints
const units = attributesUnits
const formRef = ref()

const initialForm = ref({})
const editorForm = ref({})
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
  initialForm.value = cloneDeep(editorForm.value)
  showHint.value = false
  showDeleteOption.value = false
}

const linkDir = ref([])

function createForm() {
  switch (action.value) {
    case 'Edit rLink Info':
      editorForm.value = selectedArr.value.map(linkId => rlinksStore.rlinksForm(linkId))
      linkDir.value = selectedArr.value.map(linkId => rlinksStore.rlinkDirection(linkId))
      selectedArr.value.forEach(linkId => {
        if (rlinksStore.onewayIndex.has(linkId)) {
          selectedArr.value.push(linkId)
          editorForm.value.push(rlinksStore.reversedrLinksForm(linkId))
          linkDir.value.push(rlinksStore.rlinkDirection(linkId, true))
        }
      })
      break
    case 'Edit Road Group Info':
      const selectedSet = new Set(selectedArr.value)
      const features = rlinks.value.features.filter(link => selectedSet.has(link.properties.index))
      const disabled = ['index', 'length', 'time', 'a', 'b']
      editorForm.value = [getGroupForm(features, lineAttributes.value, disabled)]
      break

    case 'Edit rNode Info':
      const selectedNode = selectedArr.value[0]
      const nodesFeatures = rlinksStore.visiblerNodes.features.filter((node) => node.properties.index === selectedNode)
      const nodesDisabled = ['index', 'route_width']
      editorForm.value = [getGroupForm(nodesFeatures, rnodeAttributes.value, nodesDisabled)]

      break
      // map selected node doesnt not return properties with nanulln value.
      // we need to get the node in the store with the selected index.
  }
}

async function submitForm() {
  const resp = await Promise.all(formRef.value.map(f => f.validate()))
  if (resp.includes(false)) { return false }
  switch (action.value) {
    case 'Edit rLink Info':
      rlinksStore.editrLinkInfo({ selectedLinkId: selectedArr.value, info: editorForm.value })
    case 'Edit Road Group Info':
      rlinksStore.editrGroupInfo({ selectedLinkId: selectedArr.value, info: editorForm.value })
      break
    case 'Edit rNode Info':
      rlinksStore.editrNodeInfo({ selectedNodeId: selectedArr.value[0], info: editorForm.value })
      break
  }
  return true
}
function quit() {
  showDialog.value = false
  store.changeNotification(
    { text: $gettext('modification applied'), autoClose: true, color: 'success' })
}

function saveAndQuit() {
  submitForm()
  quit()
}

// add

async function addField (newFieldName) {
  if (newFieldName) {
    editorForm.value[newFieldName] = { disabled: false, placeholder: false, value: undefined }
    if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
      // linksStore.addLinksPropertie({ name: newFieldName })
    } else if (action.value === 'Edit Node Info') {
      // linksStore.addNodesPropertie({ name: newFieldName })
    }
  }
}

// delete

const showDeleteOption = ref(false)

function deleteField (field) {
  delete editorForm.value[field]
  if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
    // linksStore.deleteLinksPropertie({ name: field })
  } else if (action.value === 'Edit Node Info') {
    // linksStore.deleteNodesPropertie({ name: field })
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
    persistent
    :max-width="`${30*numLinks}rem`"
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
              :show-delete-option="showDeleteOption"
              :hints="hints"
              :units="units"
              :rules="rules"
              :attribute-non-deletable="attributeNonDeletable"
              :attributes-choices="attributesChoices"
              :types="typesMap"
              @delete-field="deleteField"
            />
            <NewFieldForm
              v-if="index===0"
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
