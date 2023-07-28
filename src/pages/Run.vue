<script>

import ParamForm from '@comp/run/ParamForm.vue'

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Run',
  components: {
    ParamForm,
  },
  computed: {
    steps () { return this.$store.getters['run/steps'] },
    running () { return this.$store.getters['run/running'] },
    currentStep () { return this.$store.getters['run/currentStep'] },
    error () { return this.$store.getters['run/error'] },
    errorMessage () { return this.$store.getters['run/errorMessage'] },
    synchronized () { return this.$store.getters['run/synchronized'] },
    isProtected () {
      return this.$store.getters.protected.includes(this.$store.getters.scenario)
    },
    modelIsLoaded () { return this.$store.getters.model !== null },
  },
  created () {
    if (this.modelIsLoaded) {
      this.$store.dispatch('run/getSteps')
    }
  },
  methods: {
    async run () {
      this.$store.commit('run/startExecution') // start the stepper at first step
      this.$store.dispatch('exportToS3').then(
        () => {
          this.$store.dispatch('run/startExecution', { scenario: this.$store.getters.scenario })
        }).catch(
        err => {
          this.$store.commit('run/terminateExecution')
          this.$store.commit('changeAlert', err)
          // alert('error saving scenario')
        })
    },
    stopRun () {
      this.$store.dispatch('run/stopExecution')
    },
  },
}

</script>
<template>
  <v-row class="ma-0 pa-2 background">
    <v-col order="1">
      <ParamForm />
    </v-col>
    <v-col order="2">
      <v-card class="card">
        <v-card-title class="subtitle">
          {{ $gettext('Scenario Simulation') }}
        </v-card-title>
        <v-stepper
          v-model="currentStep"
          vertical
          style="background-color:var(--v-background-lighten4);"
        >
          <v-alert
            v-if="!synchronized"
            dense
            outlined
            text
            type="warning"
          >
            {{ $gettext("Results are not synchronized with latest modifications. \
            Please relauch simulation to update results.") }}
          </v-alert>
          <v-alert
            v-if="error"
            dense
            outlined
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
            dense
            outlined
            text
            type="error"
          >
            {{ $gettext("This scenario is protected. You can not run simulation.") }}
          </v-alert>
          <v-btn
            :loading="running"
            :disabled="running || isProtected || !modelIsLoaded"
            color="success"
            @click="run()"
          >
            <v-icon
              small
              style="margin-right: 10px;"
            >
              fa-solid fa-play
            </v-icon>
            {{ $gettext("Run Simulation") }}
          </v-btn>
          <v-btn
            v-show="running && currentStep!==1"
            color="grey"
            text
            @click="stopRun()"
          >
            {{ $gettext("Abort Simulation") }}
          </v-btn>
          <div v-if="modelIsLoaded">
            <v-container
              v-for="(step, i) in steps"

              :key="i+1"
            >
              <v-stepper-content
                :step="i+1"
              />
              <v-stepper-step
                :complete="currentStep > i+1"
                :step="i+1"
                :rules="[() => !(i+1 == currentStep) || !error]"
              >
                {{ step.name }}
              </v-stepper-step>
            </v-container>
          </div>
        </v-stepper>
      </v-card>
    </v-col>
  </v-row>
</template>
<style lang="scss" scoped>
.container {
  width: 100%;
  overflow: hidden;
  margin-left: 0 auto;
  margin-right: 0 auto;
  padding: 0 0 0 0;
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
  height: 100%;
  overflow-y: auto;
  padding: 40px;
}

.v-card__text {
  max-height: 80%;
  overflow-y: auto;
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
  color:var(--v-secondary-dark);
  font-weight: bold;
  margin: 10px;
  margin-left: 0px;
}
.card button {
  margin-top: 0px;
}
.v-stepper__content {
  border-left: 4px solid rgba(0,0,0,.12);
}
.v-sheet.v-stepper:not(.v-sheet--outlined) {
  box-shadow: none;
}
.background {
  background-color:var(--v-background-base);
}
</style>
