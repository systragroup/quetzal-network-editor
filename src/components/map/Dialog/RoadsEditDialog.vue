<script setup lang="ts">

import { useIndexStore } from '@src/store/index'
import { userLinksStore } from '@src/store/rlinks'
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import attributesHints from '@constants/hints.js'
import EditForm from '@src/components/common/EditForm.vue'
import NewFieldForm from '@src/components/common/NewFieldForm.vue'
import { useForm } from '@src/composables/UseForm'
import { getForm, getGroupForm } from '@src/utils/utils'
import { getDirection } from '@src/utils/spatial'
import { GroupForm } from '@src/types/components'
import { useGettext } from 'vue3-gettext'
import { LineStringFeatures } from '@src/types/geojson'
import { baseUnits, rlinksConstantProperties, rlinksDefaultProperties, rnodesDefaultProperties } from '@src/constants/properties'
import DialogHeader from './DialogHeader.vue'
import { AttributeTypes } from '@src/types/typesStore.ts'
import { cloneDeep } from 'lodash'
const { $gettext } = useGettext()

type Dict = Record<string, string>

const store = useIndexStore()
const rlinksStore = userLinksStore()
const { showDialog, action, selectedArr, changeLengthTimeSpeed } = useForm()

const rlinks = computed(() => rlinksStore.rlinks)
const lineAttributes = computed(() => rlinksStore.rlineAttributes)
const reversedAttributes = computed(() => rlinksStore.reversedAttributes)
const rnodeAttributes = computed(() => rlinksStore.rnodeAttributes)
const exclusionList = computed(() => Object.keys(editorForm.value[0]) || [])

// const editLinks = ref<boolean>(true) // if its links are nodes that are edited.
const editLinks = computed(() => action.value !== 'Edit rNode Info')

const attributesChoices = computed(() => rlinksStore.rlinksAttributesChoices)
const typesMap = computed(() => {
  if (editLinks.value) return Object.fromEntries(rlinksStore.linksDefaultAttributes.map(el => [el.name, el.type]))
  else return Object.fromEntries(rlinksStore.nodesDefaultAttributes.map(el => [el.name, el.type]))
})

const attributeNonDeletable = computed(() => {
  if (editLinks.value) return [...rlinksDefaultProperties.map(el => el.name), ...reversedAttributes.value]
  else return [...rnodesDefaultProperties.map(el => el.name)]
})

const displayUnits = computed(() => store.displayUnits)
const units = computed(() => baseUnits)

const rules = {}
const hints: Dict = attributesHints
const formRef = ref()

const editorForm = ref<GroupForm[]>([])
const numForm = computed(() => { return editorForm.value.length })

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

const linkDir = ref<number[]>([]) // to put 2 direction per form

function createForm() {
  let disabled: string[] = []
  let features: LineStringFeatures[] = []
  linkDir.value = []
  // when only one is selected. just do a normal link edition.
  if (selectedArr.value.length === 1 && action.value === 'Edit Road Group Info') {
    action.value = 'Edit rLink Info'
  }
  const selectedSet = new Set(selectedArr.value)
  switch (action.value) {
    case 'Edit rLink Info':
      features = rlinks.value.features.filter(link => selectedSet.has(link.properties.index))
      disabled = ['a', 'b', 'index', 'length']
      editorForm.value = []
      selectedArr.value.forEach(index => {
        const feature = features.filter(link => link.properties.index === index)[0]
        const form = getForm(feature, lineAttributes.value, disabled)
        linkDir.value.push(getDirection(feature.geometry.coordinates))
        if (feature.properties.oneway === '0') {
          const rform = getForm(feature, reversedAttributes.value, disabled)
          // group together both direction
          reversedAttributes.value.forEach(key => {
            rform[key].grouped = true
            form[key.slice(0, -2)].grouped = true
          })
          editorForm.value.push({ ...form, ...rform })
        } else {
          editorForm.value.push(form)
        }
      })
      break
    case 'Edit Road Group Info':
      features = rlinks.value.features.filter(link => selectedSet.has(link.properties.index))
      disabled = ['index', 'length', 'time', 'a', 'b']
      editorForm.value = [getGroupForm(features, lineAttributes.value, disabled)]
      break

    case 'Edit rNode Info':
      const selectedNode = selectedArr.value[0]
      const nodeFeatures = rlinksStore.rnodes.features.filter((node) => node.properties.index === selectedNode)
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
      rlinksStore.editLinkInfo({ selectedArr: selectedArr.value, infoArr: editorForm.value })
      break
    case 'Edit Road Group Info':
      rlinksStore.editGroupInfo({ selectedArr: selectedArr.value, infoArr: editorForm.value })
      break
    case 'Edit rNode Info':
      rlinksStore.editNodeInfo({ selectedArr: selectedArr.value, infoArr: editorForm.value })
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
    let toAdd = { disabled: false, placeholder: false, value: undefined, show: true, grouped: false }
    if ((form.oneway.value === '0') && !rlinksConstantProperties.includes(newFieldName)) {
      toAdd.grouped = true
      form[newFieldName + '_r'] = cloneDeep(toAdd)
    }
    form[newFieldName] = cloneDeep(toAdd)
  })
}

