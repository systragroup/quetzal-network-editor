<script>
const $gettext = s => s

export default {
  name: 'Settings',
  data () {
    return {

      speed: {
        name: $gettext('speed'),
        type: 'Number',
        value: this.$store.getters.speed,
        units: 'km/h',
        hint: $gettext('Speed used to calculate travel time when a link is drawn, extend or a node is moved'),
      },
      popupContent: {
        name: $gettext('Popup Content'),
        type: 'String',
        choices: this.$store.getters.lineAttributes,
        value: this.$store.getters.popupContent,
        hint: $gettext('Link field to display when hovering a trip on the map'),
      },
      outputName: {
        name: $gettext('Export name'),
        type: 'String',
        value: this.$store.getters.outputName,
        units: '.zip',
        hint: $gettext('the name of the exported zip file'),
      },
      errorMessage: null,
      showHint: false,
      shake: false,

      rules: [
        v => !!v || $gettext('Required'),
        v => v >= 0 || $gettext('should be larger than 0'),
      ],
      zipRules: [v => v.slice(-4) !== '.zip' || $gettext('do not add .zip to the end')],
    }
  },

  computed: {

  },

  mounted () {
    this.$store.commit('changeNotification', '')
  },
  methods: {
    submit () {
      if (this.$refs.form.validate()) {
        const payload = {
          speed: this.speed.value,
          popupContent: this.popupContent.value,
          outputName: this.outputName.value,
        }
        this.$store.commit('applySettings', payload)
        this.$router.push('/Home').catch(() => {})
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },
    cancel () { this.$router.push('/Home').catch(() => {}) },
  },
}
</script>
<template>
  <section>
    <div class="layout">
      <div class="layout-overlay" />
      <v-card
        class="card"
        :class="{'shake':shake}"
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
                  v-model="speed.value"
                  :type="speed.type"
                  :label="$gettext(speed.name)"
                  :suffix="speed.units"
                  :hint="showHint? $gettext(speed.hint): ''"
                  :persistent-hint="showHint"
                  :rules="rules"
                  required
                  @wheel="()=>{}"
                />
                <v-select
                  v-model="popupContent.value"
                  :items="popupContent.choices"
                  :label="$gettext(popupContent.name)"
                  :hint="showHint? $gettext(popupContent.hint): ''"
                  :persistent-hint="showHint"
                  required
                />
                <v-text-field
                  v-model="outputName.value"
                  :type="outputName.type"
                  :label="$gettext(outputName.name)"
                  :suffix="outputName.units"
                  :hint="showHint? $gettext(outputName.hint): ''"
                  :persistent-hint="showHint"
                  :rules="zipRules"
                  required
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
    </div>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width: calc(100%);
  height: calc(100% - 50px);
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  position: absolute;
}
.card {
  width: 500px;
  max-height: calc(100% - 2em);
  overflow-y: auto;
  padding: 40px;
}
.title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 3.5em;
  color: $primary !important;
  font-weight: bold;
}
.subtitle {
  font-size: 2em;
  color: $secondary !important;
  font-weight: bold;
  margin: 40px;
}
.card button {
  margin-top: 40px;
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
