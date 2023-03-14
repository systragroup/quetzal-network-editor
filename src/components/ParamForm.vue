<script>

const $gettext = s => s
export default {
  name: 'Settings',
  data () {
    return {
      // this is doing Nothing. we should rename it id DynamoDB, we do not want to copy and delete the S3 bucket.
      // in DynamoDB, we could have the project name (changable) and the s3 bucket reference (not changeable)
      projectName: {
        name: 'Project Name',
        text: $gettext('project Name'),
        type: 'String',
        value: this.$store.getters.projectId,
        hint: $gettext('Change project Name'),
        rules: ['required'],
      },
      parameters: [
        {
          cat: 'Footpaths',
          params: [
            {
              name: 'max_time_between_tasks',
              text: 'Max time between tasks',
              type: 'Number',
              value: 0,
              units: 'mins',
              hint: 'max waiting time before going back to the depot',
              rules: ['required', 'largerThanZero'],
            },
            {
              cat: 'config',
              name: 'min_time_between_tasks',
              text: 'Min time between tasks',
              type: 'Number',
              value: 0,
              units: 'mins',
              hint: 'minimum waiting time before each service, turnover time.',
              rules: ['required', 'nonNegative'],
            },
            {
              cat: 'config',
              name: 'consumption',
              text: 'bus consumption',
              type: 'Number',
              value: 0,
              units: 'kwh/km',
              hint: 'consumption.',
              rules: ['required', 'nonNegative'],
            },
          ],
        },
        {
          cat: 'Pathfinder',
          params: [
            {
              cat: 'config',
              name: 'max_energy',
              text: 'effective Battery capacity',
              type: 'Number',
              value: 0,
              units: 'KWH',
              hint: 'battery capacity (including derating and operation margins)',
              rules: ['required', 'largerThanZero'],
            },
            {
              cat: 'config',
              name: 'bus_cost',
              text: 'bus Cost',
              type: 'Number',
              value: 0,
              units: '$/Bus',
              hint: 'bus cost for optimization',
              rules: [],
            },
            {
              cat: 'config',
              name: 'energy_cost',
              text: 'Energy Cost',
              type: 'Number',
              value: 0,
              units: '$/KWH',
              hint: 'energy cost for optimization',
              rules: ['required', 'nonNegative'],
            },
            {
              cat: 'config',
              name: 'time_cost',
              text: 'waiting time Cost',
              type: 'Number',
              value: 0,
              units: '$/mins',
              hint: 'waiting time cost for optimization',
              rules: ['required', 'nonNegative'],
            },
          ],
        },
        {
          cat: 'Logit',
          params: [
            {
              cat: 'config',
              name: 'max_energy',
              text: 'effective Battery capacity',
              type: 'Number',
              value: 0,
              units: 'KWH',
              hint: 'battery capacity (including derating and operation margins)',
              rules: ['required', 'largerThanZero'],
            },
            {
              cat: 'config',
              name: 'bus_cost',
              text: 'bus Cost',
              type: 'Number',
              value: 0,
              units: '$/Bus',
              hint: 'bus cost for optimization',
              rules: [],
            },
            {
              cat: 'config',
              name: 'energy_cost',
              text: 'Energy Cost',
              type: 'Number',
              value: 0,
              units: '$/KWH',
              hint: 'energy cost for optimization',
              rules: ['required', 'nonNegative'],
            },
            {
              cat: 'config',
              name: 'time_cost',
              text: 'waiting time Cost',
              type: 'Number',
              value: 0,
              units: '$/mins',
              hint: 'waiting time cost for optimization',
              rules: ['required', 'nonNegative'],
            },
            {
              cat: 'config',
              name: 'energy_cost2',
              text: 'Energy Cost',
              type: 'Number',
              value: 0,
              units: '$/KWH',
              hint: 'energy cost for optimization',
              rules: ['required', 'nonNegative'],
            },
            {
              cat: 'config',
              name: 'time_cost2',
              text: 'waiting time Cost',
              type: 'Number',
              value: 0,
              units: '$/mins',
              hint: 'waiting time cost for optimization',
              rules: ['required', 'nonNegative'],
            },
          ],
        },
      ],
      rules: {
        required: v => !!v || $gettext('Required'),
        largerThanZero: v => v > 0 || $gettext('should be larger than 0'),
        nonNegative: v => v >= 0 || $gettext('should be larger or equal to 0'),
      },
      errorMessage: null,
      showHint: false,
      panel: [],
    }
  },
  computed: {
  },
  created () {
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
    submit () {},
    cancel () {},
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
              {{ group.cat }}
            </v-expansion-panel-header>
            <v-expansion-panel-content style="background-color:var(--v-background-lighten4) !important;">
              <v-text-field
                v-for="(item, key2) in group.params"
                :key="key2"
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
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
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
        color="success"
        text
        @click="submit"
      >
        {{ $gettext("Save") }}
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
  margin: 40px;
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
