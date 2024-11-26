<script setup>
import chroma from 'chroma-js'
import { ref, watch, toRefs, computed } from 'vue'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const props = defineProps(['displaySettings', 'featureChoices', 'type'])
const emits = defineEmits(['submit', 'save-preset'])
const { displaySettings, featureChoices, type } = toRefs(props)

const colorsMaps = computed(() => {
  const first = ['OrRd', 'Spectral', 'RdYlGn', 'Viridis', 'YlGn', 'RdYlBu']
  const others = Object.keys(chroma.brewer).slice(0, 36).filter(el => !first.includes(el))
  return [...first, ...others]
})

const showDialog = ref(false)
const parameters = ref([{
  name: $gettext('selectedFeature'),
  type: 'String',
  value: displaySettings.value.selectedFeature,
  units: '',
  hint: $gettext('selectedFeature'),
},
{
  name: $gettext('minWidth'),
  type: 'Number',
  value: displaySettings.value.minWidth,
  units: 'a.u.',
  hint: $gettext('minWidth'),
},
{
  name: $gettext('maxWidth'),
  type: 'Number',
  value: displaySettings.value.maxWidth,
  units: 'a.u.',
  hint: $gettext('maxWidth'),
},
{
  name: $gettext('numStep'),
  type: 'Number',
  value: displaySettings.value.numStep,
  units: 'int',
  hint: $gettext('numStep'),
},
{
  name: $gettext('opacity'),
  type: 'Number',
  value: displaySettings.value.opacity,
  units: 'number',
  hint: $gettext('opacity'),
},
{
  name: $gettext('scale'),
  type: 'String',
  value: displaySettings.value.scale,
  choices: ['linear', 'sqrt', 'log', 'exp', 'quad'],
  units: '',
  hint: $gettext('scale'),
},
{
  name: $gettext('color map'),
  type: 'String',
  choices: colorsMaps,
  value: displaySettings.value.cmap,
  units: '',
  hint: $gettext('cmap to use'),
},
{
  name: $gettext('show NaN'),
  value: displaySettings.value.showNaN,
  hint: $gettext('Hide NaN on map and color map'),
},
{
  name: $gettext('reverse color'),
  value: displaySettings.value.reverseColor,
  hint: $gettext('reverse color scale'),
},
{
  name: $gettext('scale min'),
  type: 'Number',
  value: displaySettings.value.minVal,
  units: 'a.u.',
  hint: $gettext('mininum value on the color Map'),
},
{
  name: $gettext('scale max'),
  type: 'Number',
  value: displaySettings.value.maxVal,
  units: 'a.u.',
  hint: $gettext('maximum value on the color Map'),
},
{
  name: $gettext('custom scale'),
  value: displaySettings.value.fixScale,
  hint: $gettext('customize to inputs values'),
},
{
  name: $gettext('Left side driving'),
  value: displaySettings.value.offset,
  hint: $gettext('Select which side of the road the links are display'),
},
{
  name: $gettext('3D'),
  value: displaySettings.value.extrusion,
  hint: $gettext('display zones as 3D extrusion'),
},
{
  name: $gettext('padding'),
  type: 'Number',
  value: displaySettings.value.padding,
  units: 'number',
  hint: $gettext('range of colors'),
},
{
  name: $gettext('labels'),
  type: 'String',
  value: displaySettings.value.labels,
  hint: $gettext('show labels'),
},
])
const showHint = ref(false)
const showFixScale = ref(false)
const shake = ref(false)

watch(showDialog, () => {
  refresh()
  showFixScale.value = parameters.value[11].value
})
// when we change layer
watch(featureChoices, () => refresh())

function toggleFixScale () {
  if (parameters.value[11].value) {
    showFixScale.value = true
    // refresh min max value when displayed
    parameters.value[9].value = displaySettings.value.minVal
    parameters.value[10].value = displaySettings.value.maxVal
  } else { showFixScale.value = false }
}

function getColor (scale) {
  const arr = []
  const reversed = parameters.value[8].value
  let pad = parameters.value[14].value
  pad = [pad[0] / 100, 1 - pad[1] / 100]
  pad = reversed ? pad.reverse() : pad
  const colorScale = chroma.scale(scale).padding(pad)
    .domain([0, 100]).classes(25)
  for (let i = 0; i < 100; i++) {
    arr.push(colorScale(i).hex())
  }
  return reversed ? arr.reverse() : arr
}

