<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { cloneDeep } from 'lodash'
import { useRunStore } from '@src/store/run'
import { useUserStore } from '@src/store/user'
import { useGettext } from 'vue3-gettext'
import { CategoryParam, SingleParam } from '@src/types/typesStore'

import ParamInput from './ParamInput.vue'
import MenuSelector from '../utils/MenuSelector.vue'
const { $gettext } = useGettext()
const runStore = useRunStore()
const userStore = useUserStore()
const modelIsLoaded = computed(() => userStore.model !== null)

const parameters = computed(() => runStore.filteredParameters)
const info = computed(() => runStore.selectedInfo)

function reset () {
  runStore.resetParameters()
}

// resizable div

import { useResize } from '@src/composables/useResize'
const { panelHeight: height, panelDiv: resizableDiv, startResize } = useResize(0, 50, 50)

onMounted(() => {
  if (resizableDiv.value) {
    const windowHeight = (window.innerHeight)
    const scrollHeight = resizableDiv.value.scrollHeight
    const ratio = scrollHeight / windowHeight
    // try to fit all content. if larger tha 25% of window, set to 25% of window
    height.value = ratio > 0.25 ? 0.25 * windowHeight : scrollHeight
  }
})

// panel. show 10 param on mounted
const panels = ref<number[]>([])
onMounted(() => {
  const max = 10
  const arr = parameters.value.map(el => el.params.length)
  const cumsum = arr.map((sum => value => sum += value)(0)).filter(sum => sum <= max)
  panels.value = cumsum.map((_, i) => i)
})

function expandAll () {
  if (panels.value.length < parameters.value.length) {
    panels.value = parameters.value.map((_, i) => i)
  } else {
    panels.value = []
  }
}

// Hints and edition

const showHint = ref(false)
const editHint = ref(false)
const hintRefs = ref<Record<string, HTMLTextAreaElement>>({})
// we have 2 v-for and some v-if. finding the correct ref in an array is impossible
// So we set it in a dict with the 2 key.
// Function to dynamically set the hint ref by ID
const setHintRef = (el: any, key: number, itemKey: number) => {
  if (el) {
    const stringKey = String(key) + String(itemKey)
    hintRefs.value[stringKey] = el
  }
}

function dblclick(key: number, itemKey: number) {
  editHint.value = true
  // on next tick (not mounted yet) put on focus.
  const stringKey = String(key) + String(itemKey)
  nextTick(() => hintRefs.value[stringKey].focus())
}

watch(showHint, (val) => {
  if (!val) { editHint.value = false }
})

//
// variant edition
//

const showEdit = ref(false)
const variants = computed(() => runStore.variants)

function getItemVariant(item: SingleParam) {
  return item.name.split('#')[1]
}

function isVariant(item: SingleParam) { return item.name.includes('#') }

type AvailableVariants = Record<string, Record<string, string[]>>
const availableVariants = computed(() => {
  // return a dict [cat,name] : variants[] of available variantes for each param
  const variantChoices = variants.value?.choices ? variants.value.choices : []
  const dict: AvailableVariants = {}
  parameters.value.map(el => el.category)
  parameters.value.forEach(el => {
    const names = el.params.map(p => p.name)
    const grouped = Object.groupBy(names, (str) => str.split('#')[0]) as Record<string, string[]>
    Object.keys(grouped).forEach(key => {
      const usedVariants = grouped[key].slice(1).map((str: string) => str.split('#')[1])
      grouped[key] = variantChoices.filter(v => !usedVariants.includes(v))
    })
    dict[el.category] = grouped
  })
  return dict
})

function getVariantsChoices(group: CategoryParam, item: SingleParam) {
  const cat = group.category
  const name = item.name.split('#')[0]
  // add the actual selected variant to the list
  return availableVariants.value[cat][name]
}

function changeItemVariant(variant: string, item: SingleParam) {
  item.name = item.name.split('#')[0] + `#${variant}`
  item.text = item.text.split('#')[0] + `#${variant}`
}

function addItem(group: CategoryParam, item: SingleParam) {
  const copy = cloneDeep(item)
  const cat = group.category
  const name = item.name
  const v = availableVariants.value[cat][name][0]
  if (v) { // else. all variants there
    copy.name = copy.name + `#${v}`
    copy.text = copy.text + `#${v}`
    const position = group.params.indexOf(item)
    group.params.splice(position + 1, 0, copy)
  }
}

function deleteItem(group: CategoryParam, item: SingleParam) {
  group.params = group.params.filter(el => el !== item)
}

