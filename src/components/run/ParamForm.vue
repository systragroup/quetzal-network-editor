<!-- eslint-disable vue/multi-word-component-names -->
<script>
const $gettext = s => s
export default {
  name: 'Settings',
  data () {
    return {
      rules: {
        required: v => v != null || $gettext('Required'),
        largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
        nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      },
      errorMessage: null,
      showHint: false,
      panel: [],
    }
  },
  computed: {
    paramsBrute () { return this.$store.getters['run/parameters'] },
    parameters () {
      return this.paramsBrute.filter(
        param => (Object.keys(param).includes('category') && param.model === this.selectedStepFunction))
    },
    info () {
      return this.paramsBrute.filter(
        param => (param?.info && param?.model) === this.selectedStepFunction)[0]?.info
    },
    selectedStepFunction () { return this.$store.getters['run/selectedStepFunction'] },

  },
  mounted () {
    this.panel = [...Array(this.parameters.length).keys()].map((k, i) => i)
  },
  methods: {
    expandAll () {
      if (this.panel.length < this.parameters.length) {
        this.panel = [...Array(this.parameters.length).keys()].map((k, i) => i)
      } else {
        this.panel = []
      }
    },
    reset () {
      this.$store.dispatch('run/getParameters', {
        model: this.$store.getters.model,
        path: this.$store.getters.scenario + '/inputs/params.json',
      })
    },
  },
}
</script>
<template>
  <v-card
    class="card"
  >
    <v-card-title class="subtitle">
      {{ $gettext('Scenario Settings') }}
    </v-card-title>
    <v-card-text v-if="info">
      {{ info }}
    </v-card-text>
    <v-card-text>
      <v-form
        ref="form"
        lazy-validation
      >
        <v-expansion-panels
          v-model="panel"
          multiple
        >
          <v-expansion-panel
            v-for="(group, key) in parameters"
            :key="key"
          >
            <v-expansion-panel-header class="categorie">
              {{ group.category }}
            </v-expansion-panel-header>
            <v-expansion-panel-content style="background-color:var(--v-background-lighten4) !important;">
              <li
                v-for="(item, key2) in group.params"
                :key="key2"
              >
                <v-text-field
                  v-if="typeof item.items === 'undefined' && typeof item.value != 'boolean'"
                  v-model="item.value"
                  :type="item.type"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                />
                <v-switch
                  v-else-if="typeof item.items === 'undefined' && typeof item.value == 'boolean'"
                  v-model="item.value"
                  :label="$gettext(item.text)"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                />
                <v-select
                  v-else-if="item.items === '$scenarios'"
                  v-model="item.value"
                  :type="item.type"
                  :items="$store.getters.scenariosList.map(
                    el=>el.scenario).filter(
                    scen=>scen!==$store.getters.scenario)"
                  multiple
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                />
                <v-select
                  v-else
                  v-model="item.value"
                  :type="item.type"
                  :items="item.items"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                />
              </li>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn
        color="grey"
        text
        @click="reset"
      >
        {{ $gettext("back to default") }}
      </v-btn>

      <v-spacer />
      <v-btn
        text
        @click="expandAll"
      >
        {{ panel.length != parameters.length ? $gettext("Expand all") : $gettext("Collapse all") }}
      </v-btn>
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
.subtitle {
  font-size: 2em;
  color:var(--v-secondary-dark);
  font-weight: bold;
  margin: 10px;
  margin-left: 0px;
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
.v-card__text {
  max-height: 80%;
  overflow-y: auto;
}
.v-form {
  max-height: 80%;
}
.categorie {
  font-size: 1.5em;
  font-weight: bold;
  background:var(--v-background-lighten3);
}

</style>
