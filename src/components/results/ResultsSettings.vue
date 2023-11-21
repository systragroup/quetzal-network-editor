<script>
import chroma from 'chroma-js'
const $gettext = s => s

export default {
  name: 'ResultsSettings',
  model: {
    prop: 'show',
    event: 'update-show',
  },
  props: ['show', 'displaySettings', 'featureChoices'],
  events: ['update-show', 'submit', 'save-preset'],

  data () {
    return {
      parameters: [{
        name: $gettext('selectedFeature'),
        type: 'String',
        value: this.displaySettings.selectedFeature,
        units: '',
        hint: $gettext('selectedFeature'),
      },
      {
        name: $gettext('minWidth'),
        type: 'Number',
        value: this.displaySettings.minWidth,
        units: 'a.u.',
        hint: $gettext('minWidth'),
      },
      {
        name: $gettext('maxWidth'),
        type: 'Number',
        value: this.displaySettings.maxWidth,
        units: 'a.u.',
        hint: $gettext('maxWidth'),
      },
      {
        name: $gettext('numStep'),
        type: 'Number',
        value: this.displaySettings.numStep,
        units: 'int',
        hint: $gettext('numStep'),
      },
      {
        name: $gettext('opacity'),
        type: 'Number',
        value: this.displaySettings.opacity,
        units: 'number',
        hint: $gettext('opacity'),
      },
      {
        name: $gettext('scale'),
        type: 'String',
        value: this.displaySettings.scale,
        choices: ['linear', 'sqrt', 'log', 'exp', 'quad'],
        units: '',
        hint: $gettext('scale'),
      },
      {
        name: $gettext('color map'),
        type: 'String',
        choices: Object.keys(chroma.brewer).slice(0, 36),
        value: this.displaySettings.cmap,
        units: '',
        hint: $gettext('cmap to use'),
      },
      {
        name: $gettext('show NaN'),
        value: this.displaySettings.showNaN,
        hint: $gettext('Hide NaN on map and color map'),
      },
      {
        name: $gettext('reverse color'),
        value: this.displaySettings.reverseColor,
        hint: $gettext('reverse color scale'),
      },
      {
        name: $gettext('scale min'),
        type: 'Number',
        value: this.displaySettings.minVal,
        units: 'a.u.',
        hint: $gettext('mininum value on the color Map'),
      },
      {
        name: $gettext('scale max'),
        type: 'Number',
        value: this.displaySettings.maxVal,
        units: 'a.u.',
        hint: $gettext('maximum value on the color Map'),
      },
      {
        name: $gettext('custom scale'),
        value: this.displaySettings.fixScale,
        hint: $gettext('customize to inputs values'),
      },
      {
        name: $gettext('Left side driving'),
        value: this.displaySettings.offset,
        hint: $gettext('Select which side of the road the links are display'),
      },
      {
        name: $gettext('3D'),
        value: this.displaySettings.extrusion,
        hint: $gettext('display zones as 3D extrusion'),
      },
      {
        name: $gettext('padding'),
        type: 'Number',
        value: this.displaySettings.padding,
        units: 'number',
        hint: $gettext('range of colors'),
      },

      ],
      showHint: false,
      showFixScale: false,
      shake: false,

      rules: {
        required: v => !!v || $gettext('Required'),
        largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
        nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      },
      showDialog: false,
    }
  },
  computed: {
    windowHeight () { return this.$store.getters.windowHeight - 100 },
  },
  watch: {
    showDialog (val) {
      this.refresh()
      this.showFixScale = this.parameters[11].value
      this.$emit('update-show', val)
    },
    // when we change layer
    featureChoices () { this.refresh() },
  },
  created () {
    this.showDialog = this.show
  },

  methods: {
    toggleFixScale () {
      if (this.parameters[11].value) {
        this.showFixScale = true
        // refresh min max value when displayed
        this.parameters[9].value = this.displaySettings.minVal
        this.parameters[10].value = this.displaySettings.maxVal
      } else { this.showFixScale = false }
    },
    getColor (scale) {
      const arr = []
      const reversed = this.parameters[8].value
      let pad = this.parameters[14].value
      pad = [pad[0] / 100, 1 - pad[1] / 100]
      pad = reversed ? pad.reverse() : pad
      const colorScale = chroma.scale(scale).padding(pad)
        .domain([0, 100]).classes(25)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(i).hex())
      }
      return reversed ? arr.reverse() : arr
    },
    refresh () {
      this.parameters[0].value = this.displaySettings.selectedFeature
      this.parameters[1].value = this.displaySettings.minWidth
      this.parameters[2].value = this.displaySettings.maxWidth
      this.parameters[3].value = this.displaySettings.numStep
      this.parameters[4].value = this.displaySettings.opacity
      this.parameters[5].value = this.displaySettings.scale
      this.parameters[6].value = this.displaySettings.cmap
      this.parameters[7].value = this.displaySettings.showNaN
      this.parameters[8].value = this.displaySettings.reverseColor
      this.parameters[9].value = this.displaySettings.minVal
      this.parameters[10].value = this.displaySettings.maxVal
      this.parameters[11].value = this.displaySettings.fixScale
      this.parameters[12].value = this.displaySettings.offset
      this.parameters[13].value = this.displaySettings.extrusion
      this.parameters[14].value = this.displaySettings.padding
    },
    submit (method) {
      if (this.$refs.form.validate()) {
        const payload = {
          selectedFeature: this.parameters[0].value,
          minWidth: Number(this.parameters[1].value),
          maxWidth: Number(this.parameters[2].value),
          numStep: Number(this.parameters[3].value),
          opacity: Number(this.parameters[4].value),
          scale: this.parameters[5].value,
          cmap: this.parameters[6].value,
          showNaN: this.parameters[7].value,
          reverseColor: this.parameters[8].value,
          minVal: Number(this.parameters[9].value),
          maxVal: Number(this.parameters[10].value),
          fixScale: this.parameters[11].value,
          offset: this.parameters[12].value,
          extrusion: this.parameters[13].value,
          padding: this.parameters[14].value,
        }
        if (method === 'apply') {
          this.$emit('submit', payload)
        } else if (method === 'save') {
          this.$emit('save-preset', payload)
        }
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },
    cancel () {
      this.showDialog = false
    },
  },
}
</script>
<template>
  <v-menu
    v-model="showDialog"
    :close-on-content-click="false"
    persistent
    :origin="'top right'"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props }">
      <div class="setting">
        <v-btn
          size="small"
          :color="(displaySettings.selectedFeature === null)? 'error' : 'regular'"
          v-bind="props"
          icon="fa-solid fa-cog"
        />
      </div>
    </template>
    <v-card
      :width="'20rem'"
      class="setting-card"

      :max-height="windowHeight"
      @keydown.enter="submit('apply')"
      @keydown.esc="cancel"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Settings') }}
        <v-spacer />
        <v-btn
          icon
          size="small"
          @click="showHint = !showHint"
        >
          <v-icon>far fa-question-circle small</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form
          ref="form"
          lazy-validation
        >
          <v-container>
            <v-col>
              <v-select

                v-model="parameters[0].value"
                :items="featureChoices"
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
                  <div class="gradient">
                    <span
                      v-for="(color,key) in getColor(item)"
                      :key="key"
                      class="grad-step-small"
                      :style="{'backgroundColor':color}"
                    />
                    <span class="domain-title-small">{{ item }}</span>
                  </div>
                </template>
                <template v-slot:item="{item}">
                  <div class="gradient">
                    <span
                      v-for="(color,key) in getColor(item)"
                      :key="key"
                      class="grad-step"
                      :style="{'backgroundColor':color}"
                    />
                    <span class="domain-title">{{ item }}</span>
                  </div>
                </template>
              </v-select>

              <v-range-slider
                v-model="parameters[14].value"
                step="5"
                density="compact"
                :label="$gettext(parameters[14].name)"
                min="0"
                max="100"
                hide-details
                class="align-center"
              />
              <v-slider
                v-model="parameters[4].value"
                class="align-center"
                :label="$gettext(parameters[4].name)"
                track-color="secondary"
                :max="100"
                thumb-label
                :min="0"
                hide-details
              >
                <template v-slot:thumb-label="{ value }">
                  {{ value +'%' }}
                </template>
              </v-slider>
              <v-switch
                :key="parameters[12].name"
                v-model="parameters[12].value"
                density="compact"
                :label="$gettext(parameters[12].name)"
                :hint="showHint? $gettext(parameters[12].hint): ''"
                :persistent-hint="showHint"
              />
              <v-switch
                :key="parameters[7].name"
                v-model="parameters[7].value"
                density="compact"
                :label="$gettext(parameters[7].name)"
                :hint="showHint? $gettext(parameters[7].hint): ''"
                :persistent-hint="showHint"
              />
              <v-switch
                :key="parameters[8].name"
                v-model="parameters[8].value"
                density="compact"
                :label="$gettext(parameters[8].name)"
                :hint="showHint? $gettext(parameters[7].hint): ''"
                :persistent-hint="showHint"
              />
              <v-switch
                v-if="['Polygon','extrusion'].includes($store.getters['results/type'])"
                :key="parameters[13].name"
                v-model="parameters[13].value"
                density="compact"
                :label="$gettext(parameters[13].name)"
                :disabled="!['Polygon','extrusion'].includes($store.getters['results/type'])"
                :hint="showHint? $gettext(parameters[13].hint): ''"
                :persistent-hint="showHint"
              />
              <v-switch
                :key="parameters[11].name"
                v-model="parameters[11].value"
                density="compact"
                :label="$gettext(parameters[11].name)"
                :hint="showHint? $gettext(parameters[11].hint): ''"
                :persistent-hint="showHint"
                @click="toggleFixScale(parameters[11].name)"
              />
              <v-text-field
                v-for="item in parameters.slice(9,11)"
                v-show="showFixScale"
                :key="item.name"
                v-model="item.value"
                :type="item.type"

                :label="$gettext(item.name)"
                :suffix="item.units"
                :hint="showHint? $gettext(item.hint): ''"
                :persistent-hint="showHint"
                required
                @wheel="()=>{}"
              />
            </v-col>
          </v-container>
        </v-form>
      </v-card-text>
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
    padding-top:0rem;
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
  padding:1rem 1rem 0 1rem;

}

.setting {
  left: 98%;
  width: 0px;
  z-index: 2;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: 50px;
}
.setting-card {
overflow-y:auto;
}

</style>
