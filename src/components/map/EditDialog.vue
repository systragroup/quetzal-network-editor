<!-- eslint-disable no-case-declarations -->
<script setup>
import ColorPicker from '@comp/utils/ColorPicker.vue'
import MenuSelector from '@comp/utils/MenuSelector.vue'
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'
import { useODStore } from '@src/store/od'
import { computed, ref, watch, defineModel, toRefs } from 'vue'
import { cloneDeep } from 'lodash'
import attributesHints from '@constants/hints.js'
import attributesUnits from '@constants/units.js'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const showDialog = defineModel('showDialog')
const editorForm = defineModel('editorForm')
const props = defineProps(['mode', 'action', 'linkDir'])

const { mode, action } = toRefs(props)
const emit = defineEmits(['applyAction', 'cancelAction'])

const store = useIndexStore()
const linksStore = useLinksStore()
const rlinksStore = userLinksStore()
const ODStore = useODStore()

watch(showDialog, (val) => {
  // do not show a notification when dialog is on. sometime its over the confirm button
  if (val) { store.changeNotification({ text: '', autoClose: true }) }
  showHint.value = false
  showDeleteOption.value = false
})

const numLinks = computed(() => { return Array.isArray(editorForm.value) ? editorForm.value.length : 1 })

function orderedForm (index) {
  // order editor Form in alphatical order
  let form = editorForm.value
  // if we have tab. there is a list of form
  if (form.length >= 1) {
    form = form[index]
  }
  // order keys in alphabetical order, and with disabled last
  const keys = Object.keys(form).filter(key => !form[key].disabled).sort()
  keys.push(...Object.keys(form).filter(key => form[key].disabled).sort())
  const ordered = keys.reduce(
    (obj, key) => {
      obj[key] = form[key]
      return obj
    },
    {},
  )
  return ordered
}

// computed speed, time, length. for individual links only.
function change (key) {
  // for now. only for PT
  if (mode.value === 'pt') {
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
}

const showDeleteOption = ref(false)

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

const attributesChoices = computed(() => {
  if (['pt', 'road'].includes(mode.value)) {
    return store.attributesChoices[mode.value]
  } else { return {} }
})

function attributeNonDeletable (field) {
  if (mode.value === 'pt') {
    return linksStore.defaultAttributesNames.includes(field)
  } else {
    return rlinksStore.rundeletable.includes(field)
  }
}

const showHint = ref(false)
const hints = attributesHints
const units = attributesUnits
const rules = ({
  newField: [
    val => !Object.keys(editorForm.value).includes(val) || $gettext('field already exist'),
    val => val !== '' || $gettext('cannot add empty field'),
    val => !val?.endsWith('_r') || $gettext('field cannot end with _r'),
  ],
})

const newFieldName = ref(null)

function addField () {
  let form = {}
  if (Array.isArray(editorForm.value)) {
    form = cloneDeep(editorForm.value[0])
  } else {
    form = cloneDeep(editorForm.value)
  }
  // do not append if its null, empty or already exist.

  if ((Object.keys(form).includes(newFieldName.value)) || (newFieldName.value === '')
    | (!newFieldName.value) || (newFieldName.value?.endsWith('_r'))) {
    // put ' ' so the rule error is diplayed.
    newFieldName.value = ''
  } else {
    // need to rewrite editorForm object to be updated in DOM
    if (Array.isArray(editorForm.value)) {
      const tempArr = cloneDeep(editorForm.value)
      tempArr.forEach(el => {
        // if its a reverse link. only add it to the form if its not an excluded one
        // (ex: route_width, no route_width_r)
        if (Object.keys(el)[0].endsWith('_r')) {
          if (!rlinksStore.rcstAttributes.includes(newFieldName.value)) {
            el[newFieldName.value + '_r'] = { disabled: false, placeholder: false, value: undefined }
          }
        } else { // normal link. add the new field to the list.
          el[newFieldName.value] = { disabled: false, placeholder: false, value: undefined }
        }
      })
      editorForm.value = null
      editorForm.value = tempArr
    } else {
      form[newFieldName.value] = { disabled: false, placeholder: false, value: undefined }
      editorForm.value = {}
      editorForm.value = form
    }

    if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
      linksStore.addPropertie({ name: newFieldName.value, table: 'links' })
    } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(action.value)) {
      rlinksStore.addRoadPropertie({ name: newFieldName.value, table: 'rlinks' })
    } else if (action.value === 'Edit Node Info') {
      linksStore.addPropertie({ name: newFieldName.value, table: 'nodes' })
    } else if (action.value === 'Edit rNode Info') {
      rlinksStore.addRoadPropertie({ name: newFieldName.value, table: 'rnodes' })
    } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(action.value)) {
      ODStore.addPropertie(newFieldName.value)
    }
    newFieldName.value = null // null so there is no rules error.
    store.changeNotification({ text: $gettext('Field added'), autoClose: true, color: 'success' })
  }
}
function deleteField (field) {
  let form = cloneDeep(editorForm.value)
  // if roadLinks.
  if (Array.isArray(editorForm.value)) {
    // if we delete a reverse attribute, change it to normal as _r are deleted with normal one
    if (field.endsWith('_r')) {
      field = field.substr(0, field.length - 2)
    }
    form = form.filter(el => delete el[field])
    form = form.filter(el => delete el[field + '_r'])
    // TC links
  } else {
    delete form[field]
  }
  editorForm.value = {}
  editorForm.value = form

  if (['Edit Line Info', 'Edit Link Info', 'Edit Group Info'].includes(action.value)) {
    linksStore.deletePropertie({ name: field, table: 'links' })
  } else if (['Edit rLink Info', 'Edit Road Group Info', 'Edit Visible Road Info'].includes(action.value)) {
    rlinksStore.deleteRoadPropertie({ name: field, table: 'rlinks' })
  } else if (action.value === 'Edit Node Info') {
    linksStore.deletePropertie({ name: field, table: 'nodes' })
  } else if (action.value === 'Edit rNode Info') {
    rlinksStore.deleteRoadPropertie({ name: field, table: 'rnodes' })
  } else if (['Edit OD Group Info', 'Edit Visible OD Info'].includes(action.value)) {
    ODStore.deletePropertie({ name: field })
  }
  store.changeNotification({ text: $gettext('Field deleted'), autoClose: true, color: 'success' })
}

