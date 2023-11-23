<script>
import { useIndexStore } from '@src/store/index'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks'

const $gettext = s => s

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Settings',
  events: ['submit'],
  setup () {
    const store = useIndexStore()
    const linksStore = useLinksStore()
    const rlinksStore = userLinksStore()
    const linkSpeed = {
      name: $gettext('PT speed'),
      type: 'Number',
      value: 0,
      units: 'km/h',
      hint: $gettext('Speed used to calculate travel time when a link is drawn, extend or a node is moved'),
    }
    const roadSpeed = {
      name: $gettext('Road speed'),
      type: 'Number',
      value: 0,
      units: 'km/h',
      hint: $gettext('Speed used to calculate road travel time when a link is drawn'),
    }
    const linksPopupContent = {
      name: $gettext('PT Popup Content'),
      type: 'String',
      choices: [],
      value: '',
      hint: $gettext('Link field to display when hovering a trip on the map'),
    }
    const roadsPopupContent = {
      name: $gettext('Road Popup Content'),
      type: 'String',
      choices: [],
      value: '',
      hint: $gettext('Link field to display when hovering road link on the map'),
    }
    const defaultHighway = {
      name: $gettext('Road Highway name'),
      type: 'String',
      value: '',
      hint: $gettext('New road links Highway property name'),
    }
    const outputName = {
      name: $gettext('Export name'),
      type: 'String',
      value: '',
      units: '.zip',
      hint: $gettext('the name of the exported zip file'),
    }

    const fetch = () => {
      // value are init with this function.
      // we want to get the value each time we show the settings.
      // if not, Cancel will not work as the state here and in the store will differ.
      linkSpeed.value = linksStore.linkSpeed
      roadSpeed.value = rlinksStore.roadSpeed
      linksPopupContent.choices = linksStore.lineAttributes
      linksPopupContent.value = store.linksPopupContent
      roadsPopupContent.choices = rlinksStore.rlineAttributes
      roadsPopupContent.value = store.roadsPopupContent
      defaultHighway.value = rlinksStore.defaultHighway
      outputName.value = store.outputName
    }

    return {
      store,
      linksStore,
      rlinksStore,
      linkSpeed,
      roadSpeed,
      linksPopupContent,
      roadsPopupContent,
      defaultHighway,
      outputName,
      fetch,
    }
  },
  data () {
    return {
      show: false,

      errorMessage: null,
      showHint: false,
      shake: false,

      rules: [
        v => !!v || $gettext('Required'),
        v => v >= 0 || $gettext('should be larger than 0'),
      ],
      zipRules: [v => v.slice(-4) !== '.zip' || $gettext('do not add .zip to the end')],
      showDialog: true,
    }
  },
  watch: {
    show () { this.fetch() },
  },
  created () {
    this.localShow = this.show
    this.fetch()
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
          defaultHighway: this.defaultHighway.value,
        }
        this.store.applySettings(payload)
        this.$emit('submit', true)
        this.show = false
        this.store.changeNotification(
          { text: $gettext('modification applied'), autoClose: true, color: 'success' })
      } else {
        this.shake = true
        setTimeout(() => {
          this.shake = false
        }, 500)
      }
    },
    cancel () {
      this.$emit('submit', false)
      this.show = false
    },
  },
}
</script>
<template>
  <v-menu
    v-model="show"
    :close-on-content-click="false"
    persistent
    :origin="'top right'"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props }">
      <div class="setting">
        <v-btn
          icon="fa-solid fa-cog"
          v-bind="props"
        />
      </div>
    </template>

    <v-card
      :class="{'shake':shake}"
      :max-width="300"
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
                :menu-props="{ top: true, offsetY: true }"
                chips
                multiple
              />
              <v-select
                v-model="roadsPopupContent.value"
                :items="roadsPopupContent.choices"
                :label="$gettext(roadsPopupContent.name)"
                :hint="showHint? $gettext(roadsPopupContent.hint): ''"
                :persistent-hint="showHint"
                :menu-props="{ top: true, offsetY: true }"
                chips
                multiple
              />
              <v-text-field
                v-model="defaultHighway.value"
                :type="defaultHighway.type"
                :label="$gettext(defaultHighway.name)"
                :suffix="defaultHighway.units"
                :hint="showHint? $gettext(defaultHighway.hint): ''"
                :persistent-hint="showHint"
                :rules="zipRules"
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
          variant="text"
          @click="cancel"
        >
          {{ $gettext("Cancel") }}
        </v-btn>

        <v-btn
          color="green-darken-1"
          variant="text"
          @click="submit"
        >
          {{ $gettext("Save") }}
        </v-btn>

        <v-spacer />
        <v-btn
          icon
          size="small"
          @click="showHint = !showHint"
        >
          <v-icon>far fa-question-circle small</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
<style lang="scss" scoped>
.setting {
  left: 96%;
  z-index: 2;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  height: 70px;
}

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
  color:  var(--v-secondarydark-base) !important;
  font-weight: bold;
  padding:1rem

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
