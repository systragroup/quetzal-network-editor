<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRunStore } from '@src/store/run'
import { useUserStore } from '@src/store/user'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()
const runStore = useRunStore()
const userStore = useUserStore()

function includesOrEqual(a, b) {
  // to check list and string.f
  if (Array.isArray(a)) {
    return a.includes(b)
  } else {
    return a === b
  }
}
const selectedStepFunction = computed(() => { return runStore.selectedStepFunction })
const parameters = computed(() => {
  return runStore.parameters.filter(
    param => (Object.keys(param).includes('category') && includesOrEqual(param.model, selectedStepFunction.value)))
})

const info = computed(() => {
  let infoArr = runStore.parameters.filter(param => param?.info)
  infoArr = infoArr.filter(param => includesOrEqual(param.model, selectedStepFunction.value))
  return infoArr[0]?.info
})

const scenariosList = computed(() => { return userStore.scenariosList })
const activeScenario = computed(() => { return userStore.scenario })

function removeDeletedScenarios () {
  // for $scenario field: remove selected scenario if not in the scen list anymore.
  for (const cat of parameters.value) {
    for (const item of cat.params) {
      if (item.items === '$scenarios') {
        const scenarios = scenariosList.value.map(el => el.scenario)
        if (Array.isArray(item.value)) {
          item.value = item.value.filter(name => scenarios.includes(name))
        } else {
          item.value = scenarios.includes(item.value) ? item.value : ''
        }
      }
    }
  }
}

onMounted(() => {
  removeDeletedScenarios()
})

function getItems(item) {
  // give all scenario as items choice.
  // else return items in the json (item.items)
  if (item.items === '$scenarios') {
    return scenariosList.value.map(
      el => el.scenario).filter(
      scen => scen !== activeScenario.value)
  } else {
    return item.items
  }
}

// funcitions to show panel, reset, show hints, etc.
function reset () {
  runStore.getParameters()
}

const panel = ref([...Array(parameters.value.length).keys()].map((k, i) => i))

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

const editHint = ref(false)

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
                  hide-details
                  :label="$gettext(item.text)"
                  :persistent-hint="showHint"
                />
                <v-number-input
                  v-else-if="item.type == 'Number'"
                  v-model="item.value"
                  variant="outlined"
                  control-variant="stacked"
                  :type="item.type"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  hide-details
                  :rules="item.rules.map((rule) => rules[rule])"
                  @keydown="(k)=>console.log(k)"
                />
                <v-text-field
                  v-else-if="typeof item.items === 'undefined' "
                  v-model="item.value"
                  variant="outlined"
                  hide-details
                  :type="item.type"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :rules="item.rules.map((rule) => rules[rule])"
                />

                <v-select
                  v-else
                  v-model="item.value"
                  variant="outlined"
                  hide-details
                  :type="item.type"
                  :multiple="item?.multiple"
                  :items="getItems(item)"
                  :label="$gettext(item.text)"
                  :suffix="item.units"
                  :rules="item.rules.map((rule) => rules[rule])"
                  @update:model-value="removeDeletedScenarios(item)"
                />
                <div v-if="showHint">
                  <div
                    v-if="!editHint"
                    class="custom-hint"
                    @dblclick="editHint=true"
                  >
                    {{ item.hint }}
                  </div>

                  <textarea
                    v-else
                    v-model="item.hint"
                    rows="1"
                    class="custom-hint edition"
                    @keydown.enter="editHint=false"
                  />
                </div>
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

.custom-hint{
  opacity: var(--v-medium-emphasis-opacity);
  width:100%;
  font-size:small;
  margin-right: auto;
}
.edition{
  border:1px gray solid
}
</style>
