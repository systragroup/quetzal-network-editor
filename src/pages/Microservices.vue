<script>

import { ref, computed, defineAsyncComponent } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import OSMImporter from '@comp/microservices/OSMImporter.vue'

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Microservices',
  components: {
    OSMImporter,
    MatrixRoadCaster: defineAsyncComponent(() => import('@comp/microservices/MatrixRoadCaster.vue')),
    GTFSWebImporter: defineAsyncComponent(() => import('@comp/microservices/GTFSWebImporter.vue')),
    GTFSZipImporter: defineAsyncComponent(() => import('@comp/microservices/GTFSZipImporter.vue')),
    MapMatching: defineAsyncComponent(() => import('@comp/microservices/MapMatching.vue')),
  },
  setup () {
    const runGTFS = useGTFSStore()
    const tab = ref('OSM importer')
    const subtab = ref('Zip importer')
    const GTFSrunning = computed(() => { return runGTFS.running })

    return { tab, subtab, GTFSrunning }
  },
}

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
        OSM importer
      </v-tab>
      <v-tab value="GTFS importer">
        GTFS importer
      </v-tab>
      <v-tab value="Matrix Road Caster">
        Matrix Road Caster
      </v-tab>
      <v-tab value="MapMatching">
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
        Zip importer
      </v-tab>
      <v-tab
        :disabled="GTFSrunning"
        value="Web importer"
      >
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
  height: 100%;
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
