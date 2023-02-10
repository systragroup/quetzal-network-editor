<script>
const $gettext = s => s

export default {
  name: 'Settings',
  data () {
    return {

      linkSpeed: {
        name: $gettext('PT speed'),
        type: 'Number',
        value: this.$store.getters.linkSpeed,
        units: 'km/h',
        hint: $gettext('Speed used to calculate travel time when a link is drawn, extend or a node is moved'),
      },
      roadSpeed: {
        name: $gettext('Road speed'),
        type: 'Number',
        value: this.$store.getters.roadSpeed,
        units: 'km/h',
        hint: $gettext('Speed used to calculate road travel time when a link is drawn'),
      },
      linksPopupContent: {
        name: $gettext('PT Popup Content'),
        type: 'String',
        choices: this.$store.getters.lineAttributes,
        value: this.$store.getters.linksPopupContent,
        hint: $gettext('Link field to display when hovering a trip on the map'),
      },
      roadsPopupContent: {
        name: $gettext('Road Popup Content'),
        type: 'String',
        choices: this.$store.getters.rlineAttributes,
        value: this.$store.getters.roadsPopupContent,
        hint: $gettext('Link field to display when hovering road link on the map'),
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
          linkSpeed: this.linkSpeed.value,
          roadSpeed: this.roadSpeed.value,
          linksPopupContent: this.linksPopupContent.value,
          roadsPopupContent: this.roadsPopupContent.value,
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
                  v-model="linkSpeed.value"
                  :type="linkSpeed.type"
                  :label="$gettext(linkSpeed.name)"
                  :suffix="linkSpeed.units"
                  :hint="showHint? $gettext(linkSpeed.hint): ''"
                  :persistent-hint="showHint"
                  :rules="rules"
                  required
                  @wheel="()=>{}"
                />
                <v-text-field
                  v-model="roadSpeed.value"
                  :type="roadSpeed.type"
                  :label="$gettext(roadSpeed.name)"
                  :suffix="roadSpeed.units"
                  :hint="showHint? $gettext(roadSpeed.hint): ''"
                  :persistent-hint="showHint"
                  :rules="rules"
                  required
                  @wheel="()=>{}"
                />
                <v-select
                  v-model="linksPopupContent.value"
                  :items="linksPopupContent.choices"
                  :label="$gettext(linksPopupContent.name)"
                  :hint="showHint? $gettext(linksPopupContent.hint): ''"
                  :persistent-hint="showHint"
                  required
                />
                <v-select
                  v-model="roadsPopupContent.value"
                  :items="roadsPopupContent.choices"
                  :label="$gettext(roadsPopupContent.name)"
                  :hint="showHint? $gettext(roadsPopupContent.hint): ''"
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
