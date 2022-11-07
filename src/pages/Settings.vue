<script>
const $gettext = s => s

export default {
  name: 'Settings',
  data () {
    return {

      speed: {
        name: 'speed',
        type: 'Number',
        value: this.$store.getters.speed,
        units: 'km/h',
        hint: $gettext('Speed used to calculate the travel time when a new line is draw, extend, or a node is move'),
        showHint: false,
      },
      popupContent: {
        name: 'Popup Content',
        type: 'String',
        choices: this.$store.getters.lineAttributes,
        value: this.$store.getters.popupContent,
        hint: $gettext('PopUp field to display when hovering a trip on the map'),
        showHint: false,
      },
      errorMessage: null,
      shake: false,

      rules: [
        v => !!v || $gettext('Required'),
        v => v >= 0 || $gettext('should be larger than 0'),

      ],
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
        <v-card-title class="title">
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
                  :append-icon=" 'far fa-question-circle small'"
                  :type="speed.type"
                  :label="speed.name"
                  :suffix="speed.units"
                  :hint="speed.showHint? speed.hint: ''"
                  :persistent-hint="speed.showHint"
                  :rules="rules"
                  required
                  @click:append="speed.showHint=!speed.showHint"
                  @wheel="()=>{}"
                />
                <v-select
                  v-model="popupContent.value"
                  :items="popupContent.choices"
                  :append-icon=" 'far fa-question-circle'"
                  :label="popupContent.name"
                  :hint="popupContent.showHint? popupContent.hint: ''"
                  :persistent-hint="popupContent.showHint"
                  required
                  @click:append="popupContent.showHint=!popupContent.showHint"
                />
              </v-col>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />

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
