<script setup lang="ts">
import audioFile from '@static/samsung-washing-machine-melody-made-with-Voicemod-technology.mp3'
import Logs from '@comp/run/Logs.vue'
import { computed, watch, onMounted, ref } from 'vue'
import { useIndexStore } from '@src/store/index'
import { useRunStore } from '@src/store/run'
import { useUserStore } from '@src/store/user'
import { useGettext } from 'vue3-gettext'
import Warning from '../utils/Warning.vue'
const { $gettext } = useGettext()
const store = useIndexStore()
const runStore = useRunStore()
const userStore = useUserStore()

const steps = computed(() => { return runStore.steps })
const modelTag = computed(() => runStore.modelTag)
const avalaibleStepFunctions = computed(() => {
  const modelsSet = runStore.availableModels
  return runStore.avalaibleStepFunctions.filter(el => modelsSet.has(el))
})
const stepFunction = computed({
  get: () => runStore.selectedStepFunction,
  set: (v) => runStore.selectedStepFunction = v,
})

const variants = computed(() => runStore.variants)
const running = computed(() => runStore.running)
const status = computed(() => runStore.status)
const currentStep = computed(() => runStore.currentStep)
const error = computed(() => runStore.error)
const errorMessage = computed(() => runStore.errorMessage)

const isProtected = computed(() => userStore.protected)
const modelIsLoaded = computed(() => userStore.model !== null)

onMounted(async () => {
  if (modelIsLoaded.value) {
    await runStore.getModelTag()
    await runStore.getSteps()
    await runStore.checkRunningExecution()
  }
})

watch(avalaibleStepFunctions, (val) => {
  if (modelIsLoaded.value) {
    if (!val.includes(stepFunction.value)) {
      stepFunction.value = val[0]
      runStore.getSteps()
    }
  }
}, { once: true })

watch(stepFunction, async (val) => {
  if (modelIsLoaded.value) {
    if (avalaibleStepFunctions.value.includes(val)) {
      stepFunction.value = val
      runStore.getSteps()
    } else {
      stepFunction.value = avalaibleStepFunctions.value[0]
      runStore.getSteps()
    }
  }
})

async function run() {
  const wasRunning = await runStore.checkRunningExecution()
  if (wasRunning) {
    store.changeNotification(
      { text: $gettext('could not start and save. This scenario was already launch by another user.'),
        autoClose: false, color: 'warning' })
    return
  }
  try {
    runStore.initExecution() // start the stepper at first step
    await store.exportToS3('inputs')
    await store.deleteOutputsOnS3()
    await store.deleteLogsOnS3()
    store.deleteOutputs()
    runStore.start()
  } catch (err) {
    runStore.stopExecution()
    console.log(err)
    store.changeAlert(err)
  }
}

// audio

const endSignal = ref(true)
watch(status, (v) => { if (v === 'FINISHED') playAudio() })

function playAudio() {
  if (endSignal.value) {
    const audio = new Audio(audioFile)
    audio.play()
    // Stop the audio after 2 seconds
    setTimeout(function () {
      audio.pause()
      audio.currentTime = 0
    }, 5000)
  }
}

</script>
<template>
  <v-card class="card">
    <div class="title-container">
      <v-card-title class="subtitle">
        {{ $gettext('Simulation') }}
      </v-card-title>
      <v-card-subtitle class="model-tag">
        {{ modelTag }}
      </v-card-subtitle>

      <Logs :disabled="running || !modelIsLoaded" />
    </div>
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

    <v-stepper
      v-model="currentStep"
      class="stepper"
    >
      <Warning
        :show="error"
        :title="$gettext('Simulation ended with an execution error or have been aborted. \
        Please relauch simulation. If the problem persist, contact us.')"
        :messages="errorMessage"
      />
      <Warning
        :show="isProtected"
        :title="$gettext('This scenario is protected')"
        :messages="$gettext(' You cannot run simulation.')"
      />

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
          :label="$gettext('End signal')"
          color="success"
          hide-details
        >
          <template v-slot:prepend />
        </v-switch>
      </div>
      <v-select
        v-if="variants"
        v-model="variants.variants"
        class="ma-2"
        :label="variants.label||'variants'"
        chips
        :disabled="running"
        :items="variants.choices"
        :multiple="variants.multiple"
        :hide-details="true"
      />

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
            :color="currentStep >= i+1? 'primary': undefined"
            :title="step.name"
            :value="i+1"
            :step="i+1"
          />
          <v-stepper-item
            v-else
            :complete="currentStep > i+1"
            :color="currentStep >= i+1? 'primary': undefined"
            :title="step.name"
            :value="i+1"
            :rules="[() => !(currentStep===i+1)]"
            :step="i+1"
          />
        </div>
      </div>
    </v-stepper>
  </v-card>
</template>
<style lang="scss" scoped>
.card {
  height: 100%;
  overflow-y: hidden;
  background-color: rgb(var(--v-theme-lightergrey));
}
.model-tag{

}
.subtitle {
  font-size: 2em;
  font-weight: bold;
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
  align-items: baseline;
  flex-direction: row;
}
</style>
