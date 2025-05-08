<script setup>

import { computed, ref, toRefs } from 'vue'
import { useRunStore } from '@src/store/run'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})
const { disabled } = toRefs(props)
const runStore = useRunStore()

const showLogsDialog = ref(false)
const hasLogs = computed(() => runStore.hasLogs)
const logs = ref([])

async function showLogs() {
  await runStore.getLogs()
  logs.value = runStore.logs
  logs.value.sort((a, b) => {
    return String(a.time).localeCompare(String(b.time),
      undefined, { sensitivity: 'base' })
  })

  showLogsDialog.value = true
}

async function downloadLogs() {
  await runStore.downloadLogs()
}

</script>
<template>
  <v-menu
    close-delay="100"
    transition="slide-y-transition"
  >
    <template v-slot:activator="{ props }">
      <v-btn
        v-show="hasLogs"
        :disabled="disabled"
        class="log-button"
        variant="outlined"
        prepend-icon="fas fa-file-lines"
        append-icon="fas fa-caret-down"
        v-bind="props"
      >
        logs
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        @click="showLogs"
      >
        {{ $gettext('show') }}
        <template v-slot:prepend>
          <v-icon icon="fas fa-eye" />
        </template>
      </v-list-item>
      <v-list-item
        @click="downloadLogs"
      >
        {{ $gettext('download') }}
        <template v-slot:prepend>
          <v-icon icon="fas fa-download" />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
  <v-dialog
    v-model="showLogsDialog"
    width="90%"
  >
    <v-card style="overflow-y: auto">
      <div
        v-for="(log,key) in logs"
        :key="key"
        class="log-container"
      >
        <h1>{{ log.name }}</h1>
        <h3><b>{{ log.time }}</b></h3>
        <span style="white-space: pre-line">{{ log.text }}</span>
      </div>
    </v-card>
  </v-dialog>
</template>
<style lang="scss" scoped>

.log-button{
  margin-left:auto;
}
.log-container{
  background-color:rgb(var(--v-theme-mediumgrey)) !important;
  border-radius: 10px;
  max-height:20rem;
  overflow-y: auto;
  margin: 1rem 2rem;
  border:1px solid black;
  padding: 1rem;
}

</style>
