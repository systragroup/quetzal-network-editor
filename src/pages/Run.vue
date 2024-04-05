<script setup>

import ParamForm from '@comp/run/ParamForm.vue'
import Logs from '@comp/run/Logs.vue'
import { computed, ref, watch, onMounted } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useRunStore } from '@src/store/run'
import { useUserStore } from '@src/store/user'

const store = useIndexStore()
const runStore = useRunStore()
const userStore = useUserStore()
const stepFunction = ref('')
const steps = computed(() => { return runStore.steps })
const avalaibleStepFunctions = computed(() => {
  const modelsSet = runStore.availableModels
  return runStore.avalaibleStepFunctions.filter(el => modelsSet.has(el))
})
const selectedStepFunction = computed(() => { return runStore.selectedStepFunction })
const running = computed(() => { return runStore.running })
const currentStep = computed(() => { return runStore.currentStep })
const error = computed(() => { return runStore.error })
const errorMessage = computed(() => { return runStore.errorMessage })
const synchronized = computed(() => { return runStore.synchronized })
const isProtected = computed(() => { return userStore.protected })
const modelIsLoaded = computed(() => { return userStore.model !== null })

const endSignal = ref(runStore.endSignal)
watch(endSignal, () => runStore.changeEndSignal(endSignal.value))

onMounted(async () => {
  if (modelIsLoaded.value) {
    await runStore.getSteps()
    stepFunction.value = selectedStepFunction.value
  }
})

watch(stepFunction, async (val) => {
  if (modelIsLoaded.value) {
    if (avalaibleStepFunctions.value.includes(val)) {
      runStore.setSelectedStepFunction(val)
      runStore.getSteps()
    } else {
      stepFunction.value = avalaibleStepFunctions.value[0]
      runStore.setSelectedStepFunction(avalaibleStepFunctions.value[0])
      runStore.getSteps()
    }
  }
})

async function run() {
  try {
    const userStore = useUserStore()
    runStore.initExecution() // start the stepper at first step
    await store.exportToS3('inputs')
    await store.deleteOutputsOnS3()
    await store.deleteLogsOnS3()
    store.deleteOutputs()
    runStore.startExecution({ scenario: userStore.scenario })
  } catch (err) {
    runStore.terminateExecution()
    console.log(err)
    store.changeAlert(err)
  }
}

</script>
<template>
  <v-row class="background">
    <v-col order="1">
      <ParamForm />
    </v-col>
    <v-col order="2">
      <v-card class="card">
        <div class="title-container">
          <v-card-title class="subtitle">
            {{ $gettext('Scenario Simulation') }}
          </v-card-title>
          <Logs :disabled="running || !modelIsLoaded" />
        </div>

        <v-stepper
          v-model="currentStep"
          class="stepper"
        >
          <v-tabs
            v-if="avalaibleStepFunctions.length>1"
            v-model="stepFunction"
            show-arrows
            bg-color="lightgrey"
            color="success"
            fixed-tabs
          >
            <v-tab
              v-for="tab in avalaibleStepFunctions"
              :key="tab"
              :value="tab"
              :disabled="running || !modelIsLoaded"
            >
              {{ tab }}
            </v-tab>
          </v-tabs>
          <v-alert
            v-if="!synchronized"
            density="compact"
            variant="outlined"
            text
            type="warning"
          >
            {{ $gettext("Results are not synchronized with latest modifications. \
            Please relauch simulation to update results.") }}
          </v-alert>
          <v-alert
            v-if="error"
            density="compact"
            variant="outlined"
            text
            type="error"
          >
            {{ $gettext("Simulation ended with an execution error or have been aborted. \
            Please relauch simulation. If the problem persist, contact us.") }}
            <p
              v-for="key in Object.keys(errorMessage)"
              :key="key"
            >
              <b>{{ key }}: </b>{{ errorMessage[key] }}
            </p>
          </v-alert>
          <v-alert
            v-if="isProtected"
            density="compact"
            variant="outlined"
            text
            type="error"
          >
            {{ $gettext("This scenario is protected. You can not run simulation.") }}
          </v-alert>
          <div class="buttons-row ma-2">
            <v-btn
              :loading="running"
              :disabled="running || isProtected || !modelIsLoaded"
              color="success"
              prepend-icon="fa-solid fa-play"
              @click="run()"
            >
              {{ $gettext("Run Simulation") }}
            </v-btn>
            <v-btn
              v-show="running && currentStep!==1"
              color="grey"
              variant="text"
              @click="runStore.stopExecution()"
            >
              {{ $gettext("Abort") }}
            </v-btn>

            <v-switch
              v-model="endSignal"
              class="switch"
              density="compact"
              false-icon="fas fa-volume-xmark"
              true-icon="fas fa-volume-high"
              inset
              color="success"
              hide-details
            >
              <template
                v-slot:prepend
              >
                <span> {{ $gettext('End signal') }}</span>
              </template>
            </v-switch>
          </div>
          <div
            v-if="modelIsLoaded"
          >
            <div
              v-for="(step, i) in steps"
              :key="i+1"
            >
              <v-stepper-item
                v-if="!error"
                :complete="currentStep > i+1"
                :color="currentStep >= i+1?'primary':'regular'"
                :title="step.name"
                :value="i+1"
                compact
                :step="i+1"
              />
              <v-stepper-item
                v-else
                :complete="currentStep > i+1"
                :title="step.name"
                :value="i+1"
                :step="i+1"
              />
            </div>
          </div>
        </v-stepper>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>
.container {
  background-color:rgb(var(--v-theme-background)) !important;
  overflow: hidden;
  padding: 0;
}
.background {
  background-color: rgb(var(--v-theme-background));
  height: 100%;
  padding: 1rem;
  overflow: hidden;
}
.card {
  height: 90vh;
  overflow-y: hidden;
  background-color: rgb(var(--v-theme-lightergrey));
}
.v-card__text {
  max-height: 80%;
}
.row {
  height: calc(100% - 38px)
}
.col {
  max-height: 100%;
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
  color:rgb(var(--v-theme-secondary-dark));
  font-weight: bold;
  margin: 10px;
  margin-left: 0;
}
.stepper{
  background-color:rgb(var(--v-theme-mediumgrey)) ;
  color:rgb(var(--v-theme-black));
  overflow-y: auto;
}
.buttons-row{
  display: flex;
  gap:1rem;
  flex-direction: row;
}
.switch{
  margin-left:auto;
  padding-right:0.5rem;
}
.title-container{
  display: flex;
  gap:1rem;
  align-items: center;
  flex-direction: row;
}

</style>
