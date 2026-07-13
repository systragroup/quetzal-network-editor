<script setup lang="ts">
import { useIndexStore } from '@src/store/index'
import { useWildTurkeyStore } from '@src/store/WildTurkey'
import { useLinksStore } from '@src/store/links'
import { userLinksStore } from '@src/store/rlinks.ts'
import { useUserStore } from '@src/store/user'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import s3 from '@src/AWSClient'
import { RunInputs } from '@src/types/api'
import Warning from '../utils/Warning.vue'
import Markdown from '../utils/Markdown.vue'
import { useGettext } from 'vue3-gettext'
import { FormData } from '@src/types/components'
import SimpleForm from '../common/SimpleForm.vue'

const { $gettext } = useGettext()
const wtStore = useWildTurkeyStore()
const rlinksStore = userLinksStore()
const linksStore = useLinksStore()

const rlinksIsEmpty = computed(() => rlinksStore.rlinksIsEmpty)
const linksIsEmpty = computed(() => linksStore.linksIsEmpty)

const running = computed(() => wtStore.running)
const status = computed(() => wtStore.status)
const error = computed(() => wtStore.error)
const errorMessage = computed(() => wtStore.errorMessage)
const callID = computed(() => wtStore.callID)
const bucket = computed(() => wtStore.bucket)
const storeParameters = computed(() => wtStore.parameters)

const parameters = ref<FormData[]>([
  {
    label: 'depot longitude',
    key: 'depot_lon',
    value: null,
    advanced: false,
    type: 'number',
    units: 'deg',
    rules: ['required'],
    hint: 'depot position',
  },
  {
    label: 'depot latitude',
    key: 'depot_lat',
    value: null,
    advanced: false,
    type: 'number',
    units: 'deg',
    rules: ['required'],
    hint: 'depot position',
  },
  {
    key: 'consumption',
    label: 'consumption',
    value: null,
    advanced: true,
    type: 'number',
    units: 'kwh',
    rules: ['required'],
    hint: 'vehicle consumption in kwh',
  },
  {
    label: 'Battery Capacity',
    key: 'max_energy',
    value: null,
    advanced: true,
    type: 'number',
    units: 'kWh',
    rules: ['required'],
    hint: 'bus battery capacity for electric scheduling',
  },
  {
    label: 'interlining',
    key: 'interlining',
    value: null,
    advanced: true,
    type: 'boolean',
    rules: ['required'],
    hint: 'if a bus can perform many different routes (route_id)',
  },

])

onMounted(() => {
  parameters.value.forEach(param => param.value = storeParameters.value[param.key])
  console.log(parameters.value)
})

onBeforeUnmount(() => {
  wtStore.saveParams(parameters.value)
})

const formRef = ref()

async function start () {
  const resp = await formRef.value.validate()
  if (!resp) { return }
  const userStore = useUserStore()
  wtStore.saveParams(parameters.value)
  wtStore.running = true
  wtStore.setCallID()
  await exportFiles()
  const params = wtStore.parameters
  const inputs: RunInputs = {
    scenario_path_S3: callID.value,
    launcher_arg: {
      training_folder: '/tmp',
      params: params,
    },
    metadata: {
      user_email: userStore.cognitoInfo?.email,
    },
  }
  wtStore.start(inputs)
}

async function exportFiles() {
  const promises = []
  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/inputs/road/road_links.geojson'),
    JSON.stringify(rlinksStore.rlinks)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/inputs/road/road_nodes.geojson'),
    JSON.stringify(rlinksStore.rnodes)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/inputs/pt/links.geojson'),
    JSON.stringify(linksStore.links)))

  promises.push(s3.putObject(
    bucket.value,
    callID.value.concat('/inputs/pt/nodes.geojson'),
    JSON.stringify(linksStore.nodes)))

  try {
    await Promise.all(promises)
  } catch (err: unknown) {
    console.log('err')
    const store = useIndexStore()
    store.changeAlert(err)
  }
}

function stopRun () { wtStore.stopExecution() }
const mdString = `
# Scheduling
Return number of vehicles (blocks) and kpis for transit lines.\n
Deadheads are computed from routing on the road network.
`

const showWarning = computed(() => rlinksIsEmpty.value || linksIsEmpty.value)

</script>
<template>
  <section class="background">
    <v-card
      class="card"
    >
      <Markdown :source="mdString" />
      <Warning
        :show="showWarning"
        :title="$gettext('need a road and a PT network')"
        type="warning"
      />
      <Warning
        :show="error"
        :messages="errorMessage"
      />
      <v-divider />

      <SimpleForm
        ref="formRef"
        v-model="parameters"
      >
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
        </v-card-actions>
      </SimpleForm>
    </v-card>
  </section>
</template>
<style lang="scss" scoped>

.card {
  background-color: rgb(var(--v-theme-lightergrey));
  margin:1rem;
  max-height: 85vh;
  width: 50rem;
  overflow-y: auto;
  padding: 2rem;
}
.freeform-button {
  position: absolute;
  top: 5px;
  right: 5px;
}
.items {
  margin-bottom:0.3rem;
}
.alert{
  max-height: 10rem;
  overflow-y: auto;
}

</style>