function addField (newFieldName: string, dtype: AttributeTypes) {
  if (newFieldName) {
    if (['Edit rLink Info', 'Edit Road Group Info'].includes(action.value)) {
      addFieldToLinksForms(newFieldName)
      rlinksStore.addLinksPropertie({ name: newFieldName, type: dtype })
    } else if (action.value === 'Edit rNode Info') {
      editorForm.value[0][newFieldName] = { disabled: false, placeholder: false, value: undefined, show: true }
      rlinksStore.addNodesPropertie({ name: newFieldName, type: dtype })
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
    rlinksStore.deleteLinksPropertie(field)
  } else if (action.value === 'Edit rNode Info') {
    rlinksStore.deleteNodesPropertie(field)
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
// computed speed, time, length. for individual links only.
function change (key: string, idx: number) {
  changeLengthTimeSpeed(key, editorForm.value[idx])
}

// variant and Attr prefix selector

const selectedVariant = computed({
  get: () => rlinksStore.variant,
  set: (val) => rlinksStore.variant = val,
})

const selectedPrefix = ref<string>('')

const variantChoices = computed(() => rlinksStore.variantChoice)

const prefixesChoice = computed(() => {
  let prefixes = []
  if (editLinks.value) {
    prefixes = rlinksStore.rlineAttributes.map(el => el.split('#')[0])
  } else {
    prefixes = rlinksStore.rnodeAttributes.map(el => el.split('#')[0])
  }
  return Array.from(new Set(prefixes))
})

watchEffect(() => {
  // set show true or false for selected variant
  editorForm.value.forEach(formData => {
    const keys = Object.keys(formData)
    let filteredKeys = keys
    if (selectedPrefix.value !== '') {
      filteredKeys = keys.filter(k => (k.split('#')[0] === selectedPrefix.value)
      || (k.split('#')[0] === selectedPrefix.value + '_r'))
    }
    const keysToKeep = new Set(filteredKeys.filter(k => k.includes(selectedVariant.value) || !k.includes('#')))
    keys.forEach(key => { formData[key].show = keysToKeep.has(key) })
  })
})

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    :max-width="`${40*numForm}rem`"
    @keydown.enter="saveAndQuit"
  >
    <v-card
      max-height="55rem"
    >
      <DialogHeader
        v-model:variant="selectedVariant"
        v-model:prefix="selectedPrefix"
        :title="action === 'Edit Road Group Info'?
          $gettext('Edit Properties of %{len} links',{len:String(selectedArr.length) }):
          $gettext('Edit Properties')"
        :variant-choices="variantChoices"
        :prefixes-choice="prefixesChoice"
      />
      <v-divider />
      <v-card-text class="container">
        <v-row>
          <v-col
            v-for="(n,idx) in numForm"
            :key="idx"
          >
            <div
              v-if="action == 'Edit rLink Info'"
              class="arrows-container"
            >
              <v-icon
                :style="{transform: 'rotate('+linkDir[idx]+'deg)'}"
              >
                fas fa-long-arrow-alt-up
              </v-icon>
              <span>{{ editorForm[idx].index.value }}</span>
              <v-icon
                :style="{transform: 'rotate('+(linkDir[idx]+180)+'deg)'}"
              >
                {{ editorForm[idx].oneway.value==='0'? 'fas fa-long-arrow-alt-up': '' }}
              </v-icon>
            </div>
            <EditForm
              ref="formRef"
              v-model:editor-form="editorForm[idx]"
              :show-hint="showHint"
              :show-delete-option="idx === 0 ? showDeleteOption:false"
              :hints="hints"
              :units="units"
              :display-units="displayUnits"
              :rules="rules"
              :attribute-non-deletable="attributeNonDeletable"
              :attributes-choices="attributesChoices"
              :types="typesMap"
              @change="(key:string)=>change(key,idx)"
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
.arrows-container{
  display: flex;
  padding: 0rem 1rem 1rem 1rem ;
  justify-content: space-between;
  align-items: center; /* optional, vertical alignment */
  font-size: large;
  }
</style>
