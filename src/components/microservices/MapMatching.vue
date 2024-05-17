<script setup>
import { useMapMatchingStore } from '@src/store/MapMatching'
import { userLinksStore } from '@src/store/rlinks'
import { useLinksStore } from '@src/store/links'
import { useIndexStore } from '@src/store/index'
import { ref, computed, watch } from 'vue'
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
const error = computed(() => { return runMapMatching.error })
const errorMessage = computed(() => { return runMapMatching.errorMessage })
const callID = computed(() => { return runMapMatching.callID })
const status = computed(() => { return runMapMatching.status })

watch(status, (val) => {
  if (val === 'SUCCEEDED') {
    ApplyResults()
  }
})

const bucket = ref('quetzal-api-bucket')

async function start () {
  runMapMatching.running = true
  runMapMatching.setCallID()
  await exportFiles()
  runMapMatching.startExecution({ callID: callID.value, exclusions: [] })
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

async function ApplyResults () {
  runMapMatching.running = true
  linksStore.unloadFiles()
  const links = await s3.readJson(bucket.value, callID.value.concat('/links_final.geojson'))
  linksStore.loadLinks(links)
  const nodes = await s3.readJson(bucket.value, callID.value.concat('/nodes_final.geojson'))
  linksStore.loadNodes(nodes)
  store.changeNotification(
    { text: $gettext('Road links applied!'), autoClose: true, color: 'success' })
  runMapMatching.running = false
}

const routeTypeList = computed(() => new Set(linksStore.links.features.map(link => link.properties.route_type)))

// function stopRun () { runMapMatching.stopExecution() }

</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <v-card-title>
        {{ $gettext("Mapmatch") }}
      </v-card-title>
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

      <v-card-actions>
        <v-spacer />
        <v-select
          v-model="runMapMatching.exclusions"
          class="select"
          :items="routeTypeList"
          label="exclusion"
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

        <v-spacer />
        <v-btn
          variant="outlined"
          color="success"
          :loading="running"
          :disabled="running || (rlinksIsEmpty || linksIsEmpty)"
          @click="start"
        >
          {{ $gettext("Download") }}
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

.select{
  width:20rem;
}
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
