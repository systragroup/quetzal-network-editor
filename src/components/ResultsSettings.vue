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
  events: ['update-show', 'submit'],

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
        name: $gettext('maxWidth'),
        type: 'Number',
        value: this.displaySettings.maxWidth,
        units: 'a.u.',
        hint: $gettext('maxWidth'),
      },
      {
        name: $gettext('minWidth'),
        type: 'Number',
        value: this.displaySettings.minWidth,
        units: 'a.u.',
        hint: $gettext('minWidth'),
      },
      {
        name: $gettext('numStep'),
        type: 'Number',
        value: this.displaySettings.numStep,
        units: 'int',
        hint: $gettext('numStep'),
      },
      {
        name: $gettext('scale'),
        type: 'String',
        value: this.displaySettings.scale,
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

      ],
      errorMessage: null,
      showHint: false,
      shake: false,

      rules: [
        v => !!v || $gettext('Required'),
        v => v >= 0 || $gettext('should be larger than 0'),
      ],
      showDialog: false,
    }
  },
  watch: {
    showDialog (val) {
      this.$emit('update-show', val)
    },
  },
  created () {
    this.showDialog = this.show
  },

  methods: {
    getColor (scale) {
      const arr = []
      const colorScale = chroma.scale(scale).padding([0.2, 0])
        .domain([0, 100]).classes(25)
      for (let i = 0; i < 100; i++) {
        arr.push(colorScale(i).hex())
      }
      return arr
    },
    reset () {
      this.parameters[0].value = this.displaySettings.selectedFeature
      this.parameters[1].value = this.displaySettings.maxWidth
      this.parameters[2].value = this.displaySettings.minWidth
      this.parameters[3].value = this.displaySettings.numStep
      this.parameters[4].value = this.displaySettings.scale
      this.parameters[5].value = this.displaySettings.cmap
    },
    submit () {
      if (this.$refs.form.validate()) {
        this.$emit('submit', {
          selectedFeature: this.parameters[0].value,
          maxWidth: Number(this.parameters[1].value),
          minWidth: Number(this.parameters[2].value),
          numStep: Number(this.parameters[3].value),
          scale: this.parameters[4].value,
          cmap: this.parameters[5].value,
        })
        this.showDialog = false
        this.reset()
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },
    cancel () {
      this.showDialog = false
      this.reset()
    },
  },
}
</script>
<template>
  <v-menu
    v-model="showDialog"
    :close-on-content-click="false"
    :close-on-click="false"
    :origin="'top right'"
    transition="scale-transition"
    :position-y="30"
    :nudge-width="200"
    offset-x
    offset-y
  >
    <template v-slot:activator="{ on, attrs }">
      <div class="setting">
        <v-btn
          fab
          small
          v-bind="attrs"
          v-on="on"
        >
          <v-icon
            color="regular"
          >
            fa-solid fa-cog
          </v-icon>
        </v-btn>
      </div>
    </template>
    <v-card
      :class="{'shake':shake}"
      @keydown.enter="submit"
      @keydown.esc="cancel"
    >
      <v-card-title class="subtitle">
        {{ $gettext('Settings') }}
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
              <v-text-field
                v-for="(item,key) in parameters.slice(1,-1)"
                :key="key"
                v-model="item.value"
                :type="item.type"
                :disabled="item.name==='scale'"
                :label="$gettext(item.name)"
                :suffix="item.units"
                :hint="showHint? $gettext(item.hint): ''"
                :persistent-hint="showHint"
                required
                @wheel="()=>{}"
              />
              <v-select
                v-model="parameters[5].value"
                :items="parameters[5].choices"
                :label="$gettext(parameters[5].name)"
                :hint="showHint? $gettext(parameters[5].hint): ''"
                :persistent-hint="showHint"
                required
              >
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
            </v-col>
          </v-container>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="grey"
          text
          @click="cancel"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="green darken-1"
          text
          @click="submit"
        >
          {{ $gettext("Save") }}
        </v-btn>

        <v-spacer />
        <v-btn
          icon
          small
          @click="showHint = !showHint"
        >
          <v-icon>far fa-question-circle small</v-icon>
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

.grad-step {
    display: inline-block;
    height: 40px;
    width: 1%;
}

.subtitle {
  font-size: 2em;
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem

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
.shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  transform: translate3d(0, 0, 0);
}
@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }
  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}
</style>