async function submitForm() {
  // just for editLine info:  check if trip exist
  if ((action.value == 'Edit Line Info')
    && (editorForm.value.trip_id.value !== linksStore.editorTrip)
    && linksStore.tripId.includes(editorForm.value.trip_id.value)) {
    // reset all. just like abortChanges but without the abort changes notification
    store.changeNotification({
      text: $gettext('Cannot apply modification. Trip_id already exist'),
      autoClose: true,
      color: 'red darken-2',
    })
  } else {
    emit('applyAction')
  }
}

</script>
<template>
  <v-dialog
    v-model="showDialog"
    scrollable
    persistent
    :max-width="numLinks > 1 ? '40rem': '30rem'"
  >
    <v-form
      ref="form"
      @submit.prevent="submitForm"
    >
      <v-card
        max-height="55rem"
      >
        <v-card-title class="text-h5">
          {{ $gettext("Edit Properties") }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row>
            <v-col
              v-for="(n,idx) in numLinks"
              :key="idx"
            >
              <v-list>
                <v-list-item v-if="numLinks > 1">
                  <v-icon
                    :style="{'align-items':'center',
                             'justify-content': 'center',
                             transform: 'rotate('+linkDir[idx]+'deg)'}"
                  >
                    fas fa-long-arrow-alt-up
                  </v-icon>
                </v-list-item>
                <v-text-field
                  v-for="(value, key) in orderedForm(idx)"
                  :key="key"
                  v-model="value['value']"
                  :label="key"
                  :hint="showHint? hints[key]: ''"
                  :persistent-hint="showHint"
                  :variant="value['disabled']? 'underlined': 'filled'"
                  :type="linksStore.attributeType(key)"
                  :placeholder="value['placeholder']? $gettext('multiple Values'):''"
                  :persistent-placeholder=" value['placeholder']? true:false "
                  :disabled="value['disabled']"
                  :suffix="units[key]"
                  :prepend-inner-icon="['length','speed','time'].includes(key) && mode === 'pt' ? 'fas fa-calculator':''"
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
            </v-col>
          </v-row>
          <v-row>
            <v-text-field
              v-model="newFieldName"
              :label=" $gettext('add field')"
              :placeholder="$gettext('new field name')"
              variant="filled"
              :rules="rules.newField"
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
            @click="emit('cancelAction')"
          >
            {{ $gettext("Cancel") }}
          </v-btn>

          <v-btn
            color="success"
            variant="text"
            type="submit"
          >
            {{ $gettext("Save") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
<style lang="scss" scoped>

</style>
