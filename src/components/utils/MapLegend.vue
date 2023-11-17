<script>

export default {
  name: 'MapLegend',
  components: {
  },
  props: {
    colorScale: {
      type: Array,
      default: () => [],
    },
    displaySettings: {
      type: Object,
      default: () => {},
    },
    baseOffset: {
      type: Number,
      default: () => 300,
    },
    order: {
      type: Number,
      default: () => 0,
    },
  },
  data () {
    return {

    }
  },

  computed: {
    windowHeight () { return this.$store.getters.windowHeight - 70 },
    leftOffset () {
      return this.$store.getters.showLeftPanel ? 50 + (180 * this.order) + this.baseOffset : 50 + (180 * this.order)
    },
  },

}
</script>
<template>
  <div
    v-show="!isNaN(displaySettings.minVal) && !isNaN(displaySettings.minVal)"
    class="legend elevation-4"
    :style="{'top':`${windowHeight}px`,'left':`${leftOffset}px !important`}"
  >
    <div class="gradient">
      <span
        v-for="(color,key) in colorScale"
        :key="key"
        class="grad-step"
        :style="{'backgroundColor':color}"
      />
      <span class="domain-title">{{ displaySettings.selectedFeature }}</span>
      <span class="domain-min">{{ Math.round(displaySettings.minVal) }}</span>
      <span class="domain-med">{{ Math.round((displaySettings.maxVal+displaySettings.minVal)/2) }}</span>
      <span class="domain-max">{{ Math.round(displaySettings.maxVal) }}</span>
    </div>
  </div>
</template>
<style lang="scss" scoped>

.gradient {
    width: 85%;
    white-space: nowrap;
    position: relative;
    display: inline-block;
    padding-top: 20px;
    padding-bottom: 15px;

}

.gradient .domain-title {
    position: absolute;
    right: 25%;
    left: 25%;
    text-align: center;
    font-size: 11px;
    top: 6px;

}

.gradient .domain-min {
    position: absolute;
    left: 0;
    font-size: 11px;
    bottom: 5px;
}
.gradient .domain-med {
    position: absolute;
    right: 25%;
    left: 25%;
    text-align: center;
    font-size: 11px;
    bottom: 5px;
}
.gradient .domain-max {
    position: absolute;
    right: 0;
    font-size: 11px;
    bottom: 5px;
}

.grad-step {
    display: inline-block;
    height: 20px;
    width: 1%;
}

.legend {
  width: 160px;
  z-index: 3;
  display: flex;
  position: relative;
  align-items: center;
  justify-content: center;
  transition: 0.3s;
  height: 50px;
  background-color: var(--v-white-base);
  border: thin solid var(--v-mediumgrey-base);
}

</style>
