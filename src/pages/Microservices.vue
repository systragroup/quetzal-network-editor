<script>
import MatrixRoadCaster from '@comp/microservices/MatrixRoadCaster.vue'
import OSMImporter from '@comp/microservices/OSMImporter.vue'

export default {
  name: 'Microservices',
  components: {
    MatrixRoadCaster,
    OSMImporter,
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
    }
  },
  computed: {
    rlinksIsEmpty () { return this.$store.getters.rlinksIsEmpty },
  },
  watch: {
    tab (val) { },
  },
  methods: {

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
      <v-tab>Matrix Road Caster</v-tab>
    </v-tabs>
    <div class="layout">
      <div class="layout-overlay" />
      <OSMImporter v-if="tab===0 " />

      <MatrixRoadCaster v-else-if="tab===1" />
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
</style>
