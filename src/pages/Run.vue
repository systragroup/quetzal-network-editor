<script>

const $gettext = s => s

export default {
  name: 'Run',
  data () {
    return {
      // this is doing Nothing. we should rename it id DynamoDB, we do not want to copy and delete the S3 bucket.
      // in DynamoDB, we could have the project name (changable) and the s3 bucket reference (not changeable)
      projectName: {
        name: 'Project Name',
        text: $gettext('project Name'),
        type: 'String',
        value: 'Project Name',
        hint: $gettext('Change project Name'),
        rules: ['required'],
      },
      parameters: [
        {
          cat: 'config',
          name: 'energy_cost',
          text: $gettext('Energy Cost'),
          type: 'Number',
          value: 302,
          units: '$/KWH',
          hint: $gettext('energy cost for optimization'),
          rules: ['required', 'nonNegative'],
        },
        {
          cat: 'config',
          name: 'time_cost',
          text: $gettext('waiting time Cost'),
          type: 'Number',
          value: 6543,
          units: '$/mins',
          hint: $gettext('waiting time cost for optimization'),
          rules: ['required', 'nonNegative'],
        },
      ],
      rules: {
        required: v => !!v || $gettext('Required'),
        largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
        nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      },
      errorMessage: null,
      showHint: false,
      shake: false,
    }
  },
  methods: {
    run () {
      this.$store.dispatch('run/startExecution')
    },
  },
}

</script>
<template>
  <v-container class="ma-0 pa-2">
    <v-row>
      <v-col order="1">
        <v-card class="card" >
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
                    v-model="projectName.value"
                    :type="projectName.type"
                    disabled
                    :label="$gettext(projectName.text)"
                    :hint="showHint? $gettext(projectName.hint): ''"
                    :persistent-hint="showHint"
                    :rules="projectName.rules.map((rule) => rules[rule])"
                    required
                  />

                  <v-text-field
                    v-for="(item,key) in parameters.slice(1)"
                    :key="key"
                    v-model="item.value"
                    :type="item.type"
                    :label="$gettext(item.text)"
                    :suffix="item.units"
                    :hint="showHint? $gettext(item.hint): ''"
                    :persistent-hint="showHint"
                    :rules="item.rules.map((rule) => rules[rule])"
                    required
                    @wheel="()=>{}"
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
      </v-col>
      <v-col order="2">
        <v-card class="card">
          <v-card-actions>
            <v-btn
              :loading="running"
              :disabled="running"
              color="green darken-1"
              @click="run()"
            >
              {{ $gettext("Run Simulation") }}
            </v-btn>
          </v-card-actions>
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
  margin-top: 40px;
}
</style>