function refresh () {
  parameters.value[0].value = displaySettings.value.selectedFeature
  parameters.value[1].value = displaySettings.value.minWidth
  parameters.value[2].value = displaySettings.value.maxWidth
  parameters.value[3].value = displaySettings.value.numStep
  parameters.value[4].value = displaySettings.value.opacity
  parameters.value[5].value = displaySettings.value.scale
  parameters.value[6].value = displaySettings.value.cmap
  parameters.value[7].value = displaySettings.value.showNaN
  parameters.value[8].value = displaySettings.value.reverseColor
  parameters.value[9].value = displaySettings.value.minVal
  parameters.value[10].value = displaySettings.value.maxVal
  parameters.value[11].value = displaySettings.value.fixScale
  parameters.value[12].value = displaySettings.value.offset
  parameters.value[13].value = displaySettings.value.extrusion
  parameters.value[14].value = displaySettings.value.padding
  parameters.value[15].value = displaySettings.value.labels
}
function submit (method) {
  if (true) {
    const payload = {
      selectedFeature: parameters.value[0].value,
      minWidth: Number(parameters.value[1].value),
      maxWidth: Number(parameters.value[2].value),
      numStep: Number(parameters.value[3].value),
      opacity: Number(parameters.value[4].value),
      scale: parameters.value[5].value,
      cmap: parameters.value[6].value,
      showNaN: parameters.value[7].value,
      reverseColor: parameters.value[8].value,
      minVal: Number(parameters.value[9].value),
      maxVal: Number(parameters.value[10].value),
      fixScale: parameters.value[11].value,
      offset: parameters.value[12].value,
      extrusion: parameters.value[13].value,
      padding: parameters.value[14].value,
      labels: parameters.value[15].value,
    }
    if (method === 'apply') {
      emits('submit', payload)
    } else if (method === 'save') {
      emits('save-preset', payload)
    }
  } else {
    shake.value = true
    setTimeout(() => {
      shake.value = false
    }, 500)
  }
}

function cancel () {
  showDialog.value = false
}