</script>
<template>
  <v-card
    class="card"
  >
    <v-card-title class="subtitle">
      {{ $gettext('Scenario Settings') }}
    </v-card-title>
    <div
      v-show="info"
      ref="resizableDiv"
      class="info-div"
      :style="{ height: height + 'px' }"
    >
      {{ info }}
    </div>
    <div
      v-show="info"
      class="drag-handle"
      @mousedown="startResize"
    />
    <p v-if="parameters.length === 0">
      {{ $gettext('No parameters') }}
    </p>
    <div class="expansion">
      <v-form
        ref="form"
        validate-on="lazy"
      >
        <v-expansion-panels
          v-model="panels"
          multiple
        >
          <v-expansion-panel
            v-for="(group, key) in parameters"
            :key="key"
          >
            <v-expansion-panel-title class="categorie">
              {{ group.category }}
            </v-expansion-panel-title>
            <v-expansion-panel-text
              style="background-color:rgb(var(--v-theme-lightgrey));"
            >
              <div v-show="panels.includes(key)">
                <div
                  v-if="group.info"
                  class="categorie-info"
                >
                  {{ group.info }}
                </div>
                <li
                  v-for="(item, itemKey) in group.params"
                  :key="itemKey"
                  class="param-list"
                >
                  <ParamInput
                    :item="item"
                  >
                    <template
                      v-if="showEdit && variants"
                      v-slot:prepend
                    >
                      <MenuSelector
                        v-if="isVariant(item)"
                        :items="getVariantsChoices(group,item)"
                        size="small"
                        :model-value="getItemVariant(item)"
                        @update:model-value="(v)=>changeItemVariant(v, item)"
                      />
                      <v-btn
                        v-else
                        variant="tonal"
                        size="small"
                        :disabled="getVariantsChoices(group,item).length==0"
                        icon="fas fa-plus"
                        @click="addItem(group, item)"
                      />
                    </template>
                    <template
                      v-if="showEdit && isVariant(item)"
                      v-slot:append
                    >
                      <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        icon="fas fa-trash"
                        @click="deleteItem(group, item)"
                      />
                    </template>
                  </ParamInput>

                  <v-fade-transition>
                    <div
                      v-if="showHint"
                      class="custom-hint"
                    >
                      <div
                        v-if="!editHint"
                        @dblclick="dblclick(key, itemKey)"
                      >
                        {{ item.hint }}
                      </div>
                      <textarea
                        v-else
                        :ref="el => setHintRef(el, key, itemKey)"
                        v-model="item.hint"
                        rows="1"
                        class="edition"
                        @keydown.enter="editHint=false"
                      />
                    </div>
                  </v-fade-transition>
                </li>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </div>
    <v-card-actions>
      <v-btn
        v-show="modelIsLoaded"
        variant="text"
        @click="reset"
      >
        {{ $gettext("back to default") }}
      </v-btn>

      <v-spacer />
      <v-btn
        v-if="variants"
        prepend-icon="fas fa-plus"
        variant="text"
        :active="showEdit"
        @click="showEdit = !showEdit"
      >
        {{ $gettext("Manage") }}
      </v-btn>
      <v-btn
        variant="text"
        @click="expandAll"
      >
        {{ panels.length != parameters.length ? $gettext("Expand all") : $gettext("Collapse all") }}
      </v-btn>
      <v-btn
        icon="far fa-question-circle"
        size="small"
        :active="showHint"
        @click="showHint = !showHint"
      />
    </v-card-actions>
  </v-card>
</template>
<style lang="scss" scoped>
// card style come from parent component.
.card {
  height: 100%;
  overflow-y: hidden;
  background-color: rgb(var(--v-theme-lightergrey));
}
.expansion{
  max-height:100%;
  overflow:hidden auto;
  flex-grow: 1;
  height:20rem;
}
.info-div{
  white-space: pre-line;
  overflow-y: auto;
  padding: 1rem;
  margin-bottom:0

}
.drag-handle {
  height: 5px;
  background-color: rgb(var(--v-theme-lightgrey));
  margin: 2px;
  cursor: row-resize;
}
.subtitle {
  font-size: 2em;
  font-weight: bold;
}
.v-form {
  max-height: 80%;
}
.categorie {
  font-size: 1.5em;
  font-weight: bold;
  background: rgb(var(--v-theme-mediumgrey)) ;
}
.categorie-info{
  padding-bottom: 1rem;
  white-space: pre-line;
  font-size: small;
}
.param-list{
  margin-bottom:1.2rem;
}
.custom-hint{
  margin-left: 0.2rem;
  width:100%;
  min-height: 1.5rem;
  font-size:small;
  margin-right: auto;
}
.edition{
  border:1px gray solid;
  width:100%;
}

@media (width <= 768px) {
  .categorie {
    font-size: 1em;
  }
}
</style>
