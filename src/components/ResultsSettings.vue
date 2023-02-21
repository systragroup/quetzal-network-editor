<script>
const $gettext = s => s

export default {
  name: 'ResultsSettings',
  props: ['selectedFeature', 'maxWidth', 'minWidth', 'numStep', 'scale'],
  events: ['submit'],

  data () {
    return {

      parameters: [{
        name: $gettext('selectedFeature'),
        type: 'String',
        value: this.selectedFeature,
        units: '',
        hint: $gettext('selectedFeature'),
      },
      {
        name: $gettext('maxWidth'),
        type: 'Number',
        value: this.maxWidth,
        units: 'cm?',
        hint: $gettext('maxWidth'),
      },
      {
        name: $gettext('minWidth'),
        type: 'Number',
        value: this.minWidth,
        units: 'cm?',
        hint: $gettext('minWidth'),
      },
      {
        name: $gettext('numStep'),
        type: 'Number',
        value: this.numStep,
        units: 'int',
        hint: $gettext('numStep'),
      },
      {
        name: $gettext('scale'),
        type: 'String',
        value: this.scale,
        units: '',
        hint: $gettext('scale'),
      },

      ],
      errorMessage: null,
      showHint: false,
      shake: false,

      rules: [
        v => !!v || $gettext('Required'),
        v => v >= 0 || $gettext('should be larger than 0'),
      ],
      showDialog: true,
    }
  },

  methods: {
    submit () {
      if (this.$refs.form.validate()) {
        const payload = {
          selectedFeature: this.parameters[0].value,
          maxWidth: this.parameters[1].value,
          minWidth: this.parameters[2].value,
          numStep: this.parameters[3].value,
          scale: this.parameters[4].value,
        }

        this.$emit('submit', payload)
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },
    cancel () { this.$emit('submit', false) },
  },
}
</script>
<template v-slot:append>
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
            <v-text-field
              v-for="(item,key) in parameters"
              :key="key"
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
</template>
<style lang="scss" scoped>

.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  padding:1rem

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
