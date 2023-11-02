<script>
import OSMImporter from '@comp/microservices/OSMImporter.vue'
const GTFSWebImporter = () => import('@comp/microservices/GTFSWebImporter.vue')
const GTFSZipImporter = () => import('@comp/microservices/GTFSZipImporter.vue')
const MatrixRoadCaster = () => import('@comp/microservices/MatrixRoadCaster.vue')

export default {
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Microservices',
  components: {
    MatrixRoadCaster,
    OSMImporter,
    GTFSWebImporter,
    GTFSZipImporter,
  },
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  data () {
    return {
      tab: 0,
      subtab: 0,
    }
  },
  computed: {
    GTFSrunning () { return this.$store.getters['runGTFS/running'] },

  },
}
</script>
<template>
  <section>
    <v-tabs
      v-model="tab"
      centered
    >
      <v-tab>OSM importer</v-tab>
      <v-tab>GTFS importer</v-tab>
      <v-tab>Matrix Road Caster</v-tab>
    </v-tabs>
    <v-tabs
      v-if="tab===1"
      v-model="subtab"
      class="subtabs"
      centered
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
      <OSMImporter v-if="tab===0 " />

      <GTFSZipImporter v-else-if="tab===1 && subtab===0" />

      <GTFSWebImporter v-else-if="tab===1 && subtab===1" />

      <MatrixRoadCaster v-else-if="tab===2" />
    </div>
  </section>
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
  background-color:var(--v-background-base);

  position: absolute;
}
.subtabs{
  border-top: 1px solid var(--v-background-lighten3)

}
</style>
