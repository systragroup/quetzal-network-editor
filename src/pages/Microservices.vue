<script>
import MatrixRoadCaster from '../components/utils/MatrixRoadCaster.vue'

export default {
  name: 'Microservices',
  components: {
    MatrixRoadCaster,
  },
  props: {
    value: {
      type: Array,
      default: () => [],
    },
  },
  data () {
    return {

    }
  },
  watch: {

  },

  methods: {

  },
}
</script>
<template>
  <section>
    <div class="layout">
      <div
        class="layout-overlay"
      />
      <MatrixRoadCaster />
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