</script>
<template>
  <v-menu
    v-model="showDialog"
    :close-on-content-click="false"
    persistent
    no-click-animation
    location="bottom end"
    offset="5"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props:mp }">
      <div class="setting">
        <v-btn
          :color="(displaySettings.selectedFeature === null)? 'error' : 'regular'"
          v-bind="mp"
          icon="fa-solid fa-cog"
        />
      </div>
    </template>
    <v-card
      width="20rem"
      class="setting-card"
      :max-height="'calc(100vh - 100px)'"
      @keydown.enter="submit('apply')"
      @keydown.esc="cancel"
    >
      <v-list-item class="subtitle">
        {{ $gettext('Settings') }}
        <template v-slot:append>
          <v-btn
            variant="text"
            icon="far fa-question-circle small"
            size="small"
            @click="showHint = !showHint"
          />
        </template>
      </v-list-item>

      <v-form
        ref="form"
        lazy-validation
      >
        <v-col>
          <v-select
            v-model="parameters[0].value"
            variant="underlined"
            :items="featureChoices.sort()"
            :label="$gettext(parameters[0].name)"
            :hint="showHint? $gettext(parameters[0].hint): ''"
            :persistent-hint="showHint"
            required
          />
          <v-row>
            <v-col
              v-for="item in parameters.slice(1,3)"
              :key="item.name"
            >
              <v-text-field
                v-model="item.value"
                variant="underlined"
                density="compact"
                :type="item.type"
                :label="$gettext(item.name)"
                :suffix="item.units"
                :hint="showHint? $gettext(item.hint): ''"
                :persistent-hint="showHint"
                required
                @wheel="()=>{}"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-text-field
                v-model="parameters[3].value"
                variant="underlined"
                density="compact"
                :type="parameters[3].type"
                :label="$gettext(parameters[3].name)"
                :suffix="parameters[3].units"
                :hint="showHint? $gettext(parameters[3].hint): ''"
                :persistent-hint="showHint"
                required
                @wheel="()=>{}"
              />
            </v-col>
            <v-col>
              <v-select
                v-model="parameters[5].value"
                density="compact"
                variant="underlined"
                :items="parameters[5].choices"
                :label="$gettext(parameters[5].name)"
                :hint="showHint? $gettext(parameters[5].hint): ''"
                :persistent-hint="showHint"
                required
              />
            </v-col>
          </v-row>

          <v-select
            v-model="parameters[6].value"
            density="compact"
            :items="parameters[6].choices"
            :label="$gettext(parameters[6].name)"
            :hint="showHint? $gettext(parameters[6].hint): ''"
            :persistent-hint="showHint"
            required
            variant="solo"
          >
            <template
              v-slot:selection="{item}"
            >
              <div class="gradient-preview">
                <span
                  v-for="(color,key) in getColor(item.value)"
                  :key="key"
                  class="grad-step-small"
                  :style="{'backgroundColor':color}"
                />
                <span class="preview-title">{{ item.value }}</span>
              </div>
            </template>
            <template v-slot:item="{props:tProps,item}">
              <v-list-item v-bind="tProps">
                <template v-slot:title>
                  <div class="gradient">
                    <span
                      v-for="(color,key) in getColor(item.value)"
                      :key="key"
                      class="grad-step"
                      :style="{'backgroundColor':color}"
                    />
                    <span class="domain-title">{{ item.value }}</span>
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-range-slider
            v-model="parameters[14].value"
            step="5"
            density="compact"
            color="primary"
            :label="$gettext(parameters[14].name)"
            min="0"
            max="100"
            :thumb-size="16"
            hide-details
            class="align-center"
          />
          <v-slider
            v-model="parameters[4].value"
            class="align-center"
            color="primary"
            :label="$gettext(parameters[4].name)"
            track-color="secondary"
            :max="100"
            :thumb-size="16"
            thumb-label
            :min="0"
            hide-details
          >
            <template v-slot:thumb-label="{ modelValue }">
              {{ Math.floor(modelValue) +'%' }}
            </template>
          </v-slider>
          <v-select
            v-model="parameters[15].value"
            variant="underlined"
            :items="[null, ...featureChoices.sort()]"
            :label="$gettext(parameters[15].name)"
            :hint="showHint? $gettext(parameters[15].hint): ''"
            :persistent-hint="showHint"
            required
          />
          <v-switch
            :key="parameters[12].name"
            v-model="parameters[12].value"
            density="compact"
            color="primary"
            :hide-details="!showHint"
            :label="$gettext(parameters[12].name)"
            :hint="showHint? $gettext(parameters[12].hint): ''"
            :persistent-hint="showHint"
          />
          <v-switch
            :key="parameters[7].name"
            v-model="parameters[7].value"
            density="compact"
            color="primary"
            :hide-details="!showHint"
            :label="$gettext(parameters[7].name)"
            :hint="showHint? $gettext(parameters[7].hint): ''"
            :persistent-hint="showHint"
          />
          <v-switch
            :key="parameters[8].name"
            v-model="parameters[8].value"
            density="compact"
            color="primary"
            :hide-details="!showHint"
            :label="$gettext(parameters[8].name)"
            :hint="showHint? $gettext(parameters[7].hint): ''"
            :persistent-hint="showHint"
          />
          <v-switch
            v-if="['Polygon','extrusion'].includes(type)"
            :key="parameters[13].name"
            v-model="parameters[13].value"
            density="compact"
            color="primary"
            :hide-details="!showHint"
            :label="$gettext(parameters[13].name)"
            :disabled="!['Polygon','extrusion'].includes(type)"
            :hint="showHint? $gettext(parameters[13].hint): ''"
            :persistent-hint="showHint"
          />
          <v-switch
            :key="parameters[11].name"
            v-model="parameters[11].value"
            density="compact"
            variant="underlined"
            color="primary"
            :hide-details="!showHint"
            :label="$gettext(parameters[11].name)"
            :hint="showHint? $gettext(parameters[11].hint): ''"
            :persistent-hint="showHint"
            @update:modelValue="toggleFixScale(parameters[11].name)"
          />
          <v-row>
            <v-col
              v-for="item in parameters.slice(9,11)"
              :key="item.name"
            >
              <v-text-field
                v-show="showFixScale"
                v-model="item.value"
                variant="underlined"
                :type="item.type"
                :label="$gettext(item.name)"
                :suffix="item.units"
                :hint="showHint? $gettext(item.hint): ''"
                :persistent-hint="showHint"
                required
              />
            </v-col>
          </v-row>
        </v-col>
      </v-form>
      <v-card-actions>
        <v-btn
          color="grey"
          variant="text"
          @click="cancel"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="green-darken-1"
          variant="text"
          @click="submit('apply')"
        >
          {{ $gettext("Apply") }}
        </v-btn>

        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="submit('save')"
        >
          <v-icon
            size="small"
            start
          >
            fas fa-sliders-h
          </v-icon>
          {{ $gettext("save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.gradient-preview {
  width: 8rem;
  white-space: nowrap;
  display: inline-block;
  padding-top: 10px;
  padding-bottom: 10px;
}
.preview-title {
  padding-left: 0.5rem;
}
.gradient {
    width: 60%;
    white-space: nowrap;
    position: relative;
    display: inline-block;
    padding-top: 10px;
    padding-bottom: 10px;
}
.gradient .domain-title {
    position: absolute;
    padding-left:0.5rem;
    padding-top:0.5rem;
    text-align: center;
    font-size: 16px;
}
.gradient .domain-title-small {
    position: absolute;
    padding-left:0.5rem;
    padding-top:0;
    text-align: center;
    font-size: 16px;
}
.grad-step {
    display: inline-block;
    height: 40px;
    width: 1%;
}
.grad-step-small{
    display: inline-block;
    height: 20px;
    width: 1%;
}
.subtitle {
  font-size: 2em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding: 0.5rem 1rem 0;
}
.setting {
  left: 96%;
  z-index: 2;
  top:1rem;
  position: absolute;
  align-items: center;
  justify-content: center;
}
.setting-card {
overflow-y:auto;
padding:0.5rem;
}

</style>
