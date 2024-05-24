<script setup>
import { useMapMatchingStore } from '@src/store/MapMatching'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { ref, computed, onMounted } from 'vue'
import s3 from '@src/AWSClient'
import { useGettext } from 'vue3-gettext'
const { $gettext } = useGettext()

const store = useIndexStore()
const runMapMatching = useMapMatchingStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()

const showOverwriteDialog = ref(false)

const rlinksIsEmpty = computed(() => { return rlinksStore.rlinksIsEmpty })
const linksIsEmpty = computed(() => { return linksStore.linksIsEmpty })
const running = computed(() => { return runMapMatching.running })
const status = computed(() => { return runMapMatching.status })
const error = computed(() => { return runMapMatching.error })
const errorMessage = computed(() => { return runMapMatching.errorMessage })
const timer = computed(() => { return runMapMatching.timer })
const callID = computed(() => { return runMapMatching.callID })
const bucket = computed(() => { return runMapMatching.bucket })
const showHint = ref(false)
// dont use for now.
// need to change Step function payload if we add parameters.
/*
const parameters = ref([
  {
    name: 'SIGMA',
    text: 'Sigma',
    value: 4.02,
    type: 'Number',
    units: 'meters',
    hint: 'emission probablity constant. the bigger it is the further away a stops can be from roads.',
  },
  {
    name: 'BETA',
    text: 'beta',
    value: 3,
    type: 'Number',
    units: 'meters',
    hint: 'transition probablity constant. the smaller the smaller the difference between the as-the-crow and routing distance can be.',
  }])
*/

onMounted(() => {
  // remove nonExistant routeType from v-model selection (was deleted, or scen changed.)
  runMapMatching.exclusions = runMapMatching.exclusions.filter(el => routeTypeList.value.has(el))
})

async function start () {
  runMapMatching.running = true
  runMapMatching.setCallID()
  getApproxTimer()
  await exportFiles()
  runMapMatching.startExecution({ callID: callID.value, exclusions: runMapMatching.exclusions })
}

function getApproxTimer () {
  // same as in the python function. to decide the number of machine.
  const num_trips = linksStore.tripId.length
  let tot_num_iteration = num_trips / 6
  function get_num_machine(num_it, target_it = 20, choices = [12, 8, 4, 1]) {
    // return the number of machine (in choices) required to have target_it per machine
    let num_machine = Math.floor(num_it / target_it)
    let best_diff = 100
    let best_val = 12
    for (let v of choices) { // choice of output
      let diff = Math.abs(num_machine - v)
      if (diff < best_diff) {
        best_diff = diff
        best_val = v
      }
    }
    return best_val
  }

  const num_machine = get_num_machine(tot_num_iteration, 20, [12, 8, 4, 1])
  // spit and merge 10 secs each. maybe 20sec for MM prep + 1 sec per it. 10sec for export
  runMapMatching.timer = (tot_num_iteration / num_machine) + 20 + 20 + 10// 1 sec per it
}

function applyOverwriteDialog () {
  store.initrLinks()
  showOverwriteDialog.value = false
  start()
}

async function exportFiles() {
  const promises = []
  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/road_links.geojson'),
    JSON.stringify(rlinksStore.rlinks)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/road_nodes.geojson'),
    JSON.stringify(rlinksStore.rnodes)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/links.geojson'),
    JSON.stringify(linksStore.links)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/nodes.geojson'),
    JSON.stringify(linksStore.nodes)))

  try {
    await Promise.all(promises)
  } catch (err) {
    const store = useIndexStore()
    store.changeAlert(err)
  }
}

const routeTypeList = computed(() => new Set(linksStore.links.features.map(link => link.properties.route_type)))

function stopRun () { runMapMatching.stopExecution() }

</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <v-card-title>
        {{ $gettext("Match PT network on road network") }}
      </v-card-title>
      <v-card-subtitle v-if="rlinksIsEmpty || linksIsEmpty">
        {{ $gettext("need a road and a PT network") }}
      </v-card-subtitle>
      <v-spacer />
      <v-card-subtitle>
        <v-alert
          v-if="error"
          density="compact"
          width="50rem"
          variant="outlined"
          text
          type="error"
        >
          {{ $gettext("There as been an error Mapmatching. \
            Please try again. If the problem persist, contact us.") }}
          <p
            v-for="key in Object.keys(errorMessage)"
            :key="key"
          >
            <b>{{ key }}: </b>{{ errorMessage[key] }}
          </p>
        </v-alert>
      </v-card-subtitle>
      <v-divider />

      <v-spacer />
      <v-select
        v-model="runMapMatching.exclusions"
        :items="routeTypeList"
        :hint="showHint? $gettext('routes type to not mapmatch (ex subway are not on roads)'): ''"
        label="route_type exclusion"
        variant="underlined"
        multiple
      >
        <template v-slot:selection="{ item, index }">
          <v-chip v-if="index < 2">
            <span>{{ item.title }}</span>
          </v-chip>
          <span
            v-if="index === 2"
            class="text-grey text-caption align-self-center"
          >
            (+{{ runMapMatching.exclusions.length - 2 }} others)
          </span>
        </template>
      </v-select>
      <!--
      <div
        v-for="(item, key) in parameters"
        :key="key"
      >
        <v-text-field
          v-model="item.value"
          :disabled="useZone && item.name === 'num_zones'"
          :type="item.type"
          :label="$gettext(item.text)"
          :suffix="item.units"
          :hint="showHint? $gettext(item.hint): ''"
          :persistent-hint="showHint"
          required
          @wheel="()=>{}"
        />
      </div>
      -->
      <v-card-actions>
        <v-btn
          variant="outlined"
          color="success"
          :loading="running"
          :disabled="running || (rlinksIsEmpty || linksIsEmpty)"
          @click="start"
        >
          {{ $gettext("Process") }}
        </v-btn>
        <v-btn
          v-show="running && status === 'RUNNING'"
          color="grey"
          variant="text"
          @click="stopRun()"
        >
          {{ $gettext("Abort") }}
        </v-btn>
        <v-card-text v-show="running">
          ~ {{ timer>0? Math.ceil(timer/60): $gettext('less than 1') }}{{ $gettext(' minutes remaining') }}
        </v-card-text>
        <v-spacer />
        <v-btn
          size="small"
          @click="showHint = !showHint"
        >
          <v-icon>far fa-question-circle small</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-dialog
      v-model="showOverwriteDialog"
      persistent
      max-width="500"
      @keydown.enter="applyOverwriteDialog"
      @keydown.esc="showOverwriteDialog=false"
    >
      <v-card>
        <v-card-title class="text-h5">
          {{ $gettext("Overwrite current road network ?") }}
        </v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="regular"
            @click="showOverwriteDialog = !showOverwriteDialog"
          >
            {{ $gettext("No") }}
          </v-btn>

          <v-btn
            color="primary"
            @click="applyOverwriteDialog"
          >
            {{ $gettext("Yes") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>
<style lang="scss" scoped>

.card {
  background-color: rgb(var(--v-theme-lightergrey));
  margin:1rem;
  height: 100%;
  overflow-y: auto;
  padding: 2.5rem;
}
.map {
  max-width: 100rem;
  width:50rem;
  height: 35rem;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
