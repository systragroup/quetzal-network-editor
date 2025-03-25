<script setup>

import { ref, computed, defineAsyncComponent } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import OSMImporter from '@comp/microservices/OSMImporter.vue'

const MatrixRoadCaster = defineAsyncComponent(() => import('@comp/microservices/MatrixRoadCaster.vue'))
const GTFSWebImporter = defineAsyncComponent(() => import('@comp/microservices/GTFSWebImporter.vue'))
const GTFSZipImporter = defineAsyncComponent(() => import('@comp/microservices/GTFSZipImporter.vue'))
const MapMatching = defineAsyncComponent(() => import('@comp/microservices/MapMatching.vue'))
const runGTFS = useGTFSStore()
const GTFSrunning = computed(() => { return runGTFS.running })

const tab = ref('OSM importer')
const subtab = ref('Zip importer')

</script>
<template>
  <section>
    <v-tabs
      v-model="tab"
      color="primary"
      bg-color="lightergrey"
      align-tabs="center"
    >
      <v-tab value="OSM importer">
        <v-icon
          icon="fas fa-car"
          class="mr-1"
        />
        OSM importer
      </v-tab>
      <v-tab value="GTFS importer">
        <v-icon
          icon="fas fa-train-subway"
          class="mr-1"
        />
        GTFS importer
      </v-tab>
      <v-tab value="Matrix Road Caster">
        <v-icon
          icon="fas fa-road"
          class="mr-1"
        />
        Matrix Road Caster
      </v-tab>
      <v-tab value="MapMatching">
        <v-icon
          icon="fas fa-route"
          class="mr-1"
        />
        MapMatching
      </v-tab>
    </v-tabs>
    <v-tabs
      v-if="tab==='GTFS importer'"
      v-model="subtab"
      class="subtabs"
      color="primary"
      bg-color="lightergrey"
      align-tabs="center"
    >
      <v-tab
        :disabled="GTFSrunning"
        value="Zip importer"
      >
        <v-icon
          icon="fas fa-file-archive"
          class="mr-1"
        />
        Zip importer
      </v-tab>
      <v-tab
        :disabled="GTFSrunning"
        value="Web importer"
      >
        <v-icon
          icon="fas fa-cloud"
          class="mr-1"
        />
        Web importer
      </v-tab>
    </v-tabs>
    <v-window class="layout">
      <OSMImporter v-if="tab==='OSM importer' " />
      <GTFSZipImporter v-else-if="tab==='GTFS importer' && subtab==='Zip importer'" />
      <GTFSWebImporter v-else-if="tab==='GTFS importer' && subtab==='Web importer'" />
      <MatrixRoadCaster v-else-if="tab==='Matrix Road Caster'" />
      <MapMatching v-else-if="tab==='MapMatching'" />
    </v-window>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width:100%;
  height: 95%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(var(--v-theme-background));
}
.layout-overlay {
  height: 100%;
  width: 100%;
  background-color: rgb(var(--v-theme-background));
  position: absolute;
}
.tabs{
  background-color: rgb(var(--v-theme-background));
}
.subtabs{
  border-top: 1px solid  rgb(var(--v-theme-background));
}
</style>
