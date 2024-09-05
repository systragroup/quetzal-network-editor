<!-- eslint-disable vue/multi-word-component-names -->
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRunStore } from '@src/store/run'
import { useUserStore } from '@src/store/user'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
const runStore = useRunStore()
const userStore = useUserStore()

const selectedStepFunction = computed(() => { return runStore.selectedStepFunction })
const paramsBrute = computed(() => { return runStore.parameters })
const parameters = computed(() => {
  return paramsBrute.value.filter(
    param => (Object.keys(param).includes('category') && param.model === selectedStepFunction.value))
})

const info = computed(() => {
  return paramsBrute.value.filter(param => (param?.info && param?.model) === selectedStepFunction.value)[0]?.info
})

const panel = ref([])

onMounted(() => {
  panel.value = [...Array(parameters.value.length).keys()].map((k, i) => i)
})

const scenariosList = computed(() => { return userStore.scenariosList })
const activeScenario = computed(() => { return userStore.scenario })

function reset () {
  runStore.getParameters()
}

function expandAll () {
  if (panel.value.length < parameters.value.length) {
    panel.value = [...Array(parameters.value.length).keys()].map((k, i) => i)
  } else {
    panel.value = []
  }
}

const showHint = ref(false)
const rules = {
  required: v => v != null || $gettext('Required'),
  largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
  nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
}

function removeDeletedScenarios (item) {
  // when selecting a value. make sure it exist in the scen list.
  // if a scen selected was deleted. it will be remove from the v-model here.
  // this is not perfect, but a user who toggle a scen will fix the problem...
  const scenarios = scenariosList.value.map(el => el.scenario)
  item.value = item.value.filter(name => scenarios.includes(name))
}

</script>
<template>
  <v-card
    class="card"
  >
    <v-card-title class="subtitle">
      {{ $gettext('Scenario Settings') }}
    </v-card-title>
    <v-card-text
      v-if="info"
      class="info-div"
    >
      {{ info }}
    </v-card-text>
    <div class="expansion">
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
            <v-expansion-panel-title class="categorie">
              {{ group.category }}
            </v-expansion-panel-title>
            <v-expansion-panel-text style="background-color:rgb(var(--v-theme-lightgrey));">
              <li
                v-for="(item, key2) in group.params"
                :key="key2"
                class="param-list"
              >
                <v-switch
                  v-if="typeof item.items === 'undefined' && typeof item.value == 'boolean'"
                  v-model="item.value"
                  color="primary"
                  density="compact"
                  class="pl-2"
                  :label="$gettext(item.text)"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                />
                <v-text-field
                  v-else-if="typeof item.items === 'undefined' "
                  v-model="item.value"
                  variant="outlined"
                  :type="item.type"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                />

                <v-select
                  v-else-if="item.items === '$scenarios'"
                  v-model="item.value"
                  variant="outlined"
                  :type="item.type"
                  :items="scenariosList.map(
                    el=>el.scenario).filter(
                    scen=>scen!==activeScenario)"
                  :multiple="item?.multiple"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                  @update:model-value="removeDeletedScenarios(item)"
                />
                <v-select
                  v-else
                  v-model="item.value"
                  variant="outlined"
                  :type="item.type"
                  :multiple="item?.multiple"
                  :items="item.items"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :hint="showHint? $gettext(item.hint): ''"
                  :persistent-hint="showHint"
                  :rules="item.rules.map((rule) => rules[rule])"
                />
              </li>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </div>
    <v-card-actions>
      <v-btn
        color="grey"
        variant="text"
        @click="reset"
      >
        {{ $gettext("back to default") }}
      </v-btn>

      <v-spacer />
      <v-btn
        variant="text"
        @click="expandAll"
      >
        {{ panel.length != parameters.length ? $gettext("Expand all") : $gettext("Collapse all") }}
      </v-btn>
      <v-btn
        icon
        size="small"
        @click="showHint = !showHint"
      >
        <v-icon>far fa-question-circle small</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<style lang="scss" scoped>
// card style come from parent component.
.expansion{
  max-height:100%;
  overflow-y:auto;
}
.info-div{
  flex:0;
  white-space: pre-line;
}
.subtitle {
  font-size: 2em;
  color:rgb(var(--v-theme-secondary-dark));
  font-weight: bold;
  margin: 10px;
  margin-left: 0;
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
  background:rgb(var(--v-theme-mediumgrey)) ;
}
.param-list{
  margin-bottom:1.2rem;
}
</style>
