<script>

import { ref, computed, watch } from 'vue'
import { useGTFSStore } from '@src/store/GTFSImporter'
import OSMImporter from '@comp/microservices/OSMImporter.vue'
// const GTFSWebImporter = () => import('@comp/microservices/GTFSWebImporter.vue')
// const GTFSZipImporter = () => import('@comp/microservices/GTFSZipImporter.vue')
// const MatrixRoadCaster = () => import('@comp/microservices/MatrixRoadCaster.vue')

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Microservices',
  components: {
    OSMImporter,
    // MatrixRoadCaster,
    // GTFSWebImporter,
    // GTFSZipImporter,
  },
  setup () {
    const runGTFS = useGTFSStore()
    const tab = ref('OSM importer')
    const subtab = ref('Zip importer')
    const GTFSrunning = computed(() => { return runGTFS.running })
    watch(tab, (val) => console.log(val))
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
      <!--
         <v-tab value="GTFS importer">
        GTFS importer
      </v-tab>
      <v-tab value="Matrix Road Caster">
        Matrix Road Caster
      </v-tab>
      -->
    </v-tabs>
    <v-tabs
      v-if="tab==='GTFS importer'"
      v-model="subtab"
      class="subtabs"
      color="primary"
      bg-color="lightergrey"
      align-tabs="center"
    >
      <v-tab :disabled="GTFSrunning">
        Zip importer
      </v-tab>
      <v-tab :disabled="GTFSrunning">
        Web importer
      </v-tab>
    </v-tabs>
    <div class="layout">
      <div class="layout-overlay" />
      <OSMImporter v-if="tab==='OSM importer' " />
      <!--
      <GTFSZipImporter v-else-if="tab==='GTFS importer' && subtab==='Zip importer'" />

      <GTFSWebImporter v-else-if="tab==='GTFS importer' && subtab==='Web importer'" />

      <MatrixRoadCaster v-else-if="tab===2" />

      -->
    </div>
  </section>
</template>
<style lang="scss" scoped>
.layout {
  position: absolute;
  width:100vw;
  height: 100vh;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
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
