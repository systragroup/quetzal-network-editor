<script>

export default {
  name: 'Run',
  computed: {
    steps () { return this.$store.getters['run/steps'] },
    running () { return this.$store.getters['run/running'] },
    currentStep () { return this.$store.getters['run/currentStep'] },
    error () { return this.$store.getters['run/error'] },
  },
  methods: {
    run () {
      this.$store.dispatch('run/startExecution')
    },
    stopRun () {
      this.$store.dispatch('run/stopExecution')
    },
  },
}

</script>
<template>
  <v-container class="ma-0 pa-2">
    <v-row>
      <v-col order="1" />
      <v-col order="2">
        <v-card class="card">
          <v-stepper
            v-model="currentStep"
            vertical
          >
            <v-container
              v-for="(step, i) in steps"
              :key="i+1"
            >
              <v-stepper-step
                :complete="currentStep > i+1"
                :step="i+1"
                :rules="[() => !(i+1 == currentStep) || !error]"
              >
                {{ step.name }}
              </v-stepper-step>
              <v-stepper-content
                :step="i+1"
              >
                <v-btn
                  v-if="running"
                  color="grey"
                  text
                  @click="stopRun()"
                >
                  {{ $gettext("Abort") }}
                </v-btn>
              </v-stepper-content>
            </v-container>
            <v-btn
              :loading="running"
              :disabled="running"
              text
              color="green darken-1"
              @click="run()"
            >
              {{ $gettext("Run Simulation") }}
            </v-btn>
          </v-stepper>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<style lang="scss" scoped>
* {
  margin: 0px;
}
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
.row{
  height: calc(100% - 50px)
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
  margin-top: 0px;
}
.v-stepper__content {
  border-left: 1px solid rgba(0,0,0,.12);
}
.v-sheet.v-stepper:not(.v-sheet--outlined) {
  box-shadow: none;
}

</style>
